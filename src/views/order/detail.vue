<template>
  <div class="page-order-detail">
    <div class="nav-bar-sticky">
      <NavBar title="订单详情" />
    </div>

    <!-- ═══════ 加载中 ═══════ -->
    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <!-- ═══════ 错误/不存在 ═══════ -->
    <div v-else-if="error" class="state-wrap">
      <van-empty :description="error">
        <van-button round size="small" color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)" @click="router.back()">返回</van-button>
      </van-empty>
    </div>

    <!-- ═══════ 订单信息 ═══════ -->
    <template v-else-if="order">
      <!-- 📋 订单头部：状态 + 编号 -->
      <div class="section header-section" :class="'status-' + order.status">
        <div class="header-status">
          <van-icon :name="statusIcon" size="28" />
          <span class="status-text">{{ statusLabel }}</span>
        </div>
        <div class="header-order-no">订单号：{{ order.orderNo || order.id }}</div>
      </div>

      <!-- 📍 收货信息 -->
      <div class="section" v-if="order.receiverName">
        <div class="section-title"><van-icon name="location-o" /> 收货信息</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">收货人</span>
            <span class="info-value">{{ order.receiverName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">手机号</span>
            <span class="info-value">{{ order.receiverPhone }}</span>
          </div>
          <div class="info-item info-item-full">
            <span class="info-label">收货地址</span>
            <span class="info-value">{{ order.receiverAddress }}</span>
          </div>
        </div>
      </div>

      <!-- 📦 商品清单 -->
      <div class="section">
        <div class="section-title"><van-icon name="shop-o" /> 商品清单</div>
        <div class="order-items">
          <div v-for="(item, i) in order.items" :key="i" class="order-item">
            <van-image
              :src="item.skuImage || item.spuImage"
              width="72"
              height="72"
              fit="cover"
              class="item-thumb"
            />
            <div class="item-info">
              <div class="item-name van-multi-ellipsis--l2">{{ item.spuName }}</div>
              <div class="item-spec" v-if="item.specInfo">{{ formatSpecs(item.specInfo) }}</div>
            </div>
            <div class="item-amount">
              <div class="item-price">&yen;{{ formatPrice(item.price) }}</div>
              <div class="item-qty">&times; {{ item.quantity }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 💰 订单金额 -->
      <div class="section">
        <div class="section-title"><van-icon name="bill-o" /> 订单金额</div>
        <div class="amount-rows">
          <div class="amount-row">
            <span class="amount-label">商品合计</span>
            <span class="amount-value">&yen;{{ formatPrice(order.totalAmount) }}</span>
          </div>
          <div class="amount-row">
            <span class="amount-label">运费</span>
            <span class="amount-value shipping-free">免运费</span>
          </div>
          <div class="amount-divider"></div>
          <div class="amount-row amount-total">
            <span class="amount-label">实付金额</span>
            <span class="amount-value total">&yen;{{ formatPrice(order.totalAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 📝 其他信息 -->
      <div class="section">
        <div class="section-title"><van-icon name="notes-o" /> 订单信息</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">下单时间</span>
            <span class="info-value">{{ formatTime(order.createTime) }}</span>
          </div>
          <div class="info-item" v-if="order.payTime">
            <span class="info-label">支付时间</span>
            <span class="info-value">{{ formatTime(order.payTime) }}</span>
          </div>
          <div class="info-item" v-if="order.remark">
            <span class="info-label">备注</span>
            <span class="info-value">{{ order.remark }}</span>
          </div>
        </div>
      </div>

      <!-- 🛒 底部操作栏 -->
      <div class="bottom-bar" v-if="showActions">
        <van-button
          v-if="order.status === 0"
          round
          type="primary"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          class="bottom-btn"
          @click="goPay"
        >立即支付</van-button>
        <van-button
          v-else-if="order.status === 2"
          round
          type="primary"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          class="bottom-btn"
          @click="handleComplete"
        >确认收货</van-button>
      </div>
    </template>

    <!-- ═══════ 缺少数据 ═══════ -->
    <div v-else class="state-wrap">
      <van-empty description="未获取到订单信息">
        <van-button round size="small" color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)" @click="router.back()">返回</van-button>
      </van-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showConfirmDialog, showLoadingToast, closeToast } from 'vant'
import { getOrderDetail, completeOrder } from '../../api/order.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const error = ref('')
const order = ref(null)

// ── 计算展示 ──
const statusIcon = computed(() => {
  const map = { 0: 'clock-o', 1: 'paid', 2: 'logistics', 3: 'certificate', 4: 'close' }
  return map[order.value?.status] || 'info-o'
})
const statusLabel = computed(() => {
  const map = { 0: '待支付', 1: '已支付', 2: '已发货', 3: '已完成', 4: '已取消' }
  return map[order.value?.status] || '未知状态'
})

// ── 是否显示底部操作按钮 ──
const showActions = computed(() => {
  if (!order.value) return false
  // 待支付（15分钟超时）或待收货
  if (order.value.status === 0) {
    if (!order.value.createTime) return true
    const created = new Date(order.value.createTime).getTime()
    const expiredAt = created + 15 * 60 * 1000
    return Date.now() < expiredAt
  }
  if (order.value.status === 2) return true
  return false
})

// ── 工具 ──
function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

function formatSpecs(specInfo) {
  if (!specInfo) return ''
  if (typeof specInfo === 'string') return specInfo
  return Object.values(specInfo).join(' / ')
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ── 加载 ──
async function fetchDetail() {
  const id = route.params.id
  if (!id) {
    error.value = '缺少订单编号'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  try {
    const detail = await getOrderDetail(id)
    if (!detail) {
      error.value = '订单不存在'
      return
    }
    order.value = detail
  } catch (e) {
    console.error('[OrderDetail] 加载失败:', e)
    error.value = '加载订单信息失败'
  } finally {
    loading.value = false
  }
}

// ── 立即支付 ──
function goPay() {
  router.push({
    name: 'Payment',
    query: { orderId: order.value.id },
  })
}

// ── 确认收货 ──
async function handleComplete() {
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确认收到商品了吗？',
      confirmButtonText: '确认',
      cancelButtonText: '再想想',
      confirmButtonColor: '#e8573a',
    })
  } catch {
    return
  }
  showLoadingToast({ message: '处理中...', forbidClick: true, duration: 0 })
  try {
    await completeOrder(order.value.id)
    closeToast()
    showToast('已确认收货')
    fetchDetail()
  } catch {
    closeToast()
  }
}

// 仅当当前路由是自己时才重新加载，避免被其他路由的 id 参数误触
watch(() => route.params.id, (id) => {
  if (route.name === 'OrderDetail' && id) fetchDetail()
}, { immediate: true })
// keep-alive 重新激活时刷新
onActivated(() => {
  if (route.name === 'OrderDetail') fetchDetail()
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   订单详情 — 暖色调复古风格
   ══════════════════════════════════════════════════════════════ */

.page-order-detail {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 80px;
}
.nav-bar-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}

/* ── 状态容器 ── */
.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

/* ── 区块 ── */
.section {
  background: #fff;
  margin: 10px 12px 0;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0ece8;
}

/* ── 订单头部 ── */
.header-section {
  text-align: center;
  padding: 24px 16px;
}
.header-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}
.header-status .status-text {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}
.header-section.status-0 .header-status .van-icon { color: #f39c12; }
.header-section.status-1 .header-status .van-icon { color: #2ecc71; }
.header-section.status-4 .header-status .van-icon { color: #9a9aae; }
.header-order-no {
  font-size: 13px;
  color: #9a9aae;
}

/* ── 信息网格 ── */
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.info-item-full {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.info-label {
  font-size: 14px;
  color: #9a9aae;
  flex-shrink: 0;
  min-width: 60px;
}
.info-value {
  font-size: 14px;
  color: #1a1a2e;
  flex: 1;
}

/* ── 商品清单 ── */
.order-items {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
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
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.35;
}
.item-spec {
  font-size: 12px;
  color: #bababa;
  margin-top: 4px;
}
.item-amount {
  flex-shrink: 0;
  text-align: right;
}
.item-price {
  font-size: 16px;
  font-weight: 700;
  color: #d63031;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
.item-qty {
  font-size: 13px;
  color: #9a9aae;
  margin-top: 2px;
}

/* ── 金额 ── */
.amount-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.amount-label {
  font-size: 14px;
  color: #5a5a6e;
}
.amount-value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
.shipping-free {
  color: #2ecc71;
  font-size: 13px;
}
.amount-divider {
  height: 1px;
  background: #f0ece8;
  margin: 4px 0;
}
.amount-total .amount-label {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}
.amount-total .amount-value.total {
  font-size: 20px;
  font-weight: 700;
  color: #d63031;
}

/* ── 底部操作栏 ── */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 12px 16px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 -1px 6px rgba(0,0,0,0.04);
  z-index: 100;
}
.bottom-btn {
  width: 100%;
  max-width: 320px;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  border: none;
}

/* ── 响应式 ── */
@media (min-width: 640px) {
  .section {
    margin: 12px 24px 0;
  }
}
</style>
