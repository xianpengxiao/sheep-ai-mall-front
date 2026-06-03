<template>
  <div class="page-payment">
    <div class="nav-bar-sticky">
      <NavBar title="支付中心" />
    </div>

    <!-- ═══════ 加载中 ═══════ -->
    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <!-- ═══════ 支付内容 ═══════ -->
    <template v-else-if="orderId">
      <!-- 📋 订单信息 -->
      <div class="section">
        <div class="section-title">
          <van-icon name="orders-o" /> 订单信息
        </div>
        <div class="info-rows">
          <div class="info-row">
            <span class="info-label">订单编号</span>
            <span class="info-value order-id">{{ orderId }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">订单金额</span>
            <span class="info-value amount">&yen;{{ formatPrice(totalAmount) }}</span>
          </div>
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

      <!-- 支付按钮 -->
      <div class="pay-btn-wrap">
        <van-button
          round
          type="primary"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          class="pay-btn"
          :loading="paying"
          @click="handlePay"
        >确认支付</van-button>
      </div>
    </template>

    <!-- ═══════ 无订单信息 ═══════ -->
    <div v-else class="state-wrap">
      <van-empty description="未获取到订单信息">
        <van-button
          round
          size="small"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          @click="goBack"
        >返回</van-button>
      </van-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showLoadingToast, closeToast, showConfirmDialog } from 'vant'
import { mockPay } from '../api/payment.js'
import NavBar from '../components/NavBar.vue'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const paying = ref(false)
const orderId = ref('')
const totalAmount = ref(0)

onMounted(() => {
  orderId.value = route.query.orderId || ''
  totalAmount.value = Number(route.query.totalAmount || 0)
})

// ── 工具 ──
function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

// ── 支付 ──
async function handlePay() {
  if (!orderId.value) return

  paying.value = true
  showLoadingToast({ message: '支付处理中...', forbidClick: true, duration: 0 })

  try {
    await mockPay(orderId.value)
    closeToast()

    await showConfirmDialog({
      title: '支付成功',
      message: `订单 ${orderId.value} 已支付成功`,
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

// ── 导航 ──
function goBack() {
  router.back()
}
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

/* ── 支付按钮 ── */
.pay-btn-wrap {
  padding: 24px 16px;
}
.pay-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
}

/* ── 响应式 ── */
@media (min-width: 640px) {
  .section {
    margin: 12px 24px 0;
  }
}
</style>
