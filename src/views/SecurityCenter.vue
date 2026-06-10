<template>
  <div class="page-security">
    <NavBar title="安全中心" />

    <!-- 顶部提示 -->
    <div class="tip-bar" v-if="!profileComplete">
      <van-icon name="info-o" size="16" color="#f39c12" />
      <span>完善实名认证、手机、邮箱后可获得更多权益</span>
    </div>

    <!-- 实名认证 -->
    <div class="sec-section">
      <div class="sec-section-title">实名认证</div>
      <div class="sec-card">
        <div class="sec-row">
          <span class="sec-label">状态</span>
          <span class="sec-status" :class="data.realNameAuth ? 'done' : 'todo'">
            <van-icon :name="data.realNameAuth ? 'success' : 'cross'" />
            {{ data.realNameAuth ? '已实名' : '未实名' }}
          </span>
        </div>
        <div class="sec-row">
          <span class="sec-label">姓名</span>
          <span class="sec-value">{{ data.realNameAuth ? data.realName : '-' }}</span>
        </div>
        <div class="sec-row">
          <span class="sec-label">身份证</span>
          <span class="sec-value">{{ data.realNameAuth ? data.idCard : '-' }}</span>
        </div>
        <div class="sec-row sec-row-btn" v-if="!data.realNameAuth">
          <van-button size="small" round class="sec-btn" @click="openRealName">实名认证</van-button>
        </div>
      </div>
    </div>

    <!-- 手机绑定 -->
    <div class="sec-section">
      <div class="sec-section-title">手机绑定</div>
      <div class="sec-card">
        <div class="sec-row">
          <span class="sec-label">状态</span>
          <span class="sec-status" :class="data.phoneBound ? 'done' : 'todo'">
            <van-icon :name="data.phoneBound ? 'success' : 'cross'" />
            {{ data.phoneBound ? '已绑定' : '未绑定' }}
          </span>
        </div>
        <div class="sec-row">
          <span class="sec-label">手机号</span>
          <span class="sec-value">{{ data.phoneBound ? data.phone : '-' }}</span>
        </div>
        <div class="sec-row sec-row-btn">
          <van-button size="small" round class="sec-btn" @click="openPhone">
            {{ data.phoneBound ? '更换手机' : '绑定手机' }}
          </van-button>
        </div>
      </div>
    </div>

    <!-- 邮箱绑定 -->
    <div class="sec-section">
      <div class="sec-section-title">邮箱绑定</div>
      <div class="sec-card">
        <div class="sec-row">
          <span class="sec-label">状态</span>
          <span class="sec-status" :class="data.emailBound ? 'done' : 'todo'">
            <van-icon :name="data.emailBound ? 'success' : 'cross'" />
            {{ data.emailBound ? '已绑定' : '未绑定' }}
          </span>
        </div>
        <div class="sec-row">
          <span class="sec-label">邮箱</span>
          <span class="sec-value">{{ data.emailBound ? data.email : '-' }}</span>
        </div>
        <div class="sec-row sec-row-btn">
          <van-button size="small" round class="sec-btn" @click="openEmail">
            {{ data.emailBound ? '更换邮箱' : '绑定邮箱' }}
          </van-button>
        </div>
      </div>
    </div>

    <!-- ═══════════ 实名认证弹窗 ═══════════ -->
    <van-dialog v-model:show="showRealName" title="实名认证" :show-confirm-button="false" closeable close-icon-position="top-left" class="sec-dialog">
      <div class="dialog-body">
        <van-form ref="realNameFormRef" @submit="handleRealName">
          <van-field v-model="realNameForm.realName" label="真实姓名" placeholder="请输入真实姓名" maxlength="8" clearable :rules="realNameRules" />
          <van-field v-model="realNameForm.idCard" label="身份证号" placeholder="请输入身份证号" maxlength="18" clearable :rules="idCardRules" />
          <div class="dialog-actions">
            <van-button round plain class="dialog-btn" @click="showRealName = false">取消</van-button>
            <van-button round class="dialog-btn dialog-btn-primary" :loading="rnLoading" native-type="submit">提交认证</van-button>
          </div>
        </van-form>
      </div>
    </van-dialog>

    <!-- ═══════════ 手机绑定弹窗 ═══════════ -->
    <van-dialog v-model:show="showPhone" title="绑定手机" :show-confirm-button="false" closeable close-icon-position="top-left" class="sec-dialog" @closed="resetPhone">
      <div class="dialog-body">
        <!-- 步骤指示器（仅换绑时显示） -->
        <div class="step-bar" v-if="data.phoneBound">
          <span class="step-dot" :class="{ active: phoneStep === 1 }">1</span>
          <span class="step-line"></span>
          <span class="step-dot" :class="{ active: phoneStep === 2 }">2</span>
          <div class="step-labels">
            <span :class="{ active: phoneStep === 1 }">验证身份</span>
            <span :class="{ active: phoneStep === 2 }">新手机号</span>
          </div>
        </div>

        <!-- Step 1: 验证原手机（仅换绑） -->
        <template v-if="data.phoneBound && phoneStep === 1">
          <div class="verify-hint">向原手机号 {{ data.phone }} 发送验证码</div>
          <van-field v-model="phoneOldCode" label="验证码" placeholder="请输入原手机验证码" maxlength="6" clearable :rules="[{ required: true, message: '请输入验证码' }]">
            <template #button>
              <span class="code-btn" :class="{ disabled: phoneOldCd > 0 }" @click="sendPhoneOldCode">
                {{ phoneOldCd > 0 ? phoneOldCd + 's后重发' : '发送验证码' }}
              </span>
            </template>
          </van-field>
          <div class="dialog-actions">
            <van-button round plain class="dialog-btn" @click="showPhone = false">取消</van-button>
            <van-button round class="dialog-btn dialog-btn-primary" :disabled="!phoneOldCode.trim()" @click="phoneStep = 2">下一步</van-button>
          </div>
        </template>

        <!-- Step 2 / 直接绑定 -->
        <template v-else>
          <van-form ref="phoneFormRef" @submit="handlePhone">
            <van-field v-model="phoneForm.phone" name="phone" label="手机号" placeholder="请输入新手机号" maxlength="11" clearable type="tel" :rules="phoneRules" />
            <van-field v-model="phoneForm.code" label="验证码" placeholder="请输入验证码" maxlength="6" clearable :rules="[{ required: true, message: '请输入验证码' }]">
              <template #button>
                <span class="code-btn" :class="{ disabled: phoneCd > 0 }" @click="sendPhoneCode">
                  {{ phoneCd > 0 ? phoneCd + 's后重发' : '发送' }}
                </span>
              </template>
            </van-field>
            <div class="dialog-actions">
              <van-button v-if="data.phoneBound" round plain class="dialog-btn" @click="phoneStep = 1">上一步</van-button>
              <van-button v-else round plain class="dialog-btn" @click="showPhone = false">取消</van-button>
              <van-button round class="dialog-btn dialog-btn-primary" :loading="phoneLoading" native-type="submit">确认绑定</van-button>
            </div>
          </van-form>
        </template>
      </div>
    </van-dialog>

    <!-- ═══════════ 邮箱绑定弹窗 ═══════════ -->
    <van-dialog v-model:show="showEmail" title="绑定邮箱" :show-confirm-button="false" closeable close-icon-position="top-left" class="sec-dialog" @closed="resetEmail">
      <div class="dialog-body">
        <!-- 步骤指示器（仅换绑时显示） -->
        <div class="step-bar" v-if="data.emailBound">
          <span class="step-dot" :class="{ active: emailStep === 1 }">1</span>
          <span class="step-line"></span>
          <span class="step-dot" :class="{ active: emailStep === 2 }">2</span>
          <div class="step-labels">
            <span :class="{ active: emailStep === 1 }">验证身份</span>
            <span :class="{ active: emailStep === 2 }">新邮箱</span>
          </div>
        </div>

        <!-- Step 1: 验证原邮箱（仅换绑） -->
        <template v-if="data.emailBound && emailStep === 1">
          <div class="verify-hint">向原邮箱 {{ data.email }} 发送验证码</div>
          <van-field v-model="emailOldCode" label="验证码" placeholder="请输入原邮箱验证码" maxlength="6" clearable :rules="[{ required: true, message: '请输入验证码' }]">
            <template #button>
              <span class="code-btn" :class="{ disabled: emailOldCd > 0 }" @click="sendEmailOldCode">
                {{ emailOldCd > 0 ? emailOldCd + 's后重发' : '发送验证码' }}
              </span>
            </template>
          </van-field>
          <div class="dialog-actions">
            <van-button round plain class="dialog-btn" @click="showEmail = false">取消</van-button>
            <van-button round class="dialog-btn dialog-btn-primary" :disabled="!emailOldCode.trim()" @click="emailStep = 2">下一步</van-button>
          </div>
        </template>

        <!-- Step 2 / 直接绑定 -->
        <template v-else>
          <van-form ref="emailFormRef" @submit="handleEmail">
            <van-field v-model="emailForm.email" name="email" label="邮箱" placeholder="请输入新邮箱" clearable :rules="emailRules" />
            <van-field v-model="emailForm.code" label="验证码" placeholder="请输入验证码" maxlength="6" clearable :rules="[{ required: true, message: '请输入验证码' }]">
              <template #button>
                <span class="code-btn" :class="{ disabled: emailCd > 0 }" @click="sendEmailCodeHandler">
                  {{ emailCd > 0 ? emailCd + 's后重发' : '发送' }}
                </span>
              </template>
            </van-field>
            <div class="dialog-actions">
              <van-button v-if="data.emailBound" round plain class="dialog-btn" @click="emailStep = 1">上一步</van-button>
              <van-button v-else round plain class="dialog-btn" @click="showEmail = false">取消</van-button>
              <van-button round class="dialog-btn dialog-btn-primary" :loading="emailLoading" native-type="submit">确认绑定</van-button>
            </div>
          </van-form>
        </template>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { showToast } from 'vant'
import { getSecurityProfile, submitRealName, checkPhone, sendRegisterCode, bindPhone, sendEmailCode as sendEmailCodeApi, bindEmail, sendOldPhoneCode, sendOldEmailCode } from '../api/member.js'
import NavBar from '../components/NavBar.vue'

const profileComplete = ref(false)

// 安全资料
const data = reactive({
  realNameAuth: false,
  realName: '',
  idCard: '',
  phone: '',
  email: '',
  phoneBound: false,
  emailBound: false,
})

async function loadAll() {
  try {
    const sec = await getSecurityProfile()
    if (sec) {
      data.realNameAuth = !!sec.realNameAuth
      data.realName = sec.realName || ''
      data.idCard = sec.idCard || ''
      data.phone = sec.phone || ''
      data.email = sec.email || ''
      data.phoneBound = !!sec.phoneBound
      data.emailBound = !!sec.emailBound
      profileComplete.value = !!sec.profileComplete
    }
  } catch {
    showToast('加载失败')
  }
}

onMounted(loadAll)

// ── 实名认证 ──
const showRealName = ref(false)
const realNameForm = reactive({ realName: '', idCard: '' })
const rnLoading = ref(false)
const realNameFormRef = ref(null)

const cnNameRegex = /^[一-龥]{2,8}$/
const idCardRegex = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/

const realNameRules = [
  { required: true, message: '请输入真实姓名' },
  { pattern: cnNameRegex, message: '请输入2-8位中文姓名' },
]
const idCardRules = [
  { required: true, message: '请输入身份证号' },
  { pattern: idCardRegex, message: '请输入正确的身份证号' },
]

function openRealName() {
  realNameForm.realName = ''
  realNameForm.idCard = ''
  showRealName.value = true
}

async function handleRealName() {
  if (rnLoading.value) return
  rnLoading.value = true
  try {
    await submitRealName({ realName: realNameForm.realName.trim(), idCard: realNameForm.idCard.trim() })
    showToast('实名认证成功')
    showRealName.value = false
    loadAll()
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    showToast(msg || '认证失败')
  } finally {
    rnLoading.value = false
  }
}

// ── 手机绑定 ──
const showPhone = ref(false)
const phoneStep = ref(1)
const phoneOldCode = ref('')
const phoneOldCd = ref(0)
let phoneOldTimer = null
const phoneForm = reactive({ phone: '', code: '' })
const phoneLoading = ref(false)
const phoneCd = ref(0)
let phoneTimer = null
const phoneFormRef = ref(null)

const phoneRegex = /^1[3-9]\d{9}$/
const phoneRules = [
  { required: true, message: '请输入手机号' },
  { pattern: phoneRegex, message: '手机号格式不正确' },
]

function openPhone() {
  phoneStep.value = 1
  phoneOldCode.value = ''
  phoneForm.phone = ''
  phoneForm.code = ''
  showPhone.value = true
}

function resetPhone() {
  phoneStep.value = 1
  phoneOldCode.value = ''
  clearInterval(phoneOldTimer); phoneOldTimer = null; phoneOldCd.value = 0
  clearInterval(phoneTimer); phoneTimer = null; phoneCd.value = 0
}

async function sendPhoneOldCode() {
  if (phoneOldCd.value > 0) return
  try {
    await sendOldPhoneCode()
    showToast('验证码已发送至原手机')
    phoneOldCd.value = 60
    clearInterval(phoneOldTimer)
    phoneOldTimer = setInterval(() => {
      phoneOldCd.value--
      if (phoneOldCd.value <= 0) { clearInterval(phoneOldTimer); phoneOldTimer = null }
    }, 1000)
  } catch { /* 拦截器弹 toast */ }
}

async function sendPhoneCode() {
  if (phoneCd.value > 0) return
  try {
    await phoneFormRef.value?.validate('phone')
  } catch { return }
  try {
    const exists = await checkPhone(phoneForm.phone.trim())
    if (exists) { showToast('该手机号已被其他账号绑定'); return }
  } catch { /* 跳过 */ }
  try {
    await sendRegisterCode(phoneForm.phone.trim())
    showToast('验证码已发送')
    phoneCd.value = 60
    clearInterval(phoneTimer)
    phoneTimer = setInterval(() => {
      phoneCd.value--
      if (phoneCd.value <= 0) { clearInterval(phoneTimer); phoneTimer = null }
    }, 1000)
  } catch { /* 拦截器弹 toast */ }
}

async function handlePhone() {
  if (phoneLoading.value) return
  phoneLoading.value = true
  try {
    await bindPhone({ phone: phoneForm.phone.trim(), code: phoneForm.code.trim() })
    showToast('手机绑定成功')
    showPhone.value = false
    loadAll()
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    showToast(msg || '绑定失败')
  } finally {
    phoneLoading.value = false
  }
}

// ── 邮箱绑定 ──
const showEmail = ref(false)
const emailStep = ref(1)
const emailOldCode = ref('')
const emailOldCd = ref(0)
let emailOldTimer = null
const emailForm = reactive({ email: '', code: '' })
const emailLoading = ref(false)
const emailCd = ref(0)
let emailTimer = null
const emailFormRef = ref(null)

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const emailRules = [
  { required: true, message: '请输入邮箱' },
  { pattern: emailRegex, message: '邮箱格式不正确' },
]

function openEmail() {
  emailStep.value = 1
  emailOldCode.value = ''
  emailForm.email = ''
  emailForm.code = ''
  showEmail.value = true
}

function resetEmail() {
  emailStep.value = 1
  emailOldCode.value = ''
  clearInterval(emailOldTimer); emailOldTimer = null; emailOldCd.value = 0
  clearInterval(emailTimer); emailTimer = null; emailCd.value = 0
}

async function sendEmailOldCode() {
  if (emailOldCd.value > 0) return
  try {
    await sendOldEmailCode()
    showToast('验证码已发送至原邮箱')
    emailOldCd.value = 60
    clearInterval(emailOldTimer)
    emailOldTimer = setInterval(() => {
      emailOldCd.value--
      if (emailOldCd.value <= 0) { clearInterval(emailOldTimer); emailOldTimer = null }
    }, 1000)
  } catch { /* 拦截器弹 toast */ }
}

async function sendEmailCodeHandler() {
  if (emailCd.value > 0) return
  try {
    await emailFormRef.value?.validate('email')
  } catch { return }
  try {
    await sendEmailCodeApi(emailForm.email.trim())
    showToast('验证码已发送至 ' + emailForm.email.trim())
    emailCd.value = 60
    clearInterval(emailTimer)
    emailTimer = setInterval(() => {
      emailCd.value--
      if (emailCd.value <= 0) { clearInterval(emailTimer); emailTimer = null }
    }, 1000)
  } catch {
    // 拦截器已弹 toast
  }
}

async function handleEmail() {
  if (emailLoading.value) return
  emailLoading.value = true
  try {
    await bindEmail({ email: emailForm.email.trim(), code: emailForm.code.trim() })
    showToast('邮箱绑定成功')
    showEmail.value = false
    loadAll()
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    showToast(msg || '绑定失败')
  } finally {
    emailLoading.value = false
  }
}
</script>

<style scoped>
.page-security {
  min-height: 100vh;
  background: #f5f3f0;
  padding-bottom: 40px;
}

/* 顶部提示 */
.tip-bar {
  display: flex; align-items: center; gap: 6px;
  margin: 12px 12px 0; padding: 10px 14px;
  background: #fff8e1; border-radius: 10px;
  font-size: 13px; color: #795548;
}

/* 安全区块 */
.sec-section { margin: 16px 12px 0; }
.sec-section-title {
  font-size: 15px; font-weight: 600; color: #1a1a2e;
  margin-bottom: 8px; padding-left: 2px;
}
.sec-card {
  background: #fff; border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); overflow: hidden;
}
.sec-row {
  display: flex; align-items: center; padding: 13px 16px;
  border-bottom: 1px solid #f5f3f0; min-height: 44px;
}
.sec-row:last-child { border-bottom: none; }
.sec-row-btn { justify-content: flex-end; padding: 10px 16px; }
.sec-label {
  width: 80px; flex-shrink: 0; font-size: 13px; color: #9a9aae;
}
.sec-value { font-size: 13px; color: #1a1a2e; font-weight: 500; }
.sec-status { font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; }
.sec-status.done { color: #2e7d32; }
.sec-status.todo { color: #9a9aae; }

.sec-btn {
  border-color: #e8573a !important; color: #e8573a !important;
  font-size: 12px; padding: 0 14px;
}

/* 弹窗 */
.sec-dialog :deep(.van-dialog__header) { font-weight: 600; font-size: 16px; padding: 16px 20px 0; }
.dialog-body { padding: 12px 20px 20px; }
.dialog-actions { display: flex; gap: 12px; justify-content: center; margin-top: 12px; }
.dialog-btn { flex: 1; height: 40px; font-size: 14px; }
.dialog-btn-primary {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important;
}

/* 步骤指示器 */
.step-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 16px; justify-content: center; }
.step-dot {
  width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; background: #f0ece8; color: #9a9aae;
}
.step-dot.active { background: #e8573a; color: #fff; }
.step-line { width: 30px; height: 2px; background: #f0ece8; }
.step-labels { width: 100%; display: flex; justify-content: space-between; font-size: 12px; color: #9a9aae; padding: 0 6px; }
.step-labels span.active { color: #1a1a2e; font-weight: 600; }

/* 验证提示 */
.verify-hint { font-size: 13px; color: #5a5a6e; text-align: center; padding: 8px 0 12px; }

/* 验证码按钮 */
.code-btn {
  font-size: 13px; color: #e8573a; font-weight: 500;
  white-space: nowrap; cursor: pointer; padding: 6px 10px;
  border-radius: 6px; transition: background 0.15s;
}
.code-btn:active { background: rgba(232,87,58,0.08); }
.code-btn.disabled { color: #c8c4c0; cursor: not-allowed; }
</style>