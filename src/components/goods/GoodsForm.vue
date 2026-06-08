<template>
  <van-form ref="formRef" @submit="handleSubmit" class="goods-form">
    <!-- ═══════ 基本信息 ═══════ -->
    <div class="form-section">
      <div class="section-title">基本信息</div>
      <van-field
        v-model="form.name"
        name="name"
        label="商品名称"
        placeholder="请输入商品名称"
        :rules="[{ required: true, message: '请输入商品名称' }]"
      >
        <template #button>
          <van-button
            size="small"
            round
            plain
            class="ai-btn"
            :loading="aiLoading"
            :disabled="aiLoading"
            @click="handleAiGenerate"
          >AI生成文案</van-button>
        </template>
      </van-field>
      <van-field v-model="form.subTitle" label="副标题（核心卖点）" placeholder="请输入副标题或核心卖点，多个用逗号分隔" />
      <van-field v-model="form.brand" label="品牌" placeholder="请输入品牌" />
      <van-field
        v-model="form.categoryName"
        is-link
        readonly
        label="商品分类"
        placeholder="请选择分类"
        :rules="[{ required: true, message: '请选择分类' }]"
        @click="showCategoryPicker = true"
      />
      <van-field
        v-model="form.description"
        label="商品详情"
        placeholder="请输入商品详情"
        :rows="4"
        autosize
        type="textarea"
      />
      <div v-if="aiData" class="ai-saved-hint">已使用 AI 生成文案</div>
    </div>

    <!-- ═══════ 商品图片 ═══════ -->
    <div class="form-section">
      <div class="section-title">商品图片</div>

      <div class="upload-group">
        <div class="upload-label">主图 <span class="required">*</span></div>
        <div class="upload-box upload-box-main" @click="triggerFileInput('main')">
          <img v-if="mainImagePreview" :src="mainImagePreview" class="upload-preview" />
          <div v-else class="upload-placeholder">
            <van-icon name="photograph" size="32" color="#c8c4c0" />
            <span>点击上传主图</span>
          </div>
          <div v-if="mainImagePreview" class="upload-overlay" @click.stop="removeMainImage">
            <van-icon name="delete-o" size="20" color="#fff" />
          </div>
        </div>
      </div>

      <div class="upload-group">
        <div class="upload-label">详情轮播图</div>
        <div class="upload-list">
          <div v-for="(item, i) in imageItems" :key="i" class="upload-item">
            <img :src="item.url" class="upload-preview" />
            <div class="upload-item-overlay" @click="removeDetailImage(i)">
              <van-icon name="cross" size="16" color="#fff" />
            </div>
          </div>
          <div class="upload-item upload-add" @click="triggerFileInput('detail')">
            <van-icon name="plus" size="28" color="#c8c4c0" />
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════ SKU 规格 ═══════ -->
    <div class="form-section">
      <div class="section-title">商品规格</div>
      <div v-for="(sku, i) in form.skuList" :key="i" class="sku-card">
        <div class="sku-header">
          <span class="sku-index">规格{{ i + 1 }}</span>
          <van-icon v-if="form.skuList.length > 1" name="delete-o" size="18" color="#e8573a" class="sku-del" @click="removeSku(i)" />
        </div>
        <van-field v-model="sku.spec" label="规格名" placeholder="如：红色" :rules="[{ required: true, message: '请输入规格名' }]" />
        <van-field v-model="sku.price" label="价格" type="digit" placeholder="0.00" :rules="[{ required: true, message: '请输入价格' }]" />
        <van-field v-model="sku.stock" label="库存" type="digit" placeholder="0" :rules="[{ required: true, message: '请输入库存' }]" />
        <div class="sku-image-upload">
          <div class="upload-label">规格图片</div>
          <div class="upload-box small" @click="triggerSkuFileInput(i)">
            <img v-if="sku._preview" :src="sku._preview" class="upload-preview" />
            <div v-else class="upload-placeholder">
              <van-icon name="photograph" size="22" color="#c8c4c0" />
            </div>
            <div v-if="sku._preview" class="upload-overlay" @click.stop="removeSkuImage(i)">
              <van-icon name="delete-o" size="16" color="#fff" />
            </div>
          </div>
        </div>
      </div>
      <van-button plain round size="small" class="add-sku-btn" @click="addSku" icon="plus">
        添加更多规格
      </van-button>
    </div>

    <!-- ═══════ 上架状态 ═══════ -->
    <div class="form-section">
      <div class="section-title">上架状态</div>
      <div class="status-row">
        <van-switch v-model="form.status" :active-value="1" :inactive-value="0" size="24" />
        <span class="status-text" :class="form.status === 1 ? 'on' : 'off'">
          {{ form.status === 1 ? '上架' : '下架' }}
        </span>
      </div>
    </div>

    <!-- ═══════ 提交 ═══════ -->
    <div class="submit-area">
      <van-button round block native-type="submit" :loading="submitting" class="submit-btn" loading-text="图片上传中...">
        {{ submitText }}
      </van-button>
    </div>

    <!-- 分类选择器 -->
    <van-popup v-model:show="showCategoryPicker" round position="bottom">
      <van-picker
        :columns="categoryOptions"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
        title="选择分类"
      />
    </van-popup>

    <!-- 隐藏的文件输入 -->
    <input ref="mainFileInput" type="file" accept="image/*" class="file-hidden" @change="onMainFileChange" />
    <input ref="detailFileInput" type="file" accept="image/*" class="file-hidden" @change="onDetailFileChange" multiple />
    <input ref="skuFileInputRef" type="file" accept="image/*" class="file-hidden" @change="onSkuFileChange" />
  </van-form>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { showToast } from 'vant'
import { uploadImage, generateProductCopy, saveProductCopy } from '../../api/merchant.js'
import { getTree } from '../../api/category.js'

const props = defineProps({
  initForm: { type: Object, default: () => ({}) },
  submitText: { type: String, default: '提交商品' },
})

const emit = defineEmits(['submit'])

const formRef = ref(null)

// ═══════════════ 表单数据 ═══════════════
const form = reactive({
  name: '',
  subTitle: '',
  brand: '',
  categoryId: null,
  categoryName: '',
  mainImage: '',
  imageList: [],
  description: '',
  status: 1,
  skuList: [
    { spec: '', price: '', stock: '', image: '', _file: null, _preview: '' },
  ],
})

// ═══════════════ AI 生成营销文案 ═══════════════
const aiLoading = ref(false)
const aiSaving = ref(false)
/** AI 返回的原始数据，非空表示已生成过 */
const aiData = ref(null)

async function handleAiGenerate() {
  if (!form.name) return showToast('请先输入商品名称')
  if (!form.subTitle) return showToast('请先输入副标题（核心卖点）')
  aiLoading.value = true
  try {
    const res = await generateProductCopy({
      productName: form.name,
      coreSellingPoints: form.subTitle,
    })
    // 保存 AI 响应，提交表单时一同保存
    aiData.value = res
    // 仅回填商品详情和副标题，不覆盖商品名称
    if (res.detail) form.description = res.detail
    if (res.sellPoints?.length) {
      form.subTitle = res.sellPoints.join('、')
    }
    showToast('AI文案生成成功，请确认并编辑')
  } catch {
    showToast('AI文案生成失败，请重试')
  } finally {
    aiLoading.value = false
  }
}

// ═══════════════ 分类选择 ═══════════════
const showCategoryPicker = ref(false)
const categoryOptions = ref([])

function flattenTree(nodes, depth = 0) {
  const result = []
  for (const node of nodes) {
    const prefix = '  '.repeat(depth)
    result.push({ text: prefix + node.name, value: node.id })
    if (node.children?.length) result.push(...flattenTree(node.children, depth + 1))
  }
  return result
}

onMounted(async () => {
  try {
    const tree = await getTree()
    categoryOptions.value = flattenTree(tree || [])
  } catch { categoryOptions.value = [] }
})

function onCategoryConfirm({ selectedValues }) {
  form.categoryId = selectedValues[0]
  const found = categoryOptions.value.find(o => o.value === selectedValues[0])
  form.categoryName = found?.text?.trim() || ''
  showCategoryPicker.value = false
}

// ═══════════════ 图片上传 ═══════════════
const mainFileInput = ref(null)
const detailFileInput = ref(null)
const skuFileInputRef = ref(null)

const mainImagePreview = ref('')
const mainImageFile = ref(null)
/** 详情图片：{ url: string(预览/线上URL), file: File|null(新上传才有值) } */
const imageItems = ref([])

let skuUploadIndex = -1

function triggerFileInput(type) {
  if (type === 'main') mainFileInput.value?.click()
  else detailFileInput.value?.click()
}

function onMainFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  mainImageFile.value = f
  const reader = new FileReader()
  reader.onload = (ev) => { mainImagePreview.value = ev.target?.result || '' }
  reader.readAsDataURL(f)
  e.target.value = ''
}

function removeMainImage() {
  mainImageFile.value = null
  mainImagePreview.value = ''
  form.mainImage = ''
}

function onDetailFileChange(e) {
  const files = Array.from(e.target.files || [])
  for (const f of files) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      imageItems.value.push({ url: ev.target?.result || '', file: f })
    }
    reader.readAsDataURL(f)
  }
  e.target.value = ''
}

function removeDetailImage(i) {
  const removed = imageItems.value.splice(i, 1)[0]
  // 已有线上图片 → 同步从 form.imageList 删除
  if (removed && !removed.file) {
    const idx = form.imageList.indexOf(removed.url)
    if (idx !== -1) form.imageList.splice(idx, 1)
  }
}

function triggerSkuFileInput(i) {
  skuUploadIndex = i
  skuFileInputRef.value?.click()
}

function onSkuFileChange(e) {
  const f = e.target.files?.[0]
  if (!f || skuUploadIndex < 0) return
  const sku = form.skuList[skuUploadIndex]
  if (!sku) return
  sku._file = f
  const reader = new FileReader()
  reader.onload = (ev) => { sku._preview = ev.target?.result || '' }
  reader.readAsDataURL(f)
  skuUploadIndex = -1
  e.target.value = ''
}

function removeSkuImage(i) {
  const sku = form.skuList[i]
  sku._file = null
  sku._preview = ''
  sku.image = ''
}

// ═══════════════ SKU 管理 ═══════════════
function addSku() {
  form.skuList.push({ spec: '', price: '', stock: '', image: '', _file: null, _preview: '' })
}

function removeSku(i) {
  form.skuList.splice(i, 1)
}

// ═══════════════ 初始化数据（编辑模式） ═══════════════
watch(() => props.initForm, (val) => {
  if (!val || !val.name) return
  form.name = val.name || ''
  form.subTitle = val.subTitle || ''
  form.brand = val.brand || ''
  form.categoryId = val.categoryId || null
  form.categoryName = val.categoryName || ''
  form.mainImage = val.mainImage || ''
  form.imageList = val.imageList || []
  form.description = val.description || ''
  form.status = val.status ?? 1

  // SKU
  if (val.skuList?.length) {
    form.skuList = val.skuList.map(s => ({
      id: s.id || undefined,
      skuCode: s.skuCode || undefined,
      spec: s.spec || s.skuName || '',
      price: s.price ?? '',
      stock: s.stock ?? '',
      image: s.image || '',
      _file: null,
      _preview: s.image || '',
    }))
  } else {
    form.skuList = [{ spec: '', price: '', stock: '', image: '', _file: null, _preview: '' }]
  }

  // 预览回显
  mainImagePreview.value = val.mainImage || ''
  imageItems.value = (val.imageList || []).map(url => ({ url, file: null }))
  mainImageFile.value = null
}, { immediate: true, deep: true })

// ═══════════════ 提交 ═══════════════
const submitting = ref(false)

async function handleSubmit() {
  if (!form.categoryId) return showToast('请选择分类')

  submitting.value = true
  try {
    // 1. 上传主图（仅当有新文件时）
    if (mainImageFile.value) {
      form.mainImage = await uploadImage(mainImageFile.value, 'goods')
    }

    // 2. 上传详情轮播图（新文件才传，已有 URL 保留）
    const uploadedUrls = []
    for (const item of imageItems.value) {
      if (item.file) {
        const url = await uploadImage(item.file, 'goods')
        uploadedUrls.push(url)
      } else {
        uploadedUrls.push(item.url)
      }
    }
    form.imageList = uploadedUrls

    // 3. 上传 SKU 图片
    for (const sku of form.skuList) {
      if (sku._file) {
        sku.image = await uploadImage(sku._file, 'goods')
      }
    }

    // 4. 如果使用过 AI 生成，一并保存文案记录（不影响商品发布）
    if (aiData.value) {
      try {
        await saveProductCopy({
          productName: form.name,
          coreSellingPoints: form.subTitle,
          title: aiData.value.title || form.name,
          detail: form.description,
          sellPoints: form.subTitle.split(/[,，、]/).filter(Boolean),
        })
      } catch { /* AI 保存失败不阻塞提交 */ }
      aiData.value = null
    }

    // 5. 构建提交数据
    const payload = {
      categoryId: form.categoryId,
      name: form.name,
      subTitle: form.subTitle,
      brand: form.brand,
      mainImage: form.mainImage,
      imageList: form.imageList,
      description: form.description,
      status: form.status,
      skuList: form.skuList.map(({ _file, _preview, ...s }) => {
        const item = { skuName: s.spec, price: Number(s.price), stock: Number(s.stock) }
        if (s.skuCode) item.skuCode = s.skuCode
        if (s.image) item.image = s.image
        if (s.id) item.id = s.id
        return item
      }),
    }

    emit('submit', payload)
  } catch {
    // toast by interceptor
  } finally {
    submitting.value = false
  }
}

// ═══════════════ 暴露方法 ═══════════════
function resetForm() {
  form.name = ''
  form.subTitle = ''
  form.brand = ''
  form.categoryId = null
  form.categoryName = ''
  form.mainImage = ''
  form.imageList = []
  form.description = ''
  form.status = 1
  form.skuList = [{ spec: '', price: '', stock: '', image: '', _file: null, _preview: '' }]
  mainImagePreview.value = ''
  mainImageFile.value = null
  imageItems.value = []
  aiData.value = null
}

function validate() {
  return formRef.value?.validate()
}

defineExpose({ formRef, resetForm, validate })
</script>

<style scoped>
.goods-form { padding-bottom: 40px; }
.form-section {
  background: #fff;
  margin: 10px 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0ece8;
}
.required { color: #e8573a; }

.upload-group { margin-bottom: 14px; }
.upload-group:last-child { margin-bottom: 0; }
.upload-label { font-size: 13px; color: #5a5a6e; margin-bottom: 8px; }
.upload-box {
  position: relative;
  width: 100%;
  min-height: 120px;
  border: 2px dashed #e0dcd8;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}
.upload-box:hover { border-color: #e8573a; }
.upload-box.small { width: 80px; min-height: 80px; }
.upload-box-main { max-width: 200px; aspect-ratio: 1; }
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #c8c4c0;
  font-size: 12px;
}
.upload-preview { width: 100%; height: 100%; object-fit: cover; }
.upload-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.upload-box:hover .upload-overlay { opacity: 1; }

.upload-list { display: flex; flex-wrap: wrap; gap: 10px; }
.upload-item {
  position: relative;
  width: 80px; height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #f0ece8;
}
.upload-item .upload-preview { width: 80px; height: 80px; object-fit: cover; }
.upload-item-overlay {
  position: absolute;
  top: 2px; right: 2px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.upload-add {
  border: 2px dashed #e0dcd8;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  background: #faf8f6;
}
.upload-add:hover { border-color: #e8573a; }

.sku-card {
  background: #faf8f6;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.sku-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px;
}
.sku-index { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.sku-del { cursor: pointer; }
.sku-image-upload { padding: 8px 16px; }
.add-sku-btn {
  width: 100%; color: #e8573a !important; border-color: #e8573a !important; font-size: 13px;
}

.status-row { display: flex; align-items: center; gap: 12px; }
.status-text { font-size: 14px; font-weight: 500; }
.status-text.on { color: #07c160; }
.status-text.off { color: #9a9aae; }

.submit-area { padding: 20px 16px 40px; }
.submit-btn {
  height: 44px; font-size: 16px; font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important;
}
.file-hidden { display: none; }

/* ── AI 文案 ── */
.ai-btn {
  height: 28px !important;
  font-size: 11px !important;
  padding: 0 10px !important;
  border-color: #e8573a !important;
  color: #e8573a !important;
  white-space: nowrap;
  flex-shrink: 0;
}
.ai-saved-hint {
  font-size: 12px;
  color: #07c160;
  text-align: right;
  margin-top: 8px;
}
</style>
