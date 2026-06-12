<template>
  <div class="page-merchant-apply">
    <NavBar title="商家入驻" />

    <div class="apply-hero">
      <div class="apply-icon">🏪</div>
      <h3>成为 SheepAI 商家</h3>
      <p>开启您的电商之旅，让更多用户发现您的商品</p>
    </div>

    <!-- 入驻状态提示 -->
    <div v-if="applyInfo" class="status-banner" :class="'banner-' + applyInfo.status">
      <template v-if="applyInfo.status === 0">
        <van-icon name="clock-o" size="20" class="banner-icon" />
        <div class="banner-text">
          <div class="banner-title">入驻申请正在审核中</div>
          <div class="banner-desc">请耐心等待，审核结果将通过系统消息通知您</div>
        </div>
      </template>
      <template v-if="applyInfo.status === 2">
        <van-icon name="fail" size="20" class="banner-icon" />
        <div class="banner-text">
          <div class="banner-title">入驻申请已被驳回</div>
          <div class="banner-desc" v-if="applyInfo.auditRemark">驳回原因：{{ applyInfo.auditRemark }}</div>
          <div class="banner-desc">请修改资料后重新提交申请</div>
        </div>
      </template>
    </div>

    <div v-if="!applyInfo || applyInfo.status !== 0">
      <van-form @submit="handleSubmit" class="apply-form">
      <van-field
        v-model="form.shopName"
        label="店铺名称"
        placeholder="请输入店铺名称"
        :rules="[{ required: true, message: '请输入店铺名称' }]"
      />
      <!-- 营业执照图片上传 -->
      <div class="field-block">
        <label class="field-label">营业执照图片</label>
        <div class="upload-area" @click="fileInputRef?.click()">
          <img v-if="licensePreview" :src="licensePreview" class="license-preview" />
          <div v-else class="upload-placeholder">
            <van-icon name="photograph" size="32" color="#c8c4c0" />
            <span>点击上传营业执照</span>
          </div>
        </div>
        <input ref="fileInputRef" type="file" accept="image/*" class="file-hidden" @change="onFileSelected" />
      </div>
      <van-field
        v-model="form.businessScopeName"
        is-link
        readonly
        label="经营范围"
        placeholder="请选择经营范围"
        :rules="[{ required: true, message: '请选择经营范围' }]"
        @click="showScopePicker = true"
      />
      <!-- 经营范围多选 -->
      <van-popup v-model:show="showScopePicker" round position="bottom" class="scope-popup" @open="initScopeSelected">
        <div class="scope-popup-header">
          <span class="scope-cancel" @click="showScopePicker = false">取消</span>
          <span class="scope-title">选择经营范围</span>
          <span class="scope-confirm" @click="onScopeConfirm">确定</span>
        </div>
        <div class="scope-list">
          <van-checkbox-group v-model="scopeSelected" direction="vertical">
            <van-checkbox v-for="opt in categoryOptions" :key="opt.value" :name="opt.value" shape="square" class="scope-checkbox">
              {{ opt.text }}
            </van-checkbox>
          </van-checkbox-group>
        </div>
      </van-popup>

      <!-- 食品许可证图片上传 -->
      <div class="field-block">
        <label class="field-label">食品许可证 <span class="optional">（可选）</span></label>
        <div class="upload-area" @click="foodFileInputRef?.click()">
          <img v-if="foodPreview" :src="foodPreview" class="license-preview" />
          <div v-else class="upload-placeholder">
            <van-icon name="photograph" size="32" color="#c8c4c0" />
            <span>点击上传食品许可证</span>
          </div>
        </div>
        <input ref="foodFileInputRef" type="file" accept="image/*" class="file-hidden" @change="onFoodSelected" />
      </div>

      <van-field
        v-model="form.contactName"
        label="联系人姓名"
        placeholder="请输入联系人姓名"
        :rules="[{ required: true, message: '请输入联系人姓名' }]"
      />
      <van-field
        v-model="form.contactPhone"
        label="联系电话"
        type="tel"
        placeholder="请输入联系电话"
        :rules="[{ required: true, message: '请输入联系电话' }]"
      />
      <van-field
        v-model="form.legalPerson"
        label="法人信息"
        placeholder="选填，输入法人姓名"
      />
      <van-field
        v-model="form.businessAddress"
        label="经营地址"
        placeholder="选填，输入经营地址"
      />

      <div class="form-submit">
        <van-button round block native-type="submit" :loading="loading" class="submit-btn">
          提交入驻申请
        </van-button>
      </div>
    </van-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { uploadImage, merchantApply, getMerchantApplyStatus } from '../../api/merchant.js'
import { getTree } from '../../api/category.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()

// 入驻申请状态
const applyInfo = ref(null)
const statusLoading = ref(true)

// 经营范围多选
const showScopePicker = ref(false)
const categoryOptions = ref([])
const scopeSelected = ref([])

/** 递归展平分类树为选择项 */
function flattenTree(nodes, depth = 0) {
  const result = []
  for (const node of nodes) {
    const prefix = depth > 0 ? '　'.repeat(depth) : ''
    result.push({ text: prefix + node.name, value: String(node.id) })
    if (node.children?.length) result.push(...flattenTree(node.children, depth + 1))
  }
  return result
}

onMounted(async () => {
  // 检查入驻申请状态
  try {
    const data = await getMerchantApplyStatus()
    applyInfo.value = data
    if (data?.status === 1) {
      showToast('您已成功入驻')
      router.replace('/merchant/dashboard')
      return
    }
  } catch {
    applyInfo.value = null // 无申请记录
  }
  statusLoading.value = false

  try {
    const tree = await getTree()
    categoryOptions.value = flattenTree(tree || [])
  } catch { categoryOptions.value = [] }
})

function onScopeConfirm() {
  form.businessScope = scopeSelected.value.map(String).join(',')
  form.businessScopeName = scopeSelected.value.map(id => {
    return categoryOptions.value.find(c => String(c.value) === String(id))?.text || id
  }).join('、')
  showScopePicker.value = false
}

function openScopePicker() {
  scopeSelected.value = form.businessScope ? form.businessScope.split(',').filter(Boolean) : []
  showScopePicker.value = true
}

const loading = ref(false)
const form = reactive({
  shopName: '',
  businessLicense: '',
  businessScope: '', businessScopeName: '',
  contactName: '',
  contactPhone: '',
  foodLicense: '',
  legalPerson: '',
  businessAddress: '',
})

// 营业执照图片上传
const fileInputRef = ref(null)
const licenseFile = ref(null)
const licensePreview = ref('')

function onFileSelected(e) {
  const f = e.target.files?.[0]
  if (!f) return
  licenseFile.value = f
  const reader = new FileReader()
  reader.onload = (ev) => { licensePreview.value = ev.target?.result || '' }
  reader.readAsDataURL(f)
}

// 食品许可证图片上传
const foodFileInputRef = ref(null)
const foodFile = ref(null)
const foodPreview = ref('')

function onFoodSelected(e) {
  const f = e.target.files?.[0]
  if (!f) return
  foodFile.value = f
  const reader = new FileReader()
  reader.onload = (ev) => { foodPreview.value = ev.target?.result || '' }
  reader.readAsDataURL(f)
}

async function handleSubmit() {
  if (!licenseFile.value) return showToast('请上传营业执照图片')

  loading.value = true
  try {
    // 1. 上传营业执照 → OSS URL
    const licenseUrl = await uploadImage(licenseFile.value, 'cert')
    form.businessLicense = licenseUrl

    // 2. 上传食品许可证（可选）
    if (foodFile.value) {
      const foodUrl = await uploadImage(foodFile.value, 'cert')
      form.foodLicense = foodUrl
    }

    // 3. 提交申请单（只传业务字段，不含 businessScopeName）
    const { businessScopeName, ...payload } = form
    await merchantApply(payload)
    showToast('申请已提交，请等待审核')
    router.replace('/')
  } catch { /* toast 由拦截器处理 */ }
  finally { loading.value = false }
}
</script>

<style scoped>
.page-merchant-apply {
  min-height: 100vh;
  background: #fff;
}

/* ── 入驻状态提示 ── */
.status-banner {
  margin: 12px 16px;
  padding: 14px 16px;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.status-banner.banner-0 {
  background: #fff8e6;
  border: 1px solid #fceebe;
}
.status-banner.banner-2 {
  background: #fdecea;
  border: 1px solid #f5c6c6;
}
.banner-icon { flex-shrink: 0; margin-top: 2px; }
.banner-0 .banner-icon { color: #f39c12; }
.banner-2 .banner-icon { color: #c62828; }
.banner-text { flex: 1; min-width: 0; }
.banner-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 4px;
}
.banner-desc {
  font-size: 13px;
  color: #5a5a6e;
  line-height: 1.5;
}

.apply-hero {
  text-align: center;
  padding: 40px 24px 24px;
}
.apply-icon {
  font-size: 64px;
  margin-bottom: 12px;
}
.apply-hero h3 {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 8px;
}
.apply-hero p {
  font-size: 14px;
  color: #9a9aae;
  margin: 0;
}
.apply-form {
  padding: 0 16px;
}
.field-block {
  padding: 10px 16px;
}
.field-label {
  display: block;
  font-size: 14px;
  color: #5a5a6e;
  margin-bottom: 8px;
}
.upload-area {
  border: 2px dashed #e0dcd8;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s;
  min-height: 100px;
}
.upload-area:hover {
  border-color: #e8573a;
}
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #c8c4c0;
  font-size: 13px;
}
.license-preview {
  max-height: 160px;
  border-radius: 8px;
}
.file-hidden {
  display: none;
}
.optional {
  font-weight: 400;
  font-size: 12px;
  color: #c8c4c0;
}
.scope-popup {
  max-height: 60vh;
}
.scope-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f0ece8;
}
.scope-cancel {
  font-size: 14px;
  color: #9a9aae;
}
.scope-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
}
.scope-confirm {
  font-size: 14px;
  color: #e8573a;
  font-weight: 500;
}
.scope-list {
  padding: 12px 16px;
  max-height: 40vh;
  overflow-y: auto;
}
.scope-checkbox {
  padding: 10px 0;
}
.form-submit {
  margin-top: 32px;
  padding: 0 16px 40px;
}
.submit-btn {
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
}
</style>
