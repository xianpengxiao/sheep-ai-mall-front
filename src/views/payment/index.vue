<template>
  <div class="page-payment">
    <div class="nav-bar-sticky">
      <NavBar title="支付中心" />
    </div>

    <!-- ═══════ 加载中 ═══════ -->
    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <!-- ═══════ 订单不存在/错误 ═══════ -->
    <div v-else-if="error" class="state-wrap">
      <van-empty :description="error">
        <van-button
          round
          size="small"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          @click="goProfile"
        >返回</van-button>
      </van-empty>
    </div>

    <!-- ═══════ 订单已处理（非待支付） ═══════ -->
    <div v-else-if="orderInfo && orderInfo.status !== 0" class="state-wrap">
      <van-empty :description="statusText(orderInfo.status)">
        <van-button
          round
          size="small"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          @click="goProfile"
        >查看订单</van-button>
      </van-empty>
    </div>

    <!-- ═══════ 正常支付页 ═══════ -->
    <template v-else-if="orderInfo">
      <!-- 📋 订单信息 -->
      <div class="section">
        <div class="section-title">
          <van-icon name="orders-o" /> 订单信息
        </div>
        <div class="info-rows">
          <div class="info-row">
            <span class="info-label">订单编号</span>
            <span class="info-value order-id">{{ orderInfo.id }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">订单金额</span>
            <span class="info-value amount">&yen;{{ formatPrice(orderInfo.totalAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 📦 商品清单 -->
      <div class="section" v-if="orderInfo.items && orderInfo.items.length">
        <div class="section-title">
          <van-icon name="shop-o" /> 商品清单
        </div>
        <div class="order-items">
          <div v-for="(item, i) in orderInfo.items" :key="i" class="order-item">
            <van-image
              :src="item.image"
              width="64"
              height="64"
              fit="cover"
              class="item-thumb"
            />
            <div class="item-info">
              <div class="item-name van-multi-ellipsis--l2">{{ item.spuName }}</div>
              <div class="item-spec">{{ item.skuName }}</div>
            </div>
            <div class="item-amount">
              <div class="item-price">&yen;{{ formatPrice(item.price) }}</div>
              <div class="item-qty">&times; {{ item.quantity }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ⏱ 支付倒计时（后端有返回创建时间才展示） -->
      <div class="section countdown-section" v-if="hasCreateTime">
        <div class="section-title">
          <van-icon name="clock-o" /> 支付倒计时
        </div>
        <div class="countdown-body" :class="{ expired: countdown <= 0 }">
          <template v-if="countdown > 0">
            <span class="countdown-tip">请在</span>
            <span class="countdown-timer">{{ countdownText }}</span>
            <span class="countdown-tip">内完成支付，超时订单将自动取消</span>
          </template>
          <template v-else>
            <van-icon name="warn-o" color="#d63031" size="18" />
            <span class="countdown-expired">支付超时，订单已自动取消</span>
          </template>
        </div>
      </div>

      <!-- 💳 支付方式 -->
      <div class="section">
        <div class="section-title">
          <van-icon name="balance-pay" /> 支付方式
        </div>
        <div class="payment-method selected">
          <van-icon name="balance-o" size="22" color="#1989fa" />
          <span class="method-name">模拟支付（开发环境）</span>
          <van-icon name="success" color="#e8573a" size="18" class="method-check" />
        </div>
      </div>

      <!-- 📝 温馨提示 -->
      <div class="section tip-section">
        <div class="tip-content">
          <van-icon name="info-o" size="16" color="#9a9aae" />
          <span>当前为开发环境，点击下方按钮将模拟支付流程，直接标记订单为已支付。</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions-wrap">
        <van-button
          round
          type="primary"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          class="action-btn pay-btn"
          :loading="paying"
          :disabled="countdown <= 0"
          @click="handlePay"
        >确认支付</van-button>
        <van-button
          round
          plain
          class="action-btn cancel-btn"
          :loading="cancelling"
          @click="handleCancel"
        >取消订单</van-button>
      </div>
    </template>

    <!-- ═══════ 无订单信息 ═══════ -->
    <div v-else class="state-wrap">
      <van-empty description="未获取到订单信息">
        <van-button
          round
          size="small"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          @click="goProfile"
        >返回</van-button>
      </van-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onDeactivated, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showLoadingToast, closeToast, showConfirmDialog, showDialog } from 'vant'
import { getOrderDetail } from '../../api/order.js'
import { mockPay, getPaymentStatus } from '../../api/payment.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()
const route = useRoute()

// ── 状态 ──
const loading = ref(false)
const error = ref('')
const orderInfo = ref(null)
const paying = ref(false)
const cancelling = ref(false)
const hasCreateTime = ref(false) // 后端返回了 createTime 时才显示倒计时
const countdown = ref(0)
const orderId = ref('')

// ── 定时器 ──
let countdownTimer = null
let pollTimer = null

// ── 倒计时文本 ──
const countdownText = computed(() => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// ── 工具 ──
function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

function statusText(status) {
  const map = { 1: '订单已支付', 2: '订单已发货', 3: '订单已完成', 4: '订单已取消' }
  return map[status] || '订单状态已更新'
}

function formatSpecs(specInfo) {
  if (!specInfo) return ''
  if (typeof specInfo === 'string') return specInfo
  return Object.values(specInfo).join(' / ')
}

// ── 解析后端日期（支持 string / 数组 / timestamp） ──
function parseBackendDate(date) {
  if (!date) return NaN
  if (typeof date === 'number') return date
  if (typeof date === 'string') {
    const t = Date.parse(date)
    return isNaN(t) ? NaN : t
  }
  if (Array.isArray(date)) {
    // Jackson 默认将 LocalDateTime 序列化为 [year, month, day, hour, minute, second]
    return new Date(date[0], date[1] - 1, date[2] || 1, date[3] || 0, date[4] || 0, date[5] || 0).getTime()
  }
  return new Date(date).getTime()
}

// ── 计算剩余秒数（基于 createTime + 15min） ──
function calcRemaining(createTime) {
  const createdAt = parseBackendDate(createTime)
  if (isNaN(createdAt)) return 0
  const expiresAt = createdAt + 15 * 60 * 1000
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
}

// ── 启动倒计时（每秒根据绝对时间重算） ──
function startCountdown(createTime) {
  stopCountdown()
  countdown.value = calcRemaining(createTime)
  countdownTimer = setInterval(() => {
    countdown.value = calcRemaining(createTime)
    if (countdown.value <= 0) {
      stopCountdown()
      stopPolling()
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

// ── 轮询订单状态 ──
function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const status = await getPaymentStatus(orderId.value)
      // 后端可能返回 string "0" 或 number 0，统一转数字比较
      const s = Number(status)
      if (!isNaN(s) && s !== 0) {
        stopPolling()
        stopCountdown()
        await showDialog({
          title: '订单状态已更新',
          message: s === 1 ? '订单已支付成功' : `订单状态已变更为 ${statusText(s)}`,
          confirmButtonColor: '#e8573a',
        })
        router.back()
      }
    } catch {
      // 静默，下次轮询继续
    }
  }, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// ── 防止 keep-alive 下 onMounted + onActivated 重复请求 ──
let fetching = false

// ── 加载订单数据 ──
async function fetchOrderDetail() {
  if (fetching) return
  fetching = true
  hasCreateTime.value = false
  const id = route.query.orderId
  if (!id) {
    error.value = '未获取到订单编号'
    loading.value = false
    fetching = false
    return
  }
  orderId.value = id

  loading.value = true
  error.value = ''
  try {
    const detail = await getOrderDetail(id)
    if (!detail) {
      error.value = '订单不存在'
      return
    }
    orderInfo.value = detail

    // 非待支付状态 → 不启动倒计时和轮询
    if (detail.status !== 0) return

    // 计算并启动倒计时
    if (detail.createTime) {
      hasCreateTime.value = true
      startCountdown(detail.createTime)
    }

    // 启动轮询
    startPolling()
  } catch (e) {
    console.error('[Payment] 加载订单失败:', e)
    error.value = '加载订单信息失败'
  } finally {
    loading.value = false
    fetching = false
  }
}

// ── 支付 ──
async function handlePay() {
  if (!orderId.value || countdown.value <= 0) return

  paying.value = true
  showLoadingToast({ message: '支付处理中...', forbidClick: true, duration: 0 })

  try {
    await mockPay(orderId.value)
    closeToast()
    stopPolling()
    stopCountdown()

    await showConfirmDialog({
      title: '支付成功',
      message: `订单 ${orderInfo.value?.id || orderId.value} 已支付成功`,
      confirmButtonText: '确定',
      confirmButtonColor: '#e8573a',
      showCancelButton: false,
    })

    router.back()
  } catch (e) {
    closeToast()
    console.error('[Payment] 支付失败:', e)
  } finally {
    paying.value = false
  }
}

// ── 取消订单 ──
async function handleCancel() {
  if (!orderId.value) return

  try {
    await showConfirmDialog({
      title: '确认取消',
      message: '确定要取消该订单吗？',
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想',
      confirmButtonColor: '#d63031',
    })
  } catch {
    return // 用户取消
  }

  cancelling.value = true
  showLoadingToast({ message: '取消中...', forbidClick: true, duration: 0 })

  try {
    const { cancelOrder } = await import('../../api/order.js')
    await cancelOrder(orderId.value)
    closeToast()
    stopPolling()
    stopCountdown()

    await showDialog({
      title: '已取消',
      message: '订单已成功取消',
      confirmButtonColor: '#e8573a',
    })

    router.back()
  } catch (e) {
    closeToast()
    console.error('[Payment] 取消订单失败:', e)
  } finally {
    cancelling.value = false
  }
}

// ── 导航 ──
function goProfile() {
  router.back()
}

// ── 生命周期 ──
onMounted(() => {
  fetchOrderDetail()
})

// keep-alive 缓存下，重新激活时重新加载数据 & 重启定时器
onActivated(() => {
  fetchOrderDetail()
})

onDeactivated(() => {
  stopCountdown()
  stopPolling()
})

onUnmounted(() => {
  stopCountdown()
  stopPolling()
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   支付中心 — 暖色调复古风格
   ══════════════════════════════════════════════════════════════ */

.page-payment {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 40px;
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

/* ── 订单信息 ── */
.info-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.info-label {
  font-size: 14px;
  color: #5a5a6e;
}
.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
.info-value.order-id {
  font-size: 13px;
  color: #9a9aae;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.info-value.amount {
  font-size: 20px;
  font-weight: 700;
  color: #d63031;
}

/* ── 商品清单（与确认订单页统一） ── */
.order-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
.item-amount {
  flex-shrink: 0;
  text-align: right;
}
.item-price {
  font-size: 15px;
  font-weight: 700;
  color: #d63031;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
.item-qty {
  font-size: 12px;
  color: #9a9aae;
  margin-top: 2px;
}

/* ── 倒计时 ── */
.countdown-section {
  background: rgba(232,87,58,0.03);
  border: 1px solid rgba(232,87,58,0.08);
}
.countdown-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 0;
  font-size: 14px;
  color: #5a5a6e;
  flex-wrap: wrap;
}
.countdown-body.expired {
  color: #d63031;
}
.countdown-timer {
  font-size: 28px;
  font-weight: 700;
  color: #e8573a;
  font-family: 'DM Sans', 'Inter', monospace;
  letter-spacing: 2px;
  min-width: 80px;
  text-align: center;
}
.countdown-expired {
  font-weight: 600;
  color: #d63031;
}

/* ── 支付方式 ── */
.payment-method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  border-radius: 10px;
  border: 1.5px solid rgba(232,87,58,0.2);
  background: rgba(232,87,58,0.02);
  cursor: default;
}
.payment-method .method-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
}
.payment-method .method-check {
  flex-shrink: 0;
}

/* ── 温馨提示 ── */
.tip-section {
  background: rgba(232,87,58,0.03);
  border: 1px solid rgba(232,87,58,0.08);
}
.tip-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #9a9aae;
  line-height: 1.5;
}
.tip-content .van-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* ── 操作按钮 ── */
.actions-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 16px;
}
.action-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
}
.cancel-btn {
  height: 40px;
  font-size: 14px;
  color: #9a9aae;
  border-color: #e0dcd8;
}

/* ── 响应式 ── */
@media (min-width: 640px) {
  .section {
    margin: 12px 24px 0;
  }
}
</style>
