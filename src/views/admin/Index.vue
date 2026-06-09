<template>
  <div class="page-admin">
    <!-- 顶部导航，与首页风格一致 -->
    <div class="admin-topbar">
      <div class="admin-brand">SheepAI Mall</div>
      <div class="admin-user">
        <span class="admin-user-name">{{ userStore.memberInfo?.realName || userStore.memberInfo?.username || '管理员' }}</span>
        <van-image v-if="userStore.memberInfo?.avatar" :src="userStore.memberInfo.avatar" round width="30" height="30" />
        <van-icon v-else name="user-o" size="18" />
      </div>
    </div>

    <!-- Tab 导航栏（与首页 nav-item 风格一致） -->
    <div class="admin-tab-bar">
      <span
        v-for="tab in tabs"
        :key="tab.key"
        class="admin-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</span>
    </div>

    <!-- Tab 内容区 -->
    <div class="admin-content">
      <SystemTab v-show="activeTab === 'sys'" />
      <GoodsAuditTab v-show="activeTab === 'goods'" />
      <MerchantTab v-show="activeTab === 'merchant'" />
      <ReviewTab v-show="activeTab === 'review'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '../../stores/user.js'
import SystemTab from './tabs/SystemTab.vue'
import GoodsAuditTab from './tabs/GoodsAuditTab.vue'
import MerchantTab from './tabs/MerchantTab.vue'
import ReviewTab from './tabs/ReviewTab.vue'

const userStore = useUserStore()
const activeTab = ref('sys')

const tabs = [
  { key: 'sys', label: '系统管理' },
  { key: 'goods', label: '商品管理' },
  { key: 'merchant', label: '商家管理' },
  { key: 'review', label: '评价管理' },
]
</script>

<style scoped>
.page-admin {
  min-height: 100vh;
  background: #f5f3f0;
}

/* ── 顶部栏 ── */
.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}
.admin-brand {
  font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.8px;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.admin-user {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #5a5a6e;
}

/* ── Tab 栏 ── */
.admin-tab-bar {
  display: flex;
  gap: 32px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1.5px solid #eeeae6;
}
.admin-tab {
  font-size: 14px;
  font-weight: 500;
  color: #5a5a6e;
  cursor: pointer;
  padding: 12px 0 10px;
  border-bottom: 2px solid transparent;
  transition: color 0.2s;
  user-select: none;
}
.admin-tab:hover { color: #1a1a2e; }
.admin-tab.active {
  color: #1a1a2e;
  font-weight: 600;
  border-bottom-color: #e8573a;
}

/* ── 内容区 ── */
.admin-content {
  padding: 20px 24px;
}
</style>
