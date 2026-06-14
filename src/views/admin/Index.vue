<template>
  <div class="page-admin">
    <NavBar title="管理中心" />

    <!-- Tab 导航栏 -->
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
      <SystemTab v-if="activeTab === 'sys'" />
      <GoodsManageTab v-if="activeTab === 'goods'" />
      <MerchantTab v-if="activeTab === 'merchant'" />
      <ReviewTab v-if="activeTab === 'review'" />
      <FundTab v-if="activeTab === 'fund'" />
      <CategoryTab v-if="activeTab === 'category'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NavBar from '../../components/NavBar.vue'
import SystemTab from './tabs/SystemTab.vue'
import GoodsManageTab from './tabs/GoodsManageTab.vue'
import MerchantTab from './tabs/MerchantTab.vue'
import ReviewTab from './tabs/ReviewTab.vue'
import FundTab from './tabs/FundTab.vue'
import CategoryTab from './tabs/CategoryTab.vue'

const activeTab = ref('sys')

const tabs = [
  { key: 'sys', label: '系统管理' },
  { key: 'goods', label: '商品管理' },
  { key: 'merchant', label: '商家管理' },
  { key: 'review', label: '评价管理' },
  { key: 'fund', label: '资金管理' },
  { key: 'category', label: '分类管理' },
]
</script>

<style scoped>
.page-admin {
  min-height: 100vh;
  background: #f5f3f0;
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
