<template>
  <div class="page-aftersale-apply">
    <div class="nav-sticky">
      <NavBar title="申请售后" />
    </div>

    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <template v-else-if="order">
      <!-- 订单摘要 -->
      <div class="order-brief" @click="$router.push(`/order/detail/${order.id}`)">
        <div class="brief-head">
          <span class="brief-no">订单号：{{ order.orderNo }}</span>
          <span class="brief-status">{{ statusText(order.status) }}</span>
        </div>
        <div class="brief-items">
          <span v-for="(item, i) in order.items || []" :key="i" class="brief-item">{{ item.spuName }}</span>
        </div>
        <div class="brief-amount">实付 ¥{{ formatPrice(order.payAmount ?? order.totalAmount) }}</div>
      </div>

      <!-- 售后类型（按订单状态收敛） -->
      <div class="section">
        <div class="section-title">售后类型</div>
        <div class="type-hint">{{ typeHint }}</div>
        <van-radio-group v-model="form.type">
          <van-cell-group inset>
            <van-cell
              v-for="opt in typeOptions"
              :key="opt.value"
              :title="opt.label"
              :label="opt.desc"
              clickable
              @click="form.type = opt.value"
            >              <template #right-icon>
                <van-radio :name="opt.value" checked-color="#e8573a" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>
      </div>

      <!-- 申请原因 -->
      <div class="section">
        <div class="section-title">申请原因</div>
        <van-field
          v-model="form.reason"
          type="textarea"
          rows="3"
          maxlength="200"
          show-word-limit
          placeholder="请描述售后原因，如商品质量问题、七天无理由等"
        />
      </div>

      <div class="submit-wrap">
        <van-button block round type="primary" :loading="submitting" @click="handleSubmit">提交申请</van-button>
      </div>
    </template>

    <div v-else class="state-wrap">
      <van-empty description="订单不存在或无权访问" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import NavBar from '../../components/NavBar.vue'
import { getOrderDetail } from '../../api/order.js'
import { applyAfterSale } from '../../api/afterSale.js'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const submitting = ref(false)
const order = ref(null)
const form = ref({ type: '', reason: '' })

const TYPE_OPTIONS = {
  REFUND_ONLY: { value: 'REFUND_ONLY', label: '仅退款', desc: '未发货，直接退款' },
  RETURN_REFUND: { value: 'RETURN_REFUND', label: '退货退款', desc: '退回商品，商家确认后退款' },
  EXCHANGE: { value: 'EXCHANGE', label: '换货', desc: '商家寄出新商品' },
}

// 类型按订单状态收敛：待发货(1)=仅退款；待收货(2)/已完成(3)=退货退款/换货
const typeOptions = computed(() => {
  const status = order.value?.status
  if (status === 1) return [TYPE_OPTIONS.REFUND_ONLY]
  if (status === 2 || status === 3) return [TYPE_OPTIONS.RETURN_REFUND, TYPE_OPTIONS.EXCHANGE]
  return []
})

const TYPE_HINTS = {
  1: '订单待发货（未发出）：仅支持仅退款，退款无需退货',
  2: '订单待收货：支持退货退款或换货',
  3: '订单已完成：支持退货退款或换货',
}

function statusText(s) {
  return { 0: '待付款', 1: '待发货', 2: '待收货', 3: '已完成', 4: '已取消' }[s] || ('状态' + s)
}

const typeHint = computed(() => TYPE_HINTS[order.value?.status] || '当前订单状态不支持申请售后')

function formatPrice(v) {
  return v == null ? '--' : Number(v).toFixed(2)
}

async function loadOrder() {
  loading.value = true
  order.value = null
  form.value = { type: '', reason: '' }
  try {
    const data = await getOrderDetail(route.query.orderId)
    order.value = data
    const opts = typeOptions.value
    if (opts.length) form.value.type = opts[0].value
  } catch { /* request.js 统一 toast */ }
  finally { loading.value = false }
}

// keep-alive + 同路由不同 query：从订单A申请售后返回再进订单B，组件实例复用不会重挂载，
// 必须监听 orderId 变化重新加载（否则售后类型停留在上个订单的收敛结果）
watch(() => route.query.orderId, (id) => { if (id) loadOrder() })

async function handleSubmit() {
  if (!form.value.type) { showToast('请选择售后类型'); return }
  submitting.value = true
  try {
    await applyAfterSale({
      orderId: order.value.id,
      type: form.value.type,
      reason: form.value.reason?.trim() || '',
    })
    showToast('售后申请已提交，等待商家处理')
    router.replace('/after-sale/my')
  } catch { /* request.js 统一 toast */ }
  finally { submitting.value = false }
}

onMounted(loadOrder)
</script>

<style scoped>
.page-aftersale-apply {
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
.order-brief {
  margin: 12px;
  padding: 14px;
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
}
.brief-no {
  font-size: 12px;
  color: #9a9aae;
  margin-bottom: 6px;
}
.brief-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.brief-head .brief-no {
  margin-bottom: 0;
}
.brief-status {
  font-size: 12px;
  font-weight: 600;
  color: #e8573a;
}
.type-hint {
  padding: 0 14px 8px;
  font-size: 12px;
  color: #9a9aae;
}
.brief-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.brief-item {
  font-size: 13px;
  color: #3a3a4a;
  background: #f5f3f0;
  border-radius: 4px;
  padding: 3px 8px;
}
.brief-amount {
  font-size: 14px;
  font-weight: 600;
  color: #e8573a;
}
.section {
  margin: 12px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}
.section-title {
  padding: 12px 14px 4px;
  font-size: 14px;
  font-weight: 600;
  color: #3a3a4a;
}
.submit-wrap {
  padding: 12px 16px 32px;
}
</style>
