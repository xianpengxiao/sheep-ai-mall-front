<template>
  <div class="page-login">
    <NavBar title="登录">
      <template #left>
        <van-icon name="arrow-left" class="back-icon" @click="router.replace('/')" />
      </template>
    </NavBar>
    <div class="login-hero">
      <div class="login-brand">SheepAI Mall</div>
      <p class="login-desc">欢迎回来，登录您的账号</p>
    </div>
    <van-form @submit="onSubmit" class="login-form">
      <van-field
        v-model="form.username"
        name="username"
        label="用户名"
        placeholder="请输入用户名"
        :rules="[{ required: true, message: '请输入用户名' }]"
      />
      <van-field
        v-model="form.password"
        type="password"
        name="password"
        label="密码"
        placeholder="请输入密码"
        :rules="[{ required: true, message: '请输入密码' }]"
      />
      <div class="form-submit">
        <van-button round block native-type="submit" :loading="loading" class="login-btn">
          登录
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { login as loginApi } from '../../api/member.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const form = reactive({
  username: 'admin',
  password: '123456',
})

async function onSubmit() {
  loading.value = true
  try {
    const data = await loginApi(form.username, form.password)
    const accessToken = data?.accessToken
    if (accessToken) {
      const memberInfo = {
        userId: data.userId,
        username: data.username,
        realName: data.realName,
        avatar: data.avatar,
        roles: data.roles,
        permissions: data.permissions,
      }
      userStore.login(accessToken, memberInfo)
      router.push('/')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-login {
  min-height: 100vh;
  background: #fff;
}
.login-hero {
  text-align: center;
  padding: 32px 16px 24px;
}

.back-icon {
  font-size: 20px;
  color: #1a1a2e;
  padding: 4px;
}

.login-brand {
  font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.8px;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.login-desc {
  font-size: 14px;
  color: #9a9aae;
}

.login-form {
  padding: 0 16px;
}

.form-submit {
  margin-top: 32px;
  padding: 0 16px;
}

.login-btn {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 600 !important;
}
</style>
