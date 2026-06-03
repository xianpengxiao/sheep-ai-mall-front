<template>
  <div class="page-order-list">
    <div class="nav-sticky">
      <NavBar title="我的订单" />
    </div>

    <!-- ═══════ 状态标签 ═══════ -->
    <div class="tabs-sticky">
      <van-tabs v-model:active="activeTab" @change="onTabChange" color="#e8573a" title-active-color="#e8573a" sticky>
        <van-tab title="所有订单" name="all" />
        <van-tab title="待付款" name="0" />
        <van-tab title="待发货" name="1" />
        <van-tab title="待收货" name="2" />
        <van-tab title="已完成" name="3" />
      </van-tabs>
    </div>

    <!-- ═══════ 加载中 ═══════ -->
    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <!-- ═══════ 空状态 ═══════ -->
    <div v-else-if="list.length === 0" class="state-wrap">
      <van-empty description="暂无订单" />
    </div>

    <!-- ═══════ 订单列表 ═══════ -->
    <template v-else>
      <div class="order-list">
        <div v-for="order in list" :key="order.id" class="order-card">
          <!-- ── 订单头部 ── -->
          <div class="order-header" @click="goDetail(order.id)">
            <div class="header-left">
              <span class="header-date">{{ formatTime(order.createTime) }}</span>
              <span class="header-id">订单号：{{ order.orderNo || order.id }}</span>
            </div>
            <div class="header-status" :class="'s-' + order.status">{{ statusLabel(order.status) }}</div>
          </div>

          <!-- ── 商品列表 ── -->
          <div class="order-items">
            <div
              v-for="(item, i) in orderItems(order)"
              :key="i"
              class="order-item"
              @click="goGoods(item.spuId)"
            >
              <van-image
                :src="item.image || item.skuImage"
                width="64"
                height="64"
                fit="cover"
                class="item-thumb"
              />
              <div class="item-info">
                <div class="item-name van-multi-ellipsis--l2">{{ item.spuName || item.skuName }}</div>
                <div class="item-spec" v-if="item.skuName && item.skuName !== item.spuName">{{ item.skuName }}</div>
              </div>
            </div>
          </div>

          <!-- ── 金额合计 ── -->
          <div class="order-summary">
            <span class="summary-text">共 {{ itemCount(order) }} 件商品 合计</span>
            <span class="summary-amount">
              实付：<em class="amount-num">&yen;{{ formatPrice(order.totalAmount) }}</em>
            </span>
          </div>

          <!-- ── 操作按钮 ── -->
          <div class="order-actions">
            <template v-if="order.status === 0">
              <van-button round size="small" plain class="action-btn" @click="handleCancel(order)">取消订单</van-button>
              <van-button round size="small" type="primary" class="action-btn primary" @click="goPay(order)">立即付款</van-button>
            </template>
            <template v-else-if="order.status === 1">
              <van-button round size="small" plain class="action-btn" @click="goDetail(order.id)">查看详情</van-button>
            </template>
            <template v-else-if="order.status === 2">
              <van-button round size="small" plain class="action-btn" @click="goLogistics(order.id)">查看物流</van-button>
              <van-button round size="small" plain class="action-btn" @click="goDetail(order.id)">确认收货</van-button>
            </template>
            <template v-else-if="order.status === 3">
              <van-button round size="small" plain class="action-btn" @click="goReview(order)">评价</van-button>
              <van-button round size="small" plain class="action-btn" @click="goDetail(order.id)">查看详情</van-button>
            </template>
            <template v-else-if="order.status === 4">
              <van-button round size="small" plain class="action-btn" @click="goDetail(order.id)">查看详情</van-button>
            </template>
            <!-- 再买一单 -->
            <van-button
              round
              size="small"
              class="action-btn rebuy"
              @click="handleRebuy(order)"
            >再买一单</van-button>
          </div>
        </div>
      </div>

      <!-- ── 分页 ── -->
      <div class="pagination-wrap" v-if="totalPages > 1">
        <van-pagination
          v-model="pageNum"
          :total-items="total"
          :items-per-page="pageSize"
          @change="fetchOrders"
          mode="simple"
          prev-text="上一页"
          next-text="下一页"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showConfirmDialog, showLoadingToast, closeToast } from 'vant'
import { getOrderList, cancelOrder } from '../../api/order.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()
const route = useRoute()

const activeTab = ref('all')
const list = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

// ── 状态标签映射 ──
const statusMap = { 0: '待付款', 1: '待发货', 2: '待收货', 3: '已完成', 4: '已取消' }
function statusLabel(status) {
  return statusMap[status] || '未知'
}

// ── 工具 ──
function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 兼容不同后端字段名获取订单商品列表
function orderItems(order) {
  return order.items || order.orderItems || order.orderItemList || order.itemList || []
}

function itemCount(order) {
  return orderItems(order).reduce((s, i) => s + (i.quantity || 0), 0)
}

// ── 获取状态筛选参数 ──
function getStatusFilter() {
  const tab = activeTab.value
  if (tab === 'all') return undefined
  return Number(tab)
}

// ── 加载订单 ──
async function fetchOrders() {
  window.scrollTo(0, 0)
  loading.value = true
  try {
    const params = { pageNum: pageNum.value, pageSize: pageSize.value }
    const res = await getOrderList(params)
    // 兼容分页对象 { records } 和直接返回数组
    let records = Array.isArray(res) ? res : (res?.records || [])
    total.value = Array.isArray(res) ? res.length : (res?.total || 0)

    // 前端按状态筛选（兼容后端不支持 status 参数的情况）
    const statusFilter = getStatusFilter()
    if (statusFilter !== undefined) {
      records = records.filter(o => o.status === statusFilter)
    }

    list.value = records

    // debug: 查看首条订单的字段和 items 结构
    if (records.length > 0) {
      console.log('[OrderList] 首条订单字段:', Object.keys(records[0]))
      console.log('[OrderList] 首条订单 items:', records[0].items)
      console.log('[OrderList] orderItems(records[0]):', orderItems(records[0]))
    }
  } catch (e) {
    console.error('[OrderList] 加载失败:', e)
    showToast('加载订单失败')
  } finally {
    loading.value = false
  }
}

// ── Tab切换 ──
function onTabChange() {
  pageNum.value = 1
  fetchOrders()
}

// ── 导航 ──
function goDetail(id) {
  router.push(`/order/detail/${id}`)
}

function goGoods(spuId) {
  if (spuId) router.push(`/goods/${spuId}`)
}

function goPay(order) {
  router.push({ name: 'Payment', query: { orderId: order.id } })
}

function goLogistics(id) {
  showToast('物流功能开发中')
}

function goReview(order) {
  showToast('评价功能开发中')
}

// ── 取消订单 ──
async function handleCancel(order) {
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确定要取消该订单吗？',
      confirmButtonText: '确定',
      cancelButtonText: '再想想',
      confirmButtonColor: '#d63031',
    })
  } catch {
    return
  }
  showLoadingToast({ message: '取消中...', forbidClick: true, duration: 0 })
  try {
    await cancelOrder(order.id)
    closeToast()
    showToast('订单已取消')
    fetchOrders()
  } catch {
    closeToast()
  }
}

// ── 再买一单 ──
function handleRebuy(order) {
  const items = orderItems(order)
  if (items.length > 0) {
    const item = items[0]
    router.push(`/goods/${item.spuId}`)
  }
}

// ── 加载当前 tab 数据 ──
function loadWithTab() {
  const tab = route.query.tab
  activeTab.value = tab !== undefined ? String(tab) : 'all'
  pageNum.value = 1
  fetchOrders()
}

// ── 生命周期 ──
onMounted(() => {
  loadWithTab()
})

// keep-alive 缓存下重新激活时刷新
onActivated(() => {
  loadWithTab()
})
</script>

<style scoped>
.page-order-list {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 20px;
}
.nav-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}
.tabs-sticky {
  position: sticky;
  top: 46px;
  z-index: 50;
  background: #fff;
}

/* ── 状态容器 ── */
.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

/* ── 订单卡片 ── */
.order-list {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.order-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* ── 订单头部 ── */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f3f0;
  cursor: pointer;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.header-date {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
}
.header-id {
  font-size: 11px;
  color: #bababa;
}
.header-status {
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
.header-status.s-0 { color: #f39c12; }
.header-status.s-1 { color: #e8573a; }
.header-status.s-2 { color: #1989fa; }
.header-status.s-3 { color: #07c160; }
.header-status.s-4 { color: #9a9aae; }

/* ── 商品清单（与支付页统一） ── */
.order-items {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.item-thumb {
  flex-shrink: 0;
  border-radius: 8px;
  background: #f0ece8;
}
.item-info {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.35;
}
.item-spec {
  font-size: 12px;
  color: #bababa;
  margin-top: 4px;
}
/* ── 金额合计 ── */
.order-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid #f5f3f0;
  font-size: 13px;
  color: #5a5a6e;
}
.summary-amount {
  font-size: 13px;
}
.amount-num {
  font-style: normal;
  font-size: 16px;
  font-weight: 700;
  color: #d63031;
  font-family: 'DM Sans', 'Inter', sans-serif;
}

/* ── 操作按钮 ── */
.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f5f3f0;
  flex-wrap: wrap;
}
.action-btn {
  height: 30px;
  font-size: 12px;
  padding: 0 14px;
  border-color: #e0dcd8;
  color: #5a5a6e;
}
.action-btn.primary {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  border: none;
  color: #fff;
}
.action-btn.rebuy {
  border-color: #e8573a;
  color: #e8573a;
}

/* ── 分页 ── */
.pagination-wrap {
  padding: 20px 16px;
  display: flex;
  justify-content: center;
}
.pagination-wrap :deep(.van-pagination) {
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid #e8e4e0;
  background: #fff;
  width: auto;
  display: inline-flex;
}
.pagination-wrap :deep(.van-pagination__item) {
  font-size: 13px;
  font-weight: 500;
  color: #5a5a6e;
  border: none;
  background: #fff;
  padding: 0 22px;
  height: 38px;
  min-width: auto;
  position: relative;
}
.pagination-wrap :deep(.van-pagination__item + .van-pagination__item) {
  border-left: 1px solid #f0ece8;
}
.pagination-wrap :deep(.van-pagination__item--active) {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
  font-weight: 600;
  border-left-color: transparent;
}
.pagination-wrap :deep(.van-pagination__item:active) {
  opacity: 0.8;
}
.pagination-wrap :deep(.van-pagination__prev),
.pagination-wrap :deep(.van-pagination__next) {
  color: #1a1a2e;
  font-weight: 500;
}
</style>
