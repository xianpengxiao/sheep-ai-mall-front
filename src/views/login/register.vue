<template>
  <div class="page-register">
    <!-- 顶部导航 -->
    <div class="register-nav">
      <van-icon name="arrow-left" class="nav-back" @click="handleBack" />
      <span class="nav-title">注册</span>
      <van-icon name="home-o" size="20" class="nav-home" @click="$router.push('/')" />
    </div>

    <div class="register-body">
      <div class="register-card">
        <div class="register-brand">SheepAI Mall</div>

        <!-- 步骤指示器 -->
        <div class="step-indicator">
          <div class="step-dot" :class="{ active: step >= 1, done: step > 1 }">1</div>
          <div class="step-line" :class="{ done: step > 1 }"></div>
          <div class="step-dot" :class="{ active: step >= 2, done: step > 2 }">2</div>
        </div>
        <div class="step-labels">
          <span class="step-label" :class="{ active: step >= 1 }">{{ registerMode === 'phone' ? '手机验证' : '邮箱验证' }}</span>
          <span class="step-label" :class="{ active: step >= 2 }">填写账号</span>
        </div>

        <!-- ══════ Step 1: 手机/邮箱 验证 ══════ -->
        <template v-if="step === 1">
          <!-- 注册方式切换 -->
          <div class="mode-tabs">
            <span class="mode-tab" :class="{ active: registerMode === 'phone' }" @click="switchMode('phone')">手机验证</span>
            <span class="mode-tab" :class="{ active: registerMode === 'email' }" @click="switchMode('email')">邮箱验证</span>
          </div>
          <div class="step-title">{{ registerMode === 'phone' ? '验证手机号' : '验证邮箱' }}</div>
          <van-form @submit="handleStep1" ref="form1Ref" class="step-form">
            <!-- 手机号输入 -->
            <div class="field-group" v-if="registerMode === 'phone'">
              <van-field
                v-model="phone"
                name="phone"
                placeholder="手机号"
                :rules="[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]"
                clearable
                maxlength="11"
                type="tel"
              />
            </div>
            <!-- 邮箱输入 -->
            <div class="field-group" v-else>
              <van-field
                v-model="email"
                name="email"
                placeholder="邮箱地址"
                :rules="[{ required: true, message: '请输入邮箱' }, { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' }]"
                clearable
                type="email"
              />
            </div>
            <div class="field-group code-group">
              <van-field
                v-model="code"
                name="code"
                :placeholder="registerMode === 'phone' ? '请输入6位验证码' : '请输入邮箱验证码'"
                :rules="codeRules"
                maxlength="6"
                clearable
                class="code-field"
              >
                <template #button>
                  <span class="code-btn" :class="{ disabled: codeCountdown > 0 || step1Loading }" @click="handleSendCode">
                    {{ codeCountdown > 0 ? codeCountdown + 's' : codeSent ? '重新发送' : '获取验证码' }}
                  </span>
                </template>
              </van-field>
            </div>
            <van-button round block native-type="submit" class="step-btn" :loading="step1Loading">下一步</van-button>
          </van-form>
        </template>

        <!-- ══════ Step 2: 填写账号信息 ══════ -->
        <template v-if="step === 2">
          <div class="step-title">设置账号信息</div>
          <van-form @submit="handleStep2" ref="form2Ref" class="step-form">
            <div class="field-group">
              <van-field
                v-model="registerForm.username"
                name="username"
                placeholder="账号（必填，3-64字符）"
                :rules="[
                  { required: true, message: '请输入账号' },
                  { pattern: /^.{3,64}$/, message: '账号长度为3-64字符' },
                ]"
                clearable
              />
            </div>
            <div class="field-group">
              <van-field
                v-model="registerForm.password"
                :type="showPwd ? 'text' : 'password'"
                name="password"
                placeholder="密码（必填，6-32位）"
                :rules="[
                  { required: true, message: '请输入密码' },
                  { pattern: /^.{6,32}$/, message: '密码长度为6-32位' },
                ]"
                clearable
              >
                <template #button>
                  <van-icon :name="showPwd ? 'eye-o' : 'closed-eye'" size="18" color="#c8c4c0" class="eye-icon" @click="showPwd = !showPwd" />
                </template>
              </van-field>
            </div>
            <div class="field-group">
              <van-field
                v-model="registerForm.confirmPwd"
                :type="showPwd ? 'text' : 'password'"
                name="confirmPwd"
                placeholder="确认密码"
                :rules="[
                  { required: true, message: '请确认密码' },
                  { validator: (v) => v === registerForm.password, message: '两次密码不一致' },
                ]"
                clearable
              />
            </div>
            <div class="field-group">
              <van-field
                v-model="registerForm.realName"
                name="realName"
                placeholder="真实姓名（选填）"
                clearable
              />
            </div>
            <!-- 手机号/邮箱固定显示 -->
            <div class="phone-display">{{ registerMode === 'phone' ? '手机号' : '邮箱' }}：{{ maskedContact }}</div>
            <van-button round block native-type="submit" class="step-btn" :loading="step2Loading">完成注册</van-button>
          </van-form>
          <div class="step-back" @click="cancelRegister">取消注册</div>
        </template>

        <!-- 底部 -->
        <div class="register-footer">
          已有账号？<router-link to="/login" class="link-login">去登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { checkPhone, sendRegisterCode, verifyCode, sendEmailCode, verifyEmailCode, register as registerApi } from '../../api/member.js'

const router = useRouter()

const step = ref(1)
const registerMode = ref('phone') // 'phone' | 'email'

// Step 1
const phone = ref('')
const email = ref('')
const code = ref('')
const codeCountdown = ref(0)
const codeSent = ref(false)
const codeRules = computed(() => {
  if (!codeSent.value) return []
  return [
    { required: true, message: '请输入验证码' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字' },
  ]
})
const step1Loading = ref(false)
let countdownTimer = null

// Step 2
const step2Loading = ref(false)
const showPwd = ref(false)
const registerForm = reactive({
  username: '',
  password: '',
  confirmPwd: '',
  realName: '',
  email: '',
})

const maskedContact = ref('')

// ── 切换注册方式 ──
function switchMode(mode) {
  if (step.value !== 1) return // 仅第一步可切换
  registerMode.value = mode
  code.value = ''
  codeSent.value = false
}

// ── Step 1: 处理发送验证码 ──
async function handleSendCode() {
  if (codeCountdown.value > 0 || step1Loading.value) return
  if (registerMode.value === 'phone') {
    if (!/^1[3-9]\d{9}$/.test(phone.value)) {
      showToast('请输入正确的手机号')
      return
    }
  } else {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      showToast('请输入正确的邮箱地址')
      return
    }
  }
  step1Loading.value = true
  try {
    if (registerMode.value === 'phone') {
      const exists = await checkPhone(phone.value)
      if (exists) {
        showToast('该手机号已注册')
        return
      }
      await sendRegisterCode(phone.value)
      maskedContact.value = phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    } else {
      await sendEmailCode(email.value)
      maskedContact.value = email.value.replace(/^(.{2}).+(.{2}@.+)$/, '$1****$2')
    }
    // 后台发送成功后才开始计时
    showToast('验证码已发送')
    startCountdown()
    codeSent.value = true
  } catch (e) {
    // 拦截器已弹 toast
  } finally {
    step1Loading.value = false
  }
}

// ── Step 1: 提交（校验验证码 → 进入 Step 2） ──
async function handleStep1() {
  if (!codeSent.value) {
    showToast('请先获取验证码')
    return
  }
  if (!/^\d{6}$/.test(code.value)) {
    showToast('请输入6位验证码')
    return
  }
  step1Loading.value = true
  try {
    let ok
    if (registerMode.value === 'phone') {
      ok = await verifyCode(phone.value, code.value)
    } else {
      ok = await verifyEmailCode(email.value, code.value)
    }
    if (ok) {
      step.value = 2
    } else {
      showToast('验证码错误')
    }
  } catch (e) {
    showToast(e?.response?.data?.msg || '验证失败')
  } finally {
    step1Loading.value = false
  }
}

// ── 倒计时 ──
function startCountdown() {
  codeCountdown.value = 60
  countdownTimer = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

// ── Step 2: 提交注册 ──
async function handleStep2() {
  step2Loading.value = true
  try {
    const { confirmPwd, ...data } = registerForm
    if (registerMode.value === 'phone') {
      await registerApi({ ...data, phone: phone.value })
    } else {
      await registerApi({ ...data, email: email.value })
    }
    onRegisterDone()
  } catch (e) {
    // 后端已通过拦截器弹 toast
  } finally {
    step2Loading.value = false
  }
}

function onRegisterDone() {
  showToast('注册成功')
  router.push('/login')
}

function cancelRegister() {
  step.value = 1
  code.value = ''
  codeSent.value = false
  registerForm.username = ''
  registerForm.password = ''
  registerForm.confirmPwd = ''
  registerForm.realName = ''
  registerForm.email = ''
}

function handleBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

// keep-alive 缓存导致再次进入时仍显示 Step 2，每次激活都重置到 Step 1
onActivated(() => { cancelRegister() })
</script>

<style scoped>
.page-register {
  min-height: 100vh;
  background: linear-gradient(135deg, #faf8f6 0%, #f5f3f0 100%);
}

/* ── 顶部导航 ── */
.register-nav {
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
.register-body {
  display: flex;
  justify-content: center;
  padding: 12px 16px 40px;
}
.register-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.06);
  padding: 28px 28px 20px;
}

/* ── 品牌 ── */
.register-brand {
  text-align: center;
  font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 24px;
}

/* ── 注册方式切换 ── */
.mode-tabs { display: flex; border-radius: 8px; background: #f0ece8; padding: 3px; margin-bottom: 16px; }
.mode-tab { flex: 1; text-align: center; padding: 6px 0; font-size: 13px; font-weight: 500; color: #9a9aae; border-radius: 6px; cursor: pointer; transition: all 0.25s; user-select: none; }
.mode-tab.active { background: #fff; color: #1a1a2e; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

/* ── 步骤指示器（2步） ── */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
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
  background: #f0ece8;
  transition: all 0.3s;
}
.step-dot.active {
  color: #fff;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  box-shadow: 0 2px 8px rgba(232,87,58,0.3);
}
.step-dot.done {
  color: #fff;
  background: #07c160;
}
.step-line {
  width: 60px; height: 2px;
  background: #f0ece8;
  transition: background 0.3s;
}
.step-line.done { background: #07c160; }
.step-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 4px;
  margin-bottom: 24px;
}
.step-label {
  font-size: 11px;
  color: #c8c4c0;
  transition: color 0.3s;
}
.step-label.active { color: #5a5a6e; font-weight: 500; }

/* ── 步骤标题 ── */
.step-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 16px;
}
.step-hint {
  font-size: 13px;
  color: #9a9aae;
  margin-bottom: 16px;
  margin-top: -10px;
}

/* ── 表单 ── */
.step-form { }
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

/* 验证码输入 */
.code-group :deep(.van-field) { padding-right: 4px; }
.code-btn {
  font-size: 13px;
  color: #e8573a;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: background 0.15s;
}
.code-btn:active { background: rgba(232,87,58,0.08); }
.code-btn.disabled { color: #c8c4c0; cursor: not-allowed; }
.code-btn.disabled:active { background: transparent; }
.eye-icon { cursor: pointer; padding: 4px; }

/* 固定手机号显示 */
.phone-display {
  font-size: 13px;
  color: #9a9aae;
  text-align: center;
  padding: 8px 0 16px;
}

/* ── 按钮 ── */
.step-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  border-radius: 23px !important;
  box-shadow: 0 4px 14px rgba(232,87,58,0.3);
}

/* ── 返回 ── */
.step-back {
  text-align: center;
  font-size: 13px;
  color: #9a9aae;
  cursor: pointer;
  padding: 16px 0 0;
}
.step-back:active { color: #e8573a; }

/* ── 底部 ── */
.register-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #9a9aae;
}
.link-login {
  color: #e8573a;
  text-decoration: none;
  font-weight: 600;
}
</style>
