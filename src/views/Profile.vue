<template>
  <div class="page-profile">
    <van-nav-bar title="个人中心" />
    <div class="profile-content">
      <div class="avatar-section">
        <van-image round width="80" height="80" :src="memberInfo?.avatar || defaultAvatar" />
        <h2>{{ memberInfo?.realName || memberInfo?.username || '未设置昵称' }}</h2>
      </div>
      <div class="info-section">
        <van-cell-group>
          <van-cell title="用户名" :value="memberInfo?.username || '-'" />
        </van-cell-group>
      </div>
      <div class="logout-section">
        <van-button round block @click="doLogout" class="logout-btn">退出登录</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const memberInfo = userStore.memberInfo
const defaultAvatar = 'https://img.yzcdn.cn/vant/cat.jpeg'

function doLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.page-profile {
  min-height: 100vh;
  background: linear-gradient(180deg, #faf8f6 0%, #f5f3f0 100%);
}

.profile-content {
  padding: 24px 16px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.avatar-section h2 {
  margin: 0;
  font-size: 20px;
  color: #1a1a2e;
  font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
  font-weight: 600;
}

.info-section {
  margin-bottom: 24px;
}

.logout-section {
  padding: 0 16px;
}

.logout-btn {
  background: #fff !important;
  color: #e8573a !important;
  border: 1.5px solid #e8573a !important;
  font-weight: 600 !important;
}
</style>
