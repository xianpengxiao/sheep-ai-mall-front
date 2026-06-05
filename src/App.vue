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

  const userStore = useUserStore()

  // 监听 401 退出事件（来自 request.js）
  function onAuthLogout() { userStore.logout() }
  onMounted(() => window.addEventListener('auth:logout', onAuthLogout))
  onUnmounted(() => window.removeEventListener('auth:logout', onAuthLogout))
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
