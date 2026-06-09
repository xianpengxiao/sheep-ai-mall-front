<template>
  <div class="page-login">
    <!-- 顶部导航 -->
    <div class="login-nav">
      <van-icon name="arrow-left" class="nav-back" @click="handleBack" />
      <span class="nav-title">登录</span>
      <van-icon name="home-o" size="20" class="nav-home" @click="$router.push('/')" />
    </div>

    <div class="login-body">
      <div class="login-card">
        <!-- 品牌 -->
        <div class="login-brand">SheepAI Mall</div>

        <!-- Tab 切换 -->
        <div class="tab-bar">
          <span class="tab-item" :class="{ active: loginType === 'password' }" @click="loginType = 'password'">密码登录</span>
          <span class="tab-item" :class="{ active: loginType === 'sms' }" @click="loginType = 'sms'">短信验证码登录</span>
        </div>

        <!-- ═══════ 密码登录 ═══════ -->
        <van-form v-if="loginType === 'password'" @submit="onPasswordLogin" class="login-form">
          <div class="field-group">
            <van-field
              v-model="passwordForm.username"
              name="username"
              placeholder="账号名/手机号/邮箱"
              :rules="usernameRules"
              clearable
            />
          </div>

          <div class="field-group">
            <van-field
              v-model="passwordForm.password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              placeholder="密码"
              :rules="passwordRules"
              clearable
            >
              <template #button>
                <van-icon
                  :name="showPassword ? 'eye-o' : 'closed-eye'"
                  size="18"
                  color="#c8c4c0"
                  class="eye-icon"
                  @click="showPassword = !showPassword"
                />
              </template>
            </van-field>
          </div>

          <div class="options-row">
            <van-checkbox v-model="rememberMe" shape="square" size="13" checked-color="#e8573a">
              <span class="remember-text">记住我</span>
            </van-checkbox>
          </div>

          <van-button round block native-type="submit" :loading="loading" class="login-btn">登录</van-button>
        </van-form>

        <!-- ═══════ 短信登录 ═══════ -->
        <van-form v-else @submit="onSmsLogin" class="login-form">
          <div class="field-group">
            <van-field
              v-model="smsForm.phone"
              name="phone"
              placeholder="手机号"
              :rules="smsPhoneRules"
              clearable
              maxlength="11"
              type="tel"
            />
          </div>

          <div class="field-group code-field-group">
            <van-field
              v-model="smsForm.code"
              name="code"
              placeholder="短信验证码"
              :rules="smsCodeRules"
              maxlength="6"
              clearable
              class="code-input"
            >
              <template #button>
                <span class="code-btn" :class="{ disabled: codeCountdown > 0 }" @click="handleSendCode">
                  {{ codeCountdown > 0 ? codeCountdown + 's' : '获取验证码' }}
                </span>
              </template>
            </van-field>
          </div>

          <van-button round block native-type="submit" :loading="loading" class="login-btn">登录</van-button>
        </van-form>

        <!-- 底部功能链接 -->
        <div class="bottom-links">
          <span class="bottom-link" @click="handleThirdLogin('wechat')">
            <van-icon name="wechat" size="16" color="#07c160" /> 微信
          </span>
          <span class="link-divider">|</span>
          <span class="bottom-link" @click="handleThirdLogin('qq')">
            <van-icon name="qq" size="16" color="#1989fa" /> QQ
          </span>
          <span class="link-divider">|</span>
          <span class="bottom-link" @click="$router.push('/forgot')">忘记密码</span>
          <span class="link-divider">|</span>
          <router-link to="/register" class="bottom-link register-link">立即注册</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../../stores/user.js'
import { login as loginApi, sendSmsCode, smsLogin } from '../../api/member.js'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginType = ref('password')
const loading = ref(false)
const showPassword = ref(false)
const codeCountdown = ref(0)
let countdownTimer = null

const passwordForm = reactive({ username: '', password: '' })
const smsForm = reactive({ phone: '', code: '' })

// 记住我
const REMEMBER_KEY = 'remembered_user'
const rememberMe = ref(!!localStorage.getItem(REMEMBER_KEY))
watch(rememberMe, (val) => { if (!val) localStorage.removeItem(REMEMBER_KEY) })
const saved = localStorage.getItem(REMEMBER_KEY)
if (saved) {
  try { const p = JSON.parse(saved); if (p.username) passwordForm.username = p.username } catch { /* ignore */ }
}

// 校验规则
const phoneRegex = /^1[3-9]\d{9}$/
const usernameRules = [
  { required: true, message: '请输入账号名/手机号/邮箱' },
  { validator: (val) => { if (!val || !/^\d+$/.test(val)) return true; return phoneRegex.test(val) || '手机号格式不正确' }, trigger: 'onBlur' },
]
const passwordRules = [
  { required: true, message: '请输入密码' },
  { validator: (val) => !val || val.length >= 6 || '密码长度不能少于6位', trigger: 'onBlur' },
]
const smsPhoneRules = [
  { required: true, message: '请输入手机号' },
  { pattern: phoneRegex, message: '手机号格式不正确', trigger: 'onBlur' },
]
const smsCodeRules = [
  { required: true, message: '请输入验证码' },
  { pattern: /^\d{4,6}$/, message: '验证码为4-6位数字', trigger: 'onBlur' },
]

async function onPasswordLogin() {
  if (loading.value) return
  loading.value = true
  try {
    const data = await loginApi(passwordForm.username, passwordForm.password)
    handleLoginSuccess(data)
  } catch (e) {
    showToast(e?.response?.data?.msg || e?.message || '登录失败，请检查账号密码')
  } finally { loading.value = false }
}

async function onSmsLogin() {
  if (loading.value) return
  loading.value = true
  try {
    const data = await smsLogin(smsForm.phone, smsForm.code)
    handleLoginSuccess(data)
  } catch (e) {
    showToast(e?.response?.data?.msg || e?.message || '登录失败')
  } finally { loading.value = false }
}

async function handleSendCode() {
  if (codeCountdown.value > 0) return
  if (!phoneRegex.test(smsForm.phone)) return showToast('请输入正确的手机号')
  try {
    await sendSmsCode(smsForm.phone)
    showToast('验证码已发送')
    codeCountdown.value = 60
    countdownTimer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) { clearInterval(countdownTimer); countdownTimer = null }
    }, 1000)
  } catch (e) {
    showToast(e?.response?.data?.msg || '发送失败，请稍后重试')
  }
}

function handleLoginSuccess(data) {
  const accessToken = data?.accessToken
  if (!accessToken) return showToast('登录失败，请重试')
  userStore.login(accessToken, {
    userId: data.userId, username: data.username, realName: data.realName,
    avatar: data.avatar, roles: data.roles, permissions: data.permissions,
  })
  if (rememberMe.value && passwordForm.username) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username: passwordForm.username }))
  }
  router.replace(route.query.redirect || '/')
}

function handleBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

function handleThirdLogin(provider) {
  showToast(provider === 'wechat' ? '微信登录开发中' : 'QQ登录开发中')
}
</script>

<style scoped>
.page-login {
  min-height: 100vh;
  background: linear-gradient(135deg, #faf8f6 0%, #f5f3f0 100%);
}

/* ── 顶部导航 ── */
.login-nav {
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
.login-body {
  display: flex;
  justify-content: center;
  padding: 12px 16px 40px;
}
.login-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.06);
  padding: 32px 28px 24px;
}

/* ── 品牌 ── */
.login-brand {
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

/* ── 表单 ── */
.login-form { }
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

/* 验证码输入框 + 按钮同行 */
.code-field-group :deep(.van-field) {
  padding-right: 4px;
}
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

/* ── 选项行 ── */
.options-row {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.remember-text { font-size: 12px; color: #9a9aae; }

/* ── 登录按钮 ── */
.login-btn {
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

/* ── 底部链接 ── */
.bottom-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-top: 28px;
  font-size: 13px;
  flex-wrap: wrap;
}
.bottom-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  padding: 4px 6px;
  color: #5a5a6e;
  text-decoration: none;
  transition: color 0.15s;
}
.bottom-link:active { color: #e8573a; }
.register-link { color: #e8573a; font-weight: 600; }
.link-divider { color: #e0dcd8; margin: 0 2px; font-size: 12px; }
</style>
