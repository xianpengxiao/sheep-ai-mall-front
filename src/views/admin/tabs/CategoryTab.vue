<template>
  <div class="sub-page">
    <!-- 操作栏 -->
    <div class="sub-toolbar">
      <van-button v-if="hasPerm('category:create')" round size="small" class="sub-add-btn" @click="openAdd(null)"><van-icon name="plus" />新增顶级分类</van-button>
      <span class="sub-tool-link" @click="expandAll"><van-icon name="down" size="12" /> 展开全部</span>
      <span class="sub-tool-link" @click="collapseAll"><van-icon name="right" size="12" /> 收起全部</span>
    </div>

    <!-- 分类树 -->
    <div class="tree-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <div v-else-if="flatList.length === 0" class="empty-state">暂无分类</div>
      <template v-else>
        <div v-for="item in flatList" :key="item.id" class="tree-row" :style="{ paddingLeft: 20 + item.__depth * 24 + 'px' }" :class="{ 'row-disabled': item.status === 0 }">
          <!-- 展开/收起图标 -->
          <span class="tree-toggle" :class="{ leaf: !item.__hasChildren }" @click="toggleExpand(item)">
            <van-icon v-if="item.__hasChildren" :name="item.__expanded ? 'down' : 'right'" size="12" color="#9a9aae" />
            <van-icon v-else name="dot" size="10" color="#d0ccc8" />
          </span>
          <!-- 图标/名称 -->
          <span class="tree-name">{{ item.icon ? '[' + item.icon + '] ' : '' }}{{ item.name }}</span>
          <!-- 状态标签 -->
          <span :class="item.status === 1 ? 'tag-green' : 'tag-gray'">{{ item.status === 1 ? '启用' : '禁用' }}</span>
          <!-- 操作 -->
          <span class="tree-actions">
            <van-button v-if="hasPerm('category:create')" size="mini" round plain class="btn-unban" @click="openAdd(item)">新增子分类</van-button>
            <van-button v-if="hasPerm('category:update')" size="mini" round plain class="btn-act" @click="openEdit(item)">编辑</van-button>
            <van-button v-if="hasPerm('category:delete')" size="mini" round plain class="btn-ban" @click="handleDelete(item)">删除</van-button>
          </span>
        </div>
      </template>
    </div>

    <!-- 新增/编辑弹窗 -->
    <van-dialog v-model:show="showForm" :title="isEdit ? '编辑分类' : '新增分类'" :show-confirm-button="false" closeable close-icon-position="top-left">
      <div class="dialog-body">
        <!-- 父分类选择 -->
        <div class="field-row" v-if="!isTopLevel">
          <span class="field-label">父分类</span>
          <select v-model="form.parentId" class="form-select">
            <option value="">顶级分类</option>
            <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id" :disabled="opt.id === editingId" v-html="opt.label"></option>
          </select>
        </div>
        <div class="field-row">
          <span class="field-label">分类名称 <span class="required">*</span></span>
          <van-field v-model="form.name" placeholder="请输入分类名称" input-align="right" />
        </div>
        <div class="field-row">
          <span class="field-label">图标标识</span>
          <van-field v-model="form.icon" placeholder="可选，如 electronic" input-align="right" />
        </div>
        <div class="field-row">
          <span class="field-label">排序序号</span>
          <van-field v-model="form.sortOrder" type="digit" placeholder="越小越靠前" input-align="right" />
        </div>
        <div class="field-row">
          <span class="field-label">状态</span>
          <van-radio-group v-model="form.status" direction="horizontal" class="form-radio">
            <van-radio :name="1">启用</van-radio>
            <van-radio :name="0">禁用</van-radio>
          </van-radio-group>
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
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog, showDialog } from 'vant'
import { getTree, createCategory, updateCategory, deleteCategory } from '../../../api/category.js'
import { useUserStore } from '../../../stores/user.js'

const us = useUserStore()
function hasPerm(p) { return Array.isArray(us.permissions) && us.permissions.includes(p) }

const treeData = ref([])
const loading = ref(false)
const expandedIds = ref(new Set())
const showForm = ref(false); const isEdit = ref(false); const saving = ref(false); const formErr = ref('')
const editingId = ref(null)
const isTopLevel = ref(false)

const form = ref({ parentId: '', name: '', icon: '', sortOrder: '', status: 1 })

/** 展平树为列表（仅渲染可见节点） */
const flatList = computed(() => {
  const result = []
  function walk(nodes, depth) {
    for (const n of nodes) {
      const hasC = n.children?.length > 0
      const exp = expandedIds.value.has(n.id)
      result.push({ ...n, __depth: depth, __hasChildren: hasC, __expanded: exp })
      if (hasC && exp) walk(n.children, depth + 1)
    }
  }
  walk(treeData.value, 0)
  return result
})

/** 展平树为父分类选择器选项（全部节点平铺，带缩进） */
const parentOptions = computed(() => {
  const result = []
  function walk(nodes, depth) {
    for (const n of nodes) {
      result.push({ id: n.id, label: '　'.repeat(depth) + '└ ' + n.name })
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(treeData.value, 0)
  return result
})

function toggleExpand(item) {
  const s = new Set(expandedIds.value)
  if (s.has(item.id)) s.delete(item.id)
  else s.add(item.id)
  expandedIds.value = s
}

function expandAll() {
  const s = new Set()
  function walk(nodes) {
    for (const n of nodes) {
      if (n.children?.length) { s.add(n.id); walk(n.children) }
    }
  }
  walk(treeData.value)
  expandedIds.value = s
}

function collapseAll() { expandedIds.value = new Set() }

async function loadData() {
  loading.value = true
  try { treeData.value = await getTree() || [] }
  catch { treeData.value = [] }
  finally { loading.value = false }
}

function openAdd(parent) {
  isEdit.value = false; editingId.value = null; formErr.value = ''
  isTopLevel.value = !parent
  form.value = { parentId: parent ? String(parent.id) : '', name: '', icon: '', sortOrder: '', status: 1 }
  showForm.value = true
}

function openEdit(item) {
  isEdit.value = true; editingId.value = item.id; formErr.value = ''
  isTopLevel.value = item.parentId === 0 || !item.parentId
  form.value = {
    parentId: String(item.parentId || ''),
    name: item.name || '',
    icon: item.icon || '',
    sortOrder: String(item.sortOrder ?? ''),
    status: item.status ?? 1,
  }
  showForm.value = true
}

async function handleSubmit() {
  if (!form.value.name) return showToast('请输入分类名称')
  const payload = { name: form.value.name }
  if (form.value.parentId) payload.parentId = Number(form.value.parentId)
  if (form.value.icon) payload.icon = form.value.icon
  if (form.value.sortOrder !== '') payload.sortOrder = Number(form.value.sortOrder)
  payload.status = form.value.status
  saving.value = true; formErr.value = ''
  try {
    if (isEdit.value) await updateCategory(editingId.value, payload)
    else await createCategory(payload)
    showToast(isEdit.value ? '修改成功' : '新增成功')
    showForm.value = false
    await loadData()
  } catch (e) { formErr.value = e?.response?.data?.msg || e?.message || '操作失败' }
  finally { saving.value = false }
}

async function handleDelete(item) {
  // 检查是否有子分类
  const hasChildren = item.children?.length > 0
  if (hasChildren) {
    return showDialog({ title: '无法删除', message: `该分类下有 ${item.children.length} 个子分类，请先删除或迁移子分类`, confirmButtonColor: '#e8573a' })
  }
  try {
    await showConfirmDialog({ title: '确认删除', message: `确定删除分类「${item.name}」？删除后不可恢复。`, confirmButtonColor: '#e8573a', confirmButtonText: '删除' })
    await deleteCategory(item.id)
    showToast('删除成功')
    await loadData()
  } catch { /* cancelled */ }
}

onMounted(loadData)
</script>
<style scoped>
.sub-page { font-size: 13px; }
.sub-toolbar { display: flex; gap: 10px; margin-bottom: 14px; align-items: center; flex-wrap: wrap; }
.sub-add-btn { height: 34px; font-size: 13px; font-weight: 500; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 16px;  }
.sub-tool-link { font-size: 13px; color: #5a5a6e; cursor: pointer; padding: 6px 0; user-select: none; }
.sub-tool-link:hover { color: #1a1a2e; }
.sub-tool-link .van-icon { vertical-align: -2px; }
.loading-center { padding: 60px 0; }
.empty-state { text-align: center; color: #9a9aae; padding: 60px 0; }
.tree-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); overflow: hidden; }
.tree-row { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-bottom: 1px solid #f5f3f0; transition: background 0.15s; }
.tree-row:hover { background: #faf8f6; }
.tree-row.row-disabled { opacity: 0.5; }
.tree-toggle { flex-shrink: 0; width: 16px; text-align: center; cursor: pointer; user-select: none; }
.tree-toggle.leaf { cursor: default; }
.tree-name { font-size: 14px; font-weight: 500; color: #1a1a2e; flex-shrink: 0; }
.tree-actions { margin-left: auto; display: flex; gap: 4px; flex-shrink: 0; }
.tag-green { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #e8f8ee; color: #07c160; font-weight: 500; flex-shrink: 0; }
.tag-gray { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #f0ece8; color: #9a9aae; font-weight: 500; flex-shrink: 0; }
.btn-unban { border-color: #2e7d32 !important; color: #2e7d32 !important; font-size: 11px; padding: 0 8px; height: 24px; }
.btn-act { border-color: #e8573a !important; color: #e8573a !important; font-size: 11px; padding: 0 8px; height: 24px; }
.btn-ban { border-color: #c62828 !important; color: #c62828 !important; font-size: 11px; padding: 0 8px; height: 24px; }
.dialog-body { padding: 12px 20px 20px; }
.field-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f3f0; }
.field-label { width: 80px; flex-shrink: 0; font-size: 13px; color: #5a5a6e; }
.field-row .van-field { flex: 1; padding: 0; }
.required { color: #e8573a; }
.form-select { flex: 1; border: none; outline: none; font-size: 13px; color: #1a1a2e; background: transparent; text-align: right; padding: 8px 0; }
.form-radio { flex: 1; display: flex; gap: 16px; }
.err-msg { color: #e8573a; font-size: 12px; margin-top: 8px; text-align: center; }
.dialog-actions { display: flex; gap: 12px; margin-top: 20px; }
.dialog-actions .van-button { flex: 1; height: 40px; font-size: 14px; }
.dialog-btn-primary { background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; }
.dialog-btn-cancel { border-color: #d0ccc8 !important; color: #5a5a6e !important; }
</style>
