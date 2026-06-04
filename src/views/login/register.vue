<template>
  <div class="page-register">
    <NavBar title="注册" />
    <div class="register-hero">
      <div class="register-brand">SheepAI Mall</div>
      <p class="register-desc">创建您的账号</p>
    </div>
    <van-form @submit="onSubmit" class="register-form">
      <van-field
        v-model="form.username"
        name="username"
        label="用户名"
        placeholder="请输入用户名"
        :rules="[{ required: true, message: '请输入用户名' }]"
      />
      <van-field
        v-model="form.realName"
        name="realName"
        label="昵称"
        placeholder="请输入昵称（选填）"
      />
      <van-field
        v-model="form.phone"
        name="phone"
        label="手机号"
        placeholder="请输入手机号（选填）"
        type="tel"
      />
      <van-field
        v-model="form.password"
        type="password"
        name="password"
        label="密码"
        placeholder="请输入密码"
        :rules="[{ required: true, message: '请输入密码' }]"
      />
      <van-field
        v-model="form.confirmPwd"
        type="password"
        name="confirmPwd"
        label="确认密码"
        placeholder="请再次输入密码"
        :rules="[
          { required: true, message: '请确认密码' },
          { validator: (v) => v === form.password, message: '两次密码不一致' },
        ]"
      />
      <div class="form-submit">
        <van-button round block native-type="submit" :loading="loading" class="register-btn">
          注册
        </van-button>
      </div>
      <div class="form-footer">
        已有账号？
        <router-link to="/login" class="link-login">去登录</router-link>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { register as registerApi } from '../../api/member.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()

const loading = ref(false)
const form = reactive({
  username: '',
  realName: '',
  phone: '',
  password: '',
  confirmPwd: '',
})

async function onSubmit() {
  loading.value = true
  try {
    const { confirmPwd, ...data } = form
    await registerApi(data)
    showToast('注册成功')
    router.push('/login')
  } catch {
    // 后端已通过拦截器弹 toast
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-register {
  min-height: 100vh;
  background: #fff;
}
.register-hero {
  text-align: center;
  padding: 28px 16px 20px;
}
.register-brand {
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
.register-desc {
  font-size: 14px;
  color: #9a9aae;
}
.register-form {
  padding: 0 16px;
}
.form-submit {
  margin-top: 32px;
  padding: 0 16px;
}
.register-btn {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 600 !important;
}
.form-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #9a9aae;
}
.link-login {
  color: #e8573a;
  text-decoration: none;
  font-weight: 500;
}
</style>
