<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
  import { onMounted, onUnmounted } from 'vue'
  import { useUserStore } from './stores/user.js'
  import { getCurrentUser } from './api/member.js'

  const userStore = useUserStore()

  // 监听 401 退出事件（来自 request.js）
  function onAuthLogout() { userStore.logout() }
  onMounted(() => window.addEventListener('auth:logout', onAuthLogout))
  onUnmounted(() => window.removeEventListener('auth:logout', onAuthLogout))

  // 启动时验证 token：若有 token 则刷新用户信息（含 roles/permissions）
  onMounted(async () => {
    if (userStore.token) {
      try {
        const info = await getCurrentUser()
        userStore.setMemberInfo(info)
      } catch {
        // 401 时拦截器会自动 dispatch auth:logout 清除状态
      }
    }
  })
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
}

#app {
  min-height: 100vh;
  background: transparent;
}
</style>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
}
</style>
