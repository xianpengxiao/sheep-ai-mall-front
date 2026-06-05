<template>
  <div class="page-merchant-orders">
    <NavBar title="已卖出的宝贝" />

    <van-tabs v-model:active="activeTab" @change="onTabChange">
      <van-tab title="全部" name="all" />
      <van-tab title="待发货" name="1" />
      <van-tab title="已发货" name="2" />
      <van-tab title="已完成" name="3" />
    </van-tabs>

    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="fetchOrders">
      <div class="order-list">
        <div v-for="order in orderList" :key="order.id" class="order-item">
          <div class="order-header">
            <span class="order-no">订单号：{{ order.id }}</span>
            <span class="order-status" :class="'status-' + order.status">{{ statusLabel(order.status) }}</span>
          </div>
          <div class="order-info">
            <div class="order-user">
              <van-icon name="contact" size="14" color="#9a9aae" />
              {{ order.receiverName || '未知用户' }}
            </div>
            <div class="order-amount">¥{{ order.totalAmount || '0.00' }}</div>
          </div>
        </div>
      </div>
      <van-empty v-if="!loading && orderList.length === 0" description="暂无订单" />
    </van-list>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NavBar from '../../components/NavBar.vue'
import { getOrderList } from '../../api/order.js'

const STATUS_MAP = { 0: '待付款', 1: '待发货', 2: '已发货', 3: '已完成', 4: '已取消' }
function statusLabel(s) { return STATUS_MAP[s] || '未知' }

const activeTab = ref('all')
const loading = ref(false)
const finished = ref(false)
const orderList = ref([])
const pageNum = ref(1)

function onTabChange() {
  orderList.value = []
  pageNum.value = 1
  finished.value = false
}

async function fetchOrders() {
  try {
    const params = { pageNum: pageNum.value, pageSize: 10 }
    if (activeTab.value !== 'all') params.status = activeTab.value
    const res = await getOrderList(params)
    const records = res?.records || []
    orderList.value.push(...records)
    pageNum.value++
    if (records.length < 10) finished.value = true
  } catch {
    finished.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-merchant-orders {
  min-height: 100vh;
  background: #fff;
}
.order-list {
  padding: 0 16px;
}
.order-item {
  padding: 14px 0;
  border-bottom: 1px solid #f0ece8;
}
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.order-no {
  font-size: 12px;
  color: #9a9aae;
}
.order-status {
  font-size: 13px;
  font-weight: 600;
}
.order-status.status-0 { color: #f39c12; }
.order-status.status-1 { color: #e8573a; }
.order-status.status-2 { color: #1989fa; }
.order-status.status-3 { color: #07c160; }
.order-status.status-4 { color: #9a9aae; }
.order-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.order-user {
  font-size: 14px;
  color: #5a5a6e;
  display: flex;
  align-items: center;
  gap: 4px;
}
.order-amount {
  font-size: 16px;
  font-weight: 700;
  color: #e8573a;
}
</style>
