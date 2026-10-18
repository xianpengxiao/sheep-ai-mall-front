<template>
  <div class="page-aftersale-my">
    <div class="nav-sticky">
      <NavBar title="退款/售后" />
    </div>

    <van-tabs v-model:active="activeTab" color="#e8573a" title-active-color="#e8573a" @change="loadList">
      <van-tab title="全部" name="" />
      <van-tab title="待处理" name="PENDING" />
      <van-tab title="已完结" name="APPROVED" />
      <van-tab title="已拒绝" name="REJECTED" />
    </van-tabs>

    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>
    <div v-else-if="list.length === 0" class="state-wrap">
      <van-empty description="暂无售后记录" />
    </div>

    <van-list
      v-else
      v-model:loading="loadingMore"
      :finished="finished"
      finished-text="没有更多了"
      @load="loadMore"
    >
      <div v-for="item in list" :key="item.id" class="as-card" @click="goOrder(item.orderId)">
        <div class="as-head">
          <span class="as-no">订单 {{ item.orderNo }}</span>
          <span class="as-status" :class="'st-' + item.status">{{ statusText(item.status) }}</span>
        </div>
        <!-- 订单商品明细 -->
        <div v-if="item.items && item.items.length" class="as-items">
          <div v-for="(it, ii) in item.items" :key="ii" class="as-item">
            <van-image v-if="it.image" :src="it.image" width="44" height="44" fit="cover" class="as-item-img" />
            <div class="as-item-info">
              <div class="as-item-name">{{ it.spuName || it.skuName }}</div>
              <div class="as-item-spec">{{ it.skuName }} ×{{ it.quantity }}</div>
            </div>
          </div>
        </div>
        <div class="as-row">
          <span class="as-label">类型</span>
          <span>{{ typeText(item.type) }}</span>
        </div>
        <div v-if="item.refundAmount != null" class="as-row">
          <span class="as-label">退款金额</span>
          <span class="as-amount">¥{{ Number(item.refundAmount).toFixed(2) }}</span>
        </div>
        <div v-if="item.reason" class="as-row">
          <span class="as-label">原因</span>
          <span class="as-reason">{{ item.reason }}</span>
        </div>
        <div v-if="item.status === 'REJECTED' && item.rejectReason" class="as-row">
          <span class="as-label">拒绝原因</span>
          <span class="as-reason">{{ item.rejectReason }}</span>
        </div>
        <div class="as-time">申请时间：{{ formatTime(item.createTime) }}</div>
      </div>
    </van-list>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import { getMyAfterSales } from '../../api/afterSale.js'

const router = useRouter()
const activeTab = ref('')
const loading = ref(true)
const loadingMore = ref(false)
const finished = ref(false)
const list = ref([])
let pageNum = 1

function typeText(t) {
  return { REFUND_ONLY: '仅退款', RETURN_REFUND: '退货退款', EXCHANGE: '换货' }[t] || t || '--'
}

function statusText(s) {
  return { PENDING: '待处理', APPROVED: '已完结', REJECTED: '已拒绝' }[s] || s || '--'
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function fetchPage(reset) {
  if (reset) { pageNum = 1; list.value = []; finished.value = false }
  const data = await getMyAfterSales({ pageNum, pageSize: 10, status: activeTab.value || undefined })
  const records = data?.records || []
  list.value.push(...records)
  if (!data || pageNum >= (data.pages || 1) || records.length < 10) finished.value = true
  pageNum++
}

async function loadList() {
  loading.value = true
  try { await fetchPage(true) } catch { /* 统一 toast */ } finally { loading.value = false }
}

async function loadMore() {
  loadingMore.value = true
  try { await fetchPage(false) } catch { finished.value = true } finally { loadingMore.value = false }
}

function goOrder(orderId) {
  if (orderId) router.push(`/order/detail/${orderId}`)
}

onMounted(loadList)
</script>

<style scoped>
.page-aftersale-my {
  min-height: 100vh;
  background: #f5f3f0;
}
.nav-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
}
.state-wrap {
  padding: 60px 0;
  text-align: center;
}
.as-card {
  margin: 10px 12px;
  padding: 14px;
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
}
.as-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.as-no {
  font-size: 13px;
  color: #9a9aae;
}
.as-status {
  font-size: 13px;
  font-weight: 600;
}
.as-status.st-PENDING { color: #c8a04a; }
.as-status.st-APPROVED { color: #07c160; }
.as-status.st-REJECTED { color: #9a9aae; }
.as-row {
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: #3a3a4a;
  margin-bottom: 6px;
}
.as-label {
  color: #9a9aae;
  flex-shrink: 0;
}
.as-amount {
  color: #e8573a;
  font-weight: 600;
}
.as-reason {
  word-break: break-all;
}
.as-time {
  margin-top: 8px;
  font-size: 11px;
  color: #bababa;
}
.as-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0 10px;
  margin-bottom: 8px;
  border-bottom: 1px dashed #f0ece8;
}
.as-item {
  display: flex;
  gap: 10px;
  align-items: center;
}
.as-item-img {
  border-radius: 6px;
  flex-shrink: 0;
}
.as-item-info {
  min-width: 0;
}
.as-item-name {
  font-size: 13px;
  color: #3a3a4a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.as-item-spec {
  font-size: 11px;
  color: #9a9aae;
  margin-top: 2px;
}
</style>
