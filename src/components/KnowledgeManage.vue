<template>
  <div class="km-page">
    <!-- 搜索栏 -->
    <div class="km-toolbar">
      <div class="km-search-bar">
        <van-icon name="search" size="16" color="#9a9aae" />
        <input v-model="searchTitle" class="km-search-input" placeholder="搜索标题..." @keyup.enter="handleSearch" />
        <van-icon v-if="searchTitle" name="close" size="14" color="#c8c4c0" class="km-search-clear" @click="clearSearch" />
      </div>
      <select v-model="searchCategory" class="km-cat-select" @change="handleSearch">
        <option value="">全部分类</option>
        <option value="faq">常见问题</option>
        <option value="product">商品相关</option>
        <option value="policy">平台政策</option>
      </select>
      <van-button round size="small" class="km-add-btn" @click="openAdd"><van-icon name="plus" />新增文档</van-button>
      <van-button round size="small" class="km-upload-btn" :loading="uploading" @click="triggerUpload">
        <van-icon name="upload" />上传md
      </van-button>
      <input ref="uploadInputRef" type="file" accept=".md" class="file-input-hidden" @change="onUploadFile" />
    </div>

    <!-- 文档列表 -->
    <div class="km-list-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <div v-else-if="list.length === 0" class="empty-state">暂无知识文档</div>
      <template v-else>
        <div v-for="item in list" :key="item.id" class="km-row" :class="{ 'row-disabled': item.enabled === 0 }">
          <div class="km-row-main">
            <div class="km-row-title">
              {{ item.title }}
              <span class="km-cat-tag">{{ categoryText(item.category) }}</span>
              <span :class="item.enabled === 1 ? 'tag-green' : 'tag-gray'">{{ item.enabled === 1 ? '启用' : '禁用' }}</span>
            </div>
            <div class="km-row-content">{{ item.content }}</div>
            <div v-if="item.keywords" class="km-row-keywords">关键词：{{ item.keywords }}</div>
            <div class="km-row-meta">
              <span v-if="adminMode && item.merchantId">商家ID：{{ item.merchantId }}</span>
              <span>{{ item.createTime }}</span>
            </div>
          </div>
          <div class="km-row-actions">
            <van-switch :model-value="item.enabled === 1" size="20" @change="(val) => handleToggle(item, val)" />
            <van-button size="mini" round plain class="btn-act" @click="openEdit(item)">编辑</van-button>
            <van-button size="mini" round plain class="btn-ban" @click="handleDelete(item)">删除</van-button>
          </div>
        </div>
      </template>
    </div>

    <!-- 分页 -->
    <van-pagination
      v-if="total > 0"
      v-model="page"
      :total-items="total"
      :items-per-page="pageSize"
      @change="loadData"
      mode="simple"
      class="km-pagination"
    />

    <!-- 新增/编辑弹窗 -->
    <van-dialog v-model:show="showForm" :title="isEdit ? '编辑文档' : '新增文档'" :show-confirm-button="false" closeable close-icon-position="top-left">
      <div class="dialog-body">
        <div class="field-row">
          <span class="field-label">标题 <span class="required">*</span></span>
          <van-field v-model="form.title" placeholder="请输入文档标题" input-align="right" />
        </div>
        <div class="field-row field-row-top">
          <span class="field-label">内容 <span class="required">*</span></span>
          <van-field v-model="form.content" type="textarea" :rows="4" :autosize="{ minHeight: 96, maxHeight: 220 }" placeholder="请输入知识内容" input-align="left" class="km-textarea" />
        </div>
        <div class="field-row">
          <span class="field-label">关键词</span>
          <van-field v-model="form.keywords" placeholder="多个关键词用逗号分隔" input-align="right" />
        </div>
        <div class="field-row">
          <span class="field-label">分类</span>
          <select v-model="form.category" class="form-select">
            <option value="faq">常见问题</option>
            <option value="product">商品相关</option>
            <option value="policy">平台政策</option>
          </select>
        </div>
        <div v-if="adminMode" class="field-row">
          <span class="field-label">归属商家</span>
          <van-field v-model="form.merchantId" type="digit" placeholder="留空为平台公共文档" input-align="right" />
        </div>
        <div v-if="formErr" class="err-msg">{{ formErr }}</div>
        <div class="dialog-actions">
          <van-button round class="dialog-btn-cancel" @click="showForm = false">取消</van-button>
          <van-button round class="dialog-btn-primary" @click="handleSubmit" :loading="saving">确定</van-button>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { getKnowledgePage, createKnowledge, updateKnowledge, toggleKnowledge, deleteKnowledge, uploadKnowledge } from '../api/knowledge.js'

const props = defineProps({
  /** true=管理员模式（显示归属商家列，可指定 merchantId）；false=商家模式（仅管理本店文档） */
  adminMode: { type: Boolean, default: false },
})

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)

const searchTitle = ref('')
const searchCategory = ref('')

const showForm = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const formErr = ref('')
const editingId = ref(null)
const form = ref({ title: '', content: '', keywords: '', category: 'faq', merchantId: '' })

// ── md 文件上传（设计 D6） ──
const uploading = ref(false)
const uploadInputRef = ref(null)

function triggerUpload() {
  uploadInputRef.value?.click()
}

async function onUploadFile(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // 允许重复选择同一文件
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.md')) {
    showToast('仅支持 .md 格式的 Markdown 文件')
    return
  }
  uploading.value = true
  try {
    const saved = await uploadKnowledge(file)
    if (saved?.embedStatus) {
      showToast(`文档已保存，但${saved.embedStatus}`)
    } else {
      showToast('上传成功，已向量化入库')
    }
    page.value = 1
    await loadData()
  } catch { /* 错误由拦截器 toast（如非 md、越权、文件为空） */ }
  finally { uploading.value = false }
}

function categoryText(cat) {
  const map = { faq: '常见问题', product: '商品相关', policy: '平台政策' }
  return map[cat] || cat || '未分类'
}

async function loadData() {
  loading.value = true
  try {
    const params = { pageNum: page.value, pageSize }
    if (searchTitle.value) params.title = searchTitle.value
    if (searchCategory.value) params.category = searchCategory.value
    const res = await getKnowledgePage(params)
    list.value = res?.records || []
    total.value = res?.total || 0
  } catch { list.value = []; total.value = 0 }
  finally { loading.value = false }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function clearSearch() {
  searchTitle.value = ''
  page.value = 1
  loadData()
}

function openAdd() {
  isEdit.value = false
  editingId.value = null
  formErr.value = ''
  form.value = { title: '', content: '', keywords: '', category: 'faq', merchantId: '' }
  showForm.value = true
}

function openEdit(item) {
  isEdit.value = true
  editingId.value = item.id
  formErr.value = ''
  form.value = {
    title: item.title || '',
    content: item.content || '',
    keywords: item.keywords || '',
    category: item.category || 'faq',
    merchantId: item.merchantId ? String(item.merchantId) : '',
  }
  showForm.value = true
}

async function handleSubmit() {
  if (!form.value.title.trim()) return showToast('请输入文档标题')
  if (!form.value.content.trim()) return showToast('请输入知识内容')
  const payload = {
    title: form.value.title.trim(),
    content: form.value.content.trim(),
    keywords: form.value.keywords.trim() || undefined,
    category: form.value.category,
  }
  // 仅管理员可指定归属商家
  if (props.adminMode && form.value.merchantId) payload.merchantId = form.value.merchantId
  saving.value = true
  formErr.value = ''
  try {
    const saved = isEdit.value ? await updateKnowledge(editingId.value, payload) : await createKnowledge(payload)
    if (saved?.embedStatus) {
      showToast(`文档已保存，但${saved.embedStatus}`)
    } else {
      showToast(isEdit.value ? '修改成功，已向量化入库' : '新增成功，已向量化入库')
    }
    showForm.value = false
    await loadData()
  } catch (e) { formErr.value = e?.response?.data?.msg || e?.message || '操作失败' }
  finally { saving.value = false }
}

async function handleToggle(item, val) {
  const enabled = val ? 1 : 0
  try {
    const embedStatus = await toggleKnowledge(item.id, enabled)
    item.enabled = enabled
    if (embedStatus) showToast(`已${enabled === 1 ? '启用' : '禁用'}，但${embedStatus}`)
    else showToast(enabled === 1 ? '已启用，已向量化入库' : '已禁用')
  } catch { /* toast by interceptor */ }
}

async function handleDelete(item) {
  try {
    await showConfirmDialog({ title: '确认删除', message: `确定删除文档「${item.title}」？删除后不可恢复。`, confirmButtonColor: '#e8573a', confirmButtonText: '删除' })
    await deleteKnowledge(item.id)
    showToast('删除成功')
    // 删除当前页最后一条时回退一页
    if (list.value.length === 1 && page.value > 1) page.value--
    await loadData()
  } catch { /* cancelled */ }
}

onMounted(loadData)
</script>

<style scoped>
.km-page { font-size: 13px; }
.km-toolbar { display: flex; gap: 10px; margin-bottom: 14px; align-items: center; flex-wrap: wrap; }
.km-search-bar {
  flex: 1;
  min-width: 160px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border-radius: 18px;
  padding: 7px 12px;
  border: 1px solid #f0ece8;
}
.km-search-input { flex: 1; border: none; outline: none; font-size: 13px; color: #1a1a2e; background: transparent; }
.km-search-input::placeholder { color: #c8c4c0; }
.km-search-clear { cursor: pointer; flex-shrink: 0; }
.km-cat-select {
  border: 1px solid #f0ece8;
  border-radius: 18px;
  background: #fff;
  font-size: 13px;
  color: #5a5a6e;
  padding: 7px 10px;
  outline: none;
}
.km-add-btn { height: 34px; font-size: 13px; font-weight: 500; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 16px; }
.km-upload-btn { height: 34px; font-size: 13px; border-color: #e8573a !important; color: #e8573a !important; padding: 0 12px; }
.file-input-hidden { display: none; }

.km-list-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); overflow: hidden; }
.km-row { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5f3f0; transition: background 0.15s; }
.km-row:last-child { border-bottom: none; }
.km-row:hover { background: #faf8f6; }
.km-row.row-disabled { opacity: 0.55; }
.km-row-main { flex: 1; min-width: 0; }
.km-row-title { font-size: 14px; font-weight: 600; color: #1a1a2e; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.km-cat-tag { font-size: 10px; padding: 1px 7px; border-radius: 8px; background: #fef0e8; color: #e8573a; font-weight: 500; }
.km-row-content { font-size: 12px; color: #9a9aae; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.km-row-keywords { font-size: 11px; color: #c8c4c0; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.km-row-meta { font-size: 11px; color: #c8c4c0; margin-top: 4px; display: flex; gap: 12px; flex-wrap: wrap; }
.km-row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.tag-green { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #e8f8ee; color: #07c160; font-weight: 500; }
.tag-gray { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #f0ece8; color: #9a9aae; font-weight: 500; }
.btn-act { border-color: #e8573a !important; color: #e8573a !important; font-size: 11px; padding: 0 8px; height: 24px; }
.btn-ban { border-color: #c62828 !important; color: #c62828 !important; font-size: 11px; padding: 0 8px; height: 24px; }

.loading-center { padding: 60px 0; }
.empty-state { text-align: center; color: #9a9aae; padding: 60px 0; }
.km-pagination { padding: 16px 0; background: transparent; }
.km-pagination :deep(.van-pagination__item) { border: none; background: transparent; color: #5a5a6e; }
.km-pagination :deep(.van-pagination__item--active) { color: #e8573a; font-weight: 600; }

.dialog-body { padding: 12px 20px 20px; }

/* 弹窗内容超长时整体可滚动（md 长文档编辑场景），避免超出屏幕无法操作 */
:deep(.van-dialog__content) {
  max-height: 70vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
/* 弹窗整体不超出视口（vant 默认无此约束，内容超高时标题/关闭键会被顶出） */
:deep(.van-dialog) {
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
:deep(.van-dialog__content) { flex-shrink: 1; min-height: 0; }
.field-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f3f0; }
.field-row-top { align-items: flex-start; }
.field-label { width: 80px; flex-shrink: 0; font-size: 13px; color: #5a5a6e; padding-top: 8px; }
.field-row .van-field { flex: 1; padding: 0; }
.km-textarea { background: #faf8f6; border-radius: 8px; padding: 8px 10px !important; }
.required { color: #e8573a; }
.form-select { flex: 1; border: none; outline: none; font-size: 13px; color: #1a1a2e; background: transparent; text-align: right; padding: 8px 0; }
.err-msg { color: #e8573a; font-size: 12px; margin-top: 8px; text-align: center; }
.dialog-actions { display: flex; gap: 12px; margin-top: 20px; }
.dialog-actions .van-button { flex: 1; height: 40px; font-size: 14px; }
.dialog-btn-primary { background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; }
.dialog-btn-cancel { border-color: #d0ccc8 !important; color: #5a5a6e !important; }
</style>
