<template>
  <div class="page-forgot">
    <div class="forgot-nav">
      <van-icon name="arrow-left" class="nav-back" @click="handleBack" />
      <span class="nav-title">忘记密码</span>
      <van-icon name="home-o" size="20" class="nav-home" @click="$router.push('/')" />
    </div>

    <div class="forgot-body">
      <div class="forgot-card">
        <div class="forgot-brand">SheepAI Mall</div>

        <!-- Tab 切换 -->
        <div class="tab-bar">
          <span class="tab-item" :class="{ active: type === 'phone' }" @click="switchType('phone')">手机号找回</span>
          <span class="tab-item" :class="{ active: type === 'email' }" @click="switchType('email')">邮箱找回</span>
        </div>

        <!-- 步骤指示器（2步） -->
        <div class="step-indicator">
          <div class="step-dot" :class="{ active: step >= 1, done: step > 1 }">1</div>
          <div class="step-line" :class="{ done: step > 1 }"></div>
          <div class="step-dot" :class="{ active: step >= 2 }">2</div>
        </div>
        <div class="step-labels">
          <span class="step-label" :class="{ active: step >= 1 }">验证{{ type === 'phone' ? '手机号' : '邮箱' }}</span>
          <span class="step-label" :class="{ active: step >= 2 }">重置密码</span>
        </div>

        <template v-if="!success">
          <!-- ══════ Step 1: 验证账号 + 验证码 ══════ -->
          <template v-if="step === 1">
            <div class="step-title">验证{{ type === 'phone' ? '手机号' : '邮箱' }}</div>
            <van-form ref="formRef" @submit="handleVerifyCode" class="step-form">
              <div class="field-group">
                <van-field
                  v-model="account"
                  :name="type"
                  :placeholder="type === 'phone' ? '手机号' : '邮箱地址'"
                  :rules="accountRules"
                  clearable
                  :maxlength="type === 'phone' ? 11 : undefined"
                  :type="type === 'phone' ? 'tel' : 'text'"
                />
              </div>
              <div class="field-group code-group">
                <van-field
                  v-model="code"
                  name="code"
                  placeholder="请输入验证码"
                  :rules="[{ required: true, message: '请输入验证码' }, { pattern: /^\d{4,6}$/, message: '验证码格式不正确' }]"
                  clearable
                  maxlength="6"
                >
                  <template #button>
                    <span class="send-code-btn" :class="{ disabled: countdown > 0 || sendingCode }" @click="sendCode">
                      {{ countdown > 0 ? countdown + 's' : '发送验证码' }}
                    </span>
                  </template>
                </van-field>
              </div>
              <van-button round block native-type="submit" :loading="verifyLoading" class="forgot-btn">下一步</van-button>
            </van-form>
          </template>

          <!-- ══════ Step 2: 重置密码 ══════ -->
          <template v-if="step === 2">
            <div class="step-title">重置密码</div>
            <div class="step-hint">验证码已确认，请设置新密码</div>
            <van-form @submit="handleReset" class="step-form">
              <div class="field-group">
                <van-field
                  v-model="newPassword"
                  :type="showPwd ? 'text' : 'password'"
                  name="newPassword"
                  placeholder="新密码（至少6位）"
                  :rules="[{ required: true, message: '请输入新密码' }, { pattern: /^.{6,}$/, message: '密码至少6位' }]"
                  clearable
                >
                  <template #button>
                    <van-icon :name="showPwd ? 'eye-o' : 'closed-eye'" size="18" color="#c8c4c0" class="eye-icon" @click="showPwd = !showPwd" />
                  </template>
                </van-field>
              </div>
              <div class="field-group">
                <van-field
                  v-model="confirmPassword"
                  :type="showPwd ? 'text' : 'password'"
                  name="confirmPassword"
                  placeholder="确认新密码"
                  :rules="[{ required: true, message: '请确认新密码' }, { validator: val => val === newPassword, message: '两次密码不一致' }]"
                  clearable
                />
              </div>
              <van-button round block native-type="submit" :loading="submitting" class="forgot-btn">确认重置</van-button>
            </van-form>
          </template>
        </template>

        <!-- 成功提示 -->
        <div v-else class="success-wrap">
          <van-icon name="success" size="48" color="#07c160" />
          <div class="success-title">密码重置成功</div>
          <div class="success-desc">请使用新密码登录</div>
          <van-button round block class="forgot-btn" @click="$router.push('/login')">去登录</van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { checkPhone, sendSmsCode, verifyCode, checkEmail, sendEmailCode, verifyEmailCode, resetPassword } from '../../api/member.js'

const router = useRouter()

const formRef = ref(null)
const type = ref('phone')
const step = ref(1)
const success = ref(false)

// 账号
const account = ref('')
const accountRules = computed(() => {
  if (type.value === 'phone') {
    return [{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]
  }
  return [{ required: true, message: '请输入邮箱地址' }, { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' }]
})

// 验证码
const code = ref('')
const countdown = ref(0)
let timer = null

// 密码
const showPwd = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')

// 加载状态
const verifyLoading = ref(false)
const submitting = ref(false)
const sendingCode = ref(false)

function handleBack() {
  if (step.value === 2 && !success.value) {
    step.value = 1
    return
  }
  router.back()
}

function switchType(t) {
  type.value = t
  step.value = 1
  account.value = ''
  code.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  success.value = false
  clearCountdown()
  formRef.value?.resetValidation()
}

function clearCountdown() {
  clearInterval(timer)
  countdown.value = 0
}

// ── 发送验证码：先检查账号是否存在，存在则发送 ──
async function sendCode() {
  if (countdown.value > 0 || sendingCode.value) return
  if (!account.value) return showToast(type.value === 'phone' ? '请输入手机号' : '请输入邮箱地址')

  sendingCode.value = true
  try {
    if (type.value === 'phone') {
      const exist = await checkPhone(account.value)
      if (!exist) { showToast('该手机号未注册'); return }
    } else {
      const exist = await checkEmail(account.value)
      if (!exist) { showToast('该邮箱未绑定'); return }
    }
    // 账号存在，发送验证码
    if (type.value === 'phone') {
      await sendSmsCode(account.value)
    } else {
      await sendEmailCode(account.value)
    }
    showToast('验证码已发送')
    startCountdown()
  } catch {
    showToast('验证失败')
  } finally {
    sendingCode.value = false
  }
}

function startCountdown() {
  clearCountdown()
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

// ── Step 1: 校验验证码，通过后进入 Step 2 ──
async function handleVerifyCode() {
  verifyLoading.value = true
  try {
    if (type.value === 'phone') {
      await verifyCode(account.value, code.value)
    } else {
      await verifyEmailCode(account.value, code.value)
    }
    step.value = 2
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    if (msg.includes('验证码')) showToast('验证码错误')
    else showToast('验证失败')
  } finally {
    verifyLoading.value = false
  }
}

// ── Step 2: 重置密码 ──
async function handleReset() {
  submitting.value = true
  try {
    const body = {
      code: code.value,
      newPassword: newPassword.value,
    }
    if (type.value === 'phone') {
      body.phone = account.value
    } else {
      body.email = account.value
    }
    await resetPassword(body)
    success.value = true
    step.value = 0
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    if (msg.includes('验证')) showToast('验证码已失效，请重新验证')
    else showToast('重置失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-forgot {
  min-height: 100vh;
  background: linear-gradient(135deg, #faf8f6 0%, #f5f3f0 100%);
}

/* ── 导航栏 ── */
.forgot-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: transparent;
}
.nav-back { font-size: 20px; color: #1a1a2e; cursor: pointer; padding: 4px; }
.nav-title { font-size: 16px; font-weight: 600; color: #1a1a2e; }
.nav-home { cursor: pointer; color: #5a5a6e; padding: 4px; }

/* ── 主体：卡片居中 ── */
.forgot-body {
  display: flex;
  justify-content: center;
  padding: 12px 16px 40px;
}
.forgot-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.06);
  padding: 32px 28px 24px;
}

/* ── 品牌 ── */
.forgot-brand {
  text-align: center;
  font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 20px;
}

/* ── Tab ── */
.tab-bar {
  display: flex;
  border-bottom: 1.5px solid #f0ece8;
  margin-bottom: 24px;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0 12px;
  font-size: 14px;
  color: #9a9aae;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}
.tab-item.active {
  color: #e8573a;
  font-weight: 600;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -1.5px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 3px;
  border-radius: 2px;
  background: #e8573a;
}

/* ── 步骤指示器（2步） ── */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}
.step-dot {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #c8c4c0;
  background: #f5f3f0;
  transition: all 0.3s;
}
.step-dot.active {
  background: #e8573a;
  color: #fff;
}
.step-dot.done {
  background: #07c160;
  color: #fff;
}
.step-line {
  width: 60px; height: 2px;
  background: #e0dcd8;
  margin: 0 6px;
  transition: background 0.3s;
}
.step-line.done { background: #07c160; }
.step-labels {
  display: flex;
  justify-content: center;
  gap: 50px;
  margin-bottom: 24px;
}
.step-label {
  font-size: 11px;
  color: #c8c4c0;
  transition: color 0.3s;
}
.step-label.active { color: #5a5a6e; font-weight: 500; }

/* ── 步骤内容 ── */
.step-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 6px;
}
.step-hint {
  font-size: 13px;
  color: #9a9aae;
  margin-bottom: 16px;
}
.step-form { margin-top: 8px; }

/* ── 表单 ── */
.field-group {
  margin-bottom: 16px;
}
.field-group :deep(.van-field) {
  border: 1.5px solid #e8e4e0;
  border-radius: 10px;
  padding: 4px 12px;
  transition: border-color 0.25s, box-shadow 0.25s;
  background: #faf8f6;
}
.field-group :deep(.van-field:focus-within) {
  border-color: #e8573a;
  box-shadow: 0 0 0 3px rgba(232,87,58,0.08);
  background: #fff;
}
.field-group :deep(.van-field__body) { font-size: 14px; }
.field-group :deep(.van-field__error-message) {
  color: #e8573a; font-size: 12px; padding-left: 2px;
}
.code-group :deep(.van-field) {
  padding-right: 4px;
}
.send-code-btn {
  white-space: nowrap;
  font-size: 13px;
  color: #e8573a;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: background 0.15s;
}
.send-code-btn:active { background: rgba(232,87,58,0.08); }
.send-code-btn.disabled { color: #c8c4c0; cursor: not-allowed; }
.send-code-btn.disabled:active { background: transparent; }

/* ── 按钮 ── */
.forgot-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  border-radius: 23px !important;
  box-shadow: 0 4px 14px rgba(232,87,58,0.3);
  margin-top: 8px;
}

/* ── 成功 ── */
.success-wrap {
  text-align: center;
  padding: 16px 0;
}
.success-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 12px 0 6px;
}
.success-desc {
  font-size: 14px;
  color: #9a9aae;
  margin-bottom: 24px;
}

.eye-icon { cursor: pointer; padding: 4px; }
</style>
