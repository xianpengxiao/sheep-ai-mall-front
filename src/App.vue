<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <van-tabbar
      v-if="showTabbar"
      v-model="activeTab"
      route
      active-color="#e8573a"
      inactive-color="#9a9aae"
      placeholder
      safe-area-inset-bottom
      class="app-tabbar"
    >
      <van-tabbar-item to="/" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/cart" icon="shopping-cart-o" :badge="cartBadge > 0 ? cartBadge : ''">购物车</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">个人中心</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
  import { computed, onMounted, onUnmounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { useUserStore } from './stores/user.js'

  const route = useRoute()
  const userStore = useUserStore()

  // 监听 401 退出事件（来自 request.js）
  function onAuthLogout() { userStore.logout() }
  onMounted(() => window.addEventListener('auth:logout', onAuthLogout))
  onUnmounted(() => window.removeEventListener('auth:logout', onAuthLogout))

  const showTabbar = computed(() => !!route.meta.showTabbar)

  const activeTab = computed(() => {
    const nameMap = { Home: 0, Cart: 1, Profile: 2 }
    return nameMap[route.name] ?? 0
  })

  const cartBadge = computed(() => 0)
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

.app-tabbar {
  background: var(--surface, #fff) !important;
  border-top: 1px solid var(--border, #eeeae6) !important;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.03);
}
</style>
