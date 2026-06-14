<template>
  <div class="fund-section">
    <!-- 可用余额 -->
    <div class="balance-card">
      <div class="balance-label">可用余额</div>
      <div class="balance-num">¥{{ balance ?? '--' }}</div>
    </div>

    <!-- 提现表单 -->
    <div class="form-card">
      <div class="form-title">提交提现</div>
      <div class="form-row">
        <span class="form-lbl">提现金额</span>
        <van-field v-model="amount" type="digit" placeholder="1.00 ~ 1,000,000.00" input-align="right" />
        <span class="form-unit">元</span>
      </div>
      <div class="fee-row">
        <span>手续费：{{ feeRate }}%</span>
        <span>实际到账：<strong class="actual-amount">¥{{ actualAmount }}</strong></span>
      </div>
      <div v-if="withdrawErr" class="err-msg">{{ withdrawErr }}</div>
      <van-button round block class="fund-btn" :disabled="!(balance > 0)" @click="handleWithdraw" :loading="submitting">提交提现</van-button>
    </div>

    <!-- 提现记录 -->
    <div class="list-card">
      <div class="list-title">提现记录</div>
      <van-loading v-if="loading" class="loading-center" size="20" />
      <template v-else>
        <div v-for="row in list" :key="row.id" class="record-item">
          <div class="record-top">
            <span class="record-no">{{ row.withdrawNo }}</span>
            <span class="record-status" :class="'ws-' + row.status">{{ row.statusText }}</span>
          </div>
          <div class="record-amount">¥{{ row.amount ?? '0.00' }}</div>
          <div class="record-bottom">
            <span class="record-time">{{ row.createTime }}</span>
            <span class="record-fee" v-if="row.fee">手续费 ¥{{ row.fee }}</span>
          </div>
          <div v-if="row.status === 3 && row.rejectReason" class="reject-reason">驳回原因：{{ row.rejectReason }}</div>
        </div>
        <van-empty v-if="list.length === 0" description="暂无提现记录" />
      </template>
      <van-pagination v-if="total > 0" v-model="page" :page-count="pageCount" mode="simple" @change="loadData" class="fund-pagination" />
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { submitWithdraw, getWithdrawPage, getBalance } from '../../../api/merchant_fund.js'

const balance = ref(null)
const amount = ref('')
const feeRate = 0.5
const submitting = ref(false)
const withdrawErr = ref('')
const actualAmount = computed(() => {
  const a = parseFloat(amount.value) || 0
  return (a - a * feeRate / 100).toFixed(2)
})
const page = ref(1); const total = ref(0); const size = 10
const list = ref([]); const loading = ref(false)
const pageCount = computed(() => Math.ceil(total.value / size) || 1)

async function handleWithdraw() {
  const a = parseFloat(amount.value)
  if (!a || a < 1) return showToast('提现金额至少 1.00 元')
  if (a > 1000000) return showToast('提现金额不能超过 1,000,000.00 元')
  withdrawErr.value = ''
  submitting.value = true
  try {
    await submitWithdraw(a)
    showToast('提现申请已提交，请等待审核')
    amount.value = ''
    balance.value = await getBalance()
    page.value = 1; loadData()
  } catch (e) { withdrawErr.value = e?.response?.data?.msg || e?.message || '提交失败' }
  finally { submitting.value = false }
}

async function loadData() {
  loading.value = true
  try { const r = await getWithdrawPage({ pageNum: page.value, pageSize: size }); list.value = r?.records || []; total.value = r?.total || 0 }
  catch { list.value = []; total.value = 0 }
  finally { loading.value = false }
}

async function fetchBalance() {
  try { balance.value = await getBalance() } catch { /* */ }
}

defineExpose({ fetchBalance })
onMounted(() => { fetchBalance(); loadData() })
</script>
<style scoped>
.fund-section { padding: 0 0 16px; }
.balance-card {
  background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%);
  border-radius: 12px; padding: 20px; color: #fff; text-align: center; margin-bottom: 12px;
}
.balance-label { font-size: 13px; opacity: 0.8; }
.balance-num { font-size: 28px; font-weight: 700; margin: 6px 0 0; letter-spacing: -0.5px; }
.form-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 12px; }
.form-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin-bottom: 12px; }
.form-row { display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #f5f3f0; }
.form-lbl { width: 68px; font-size: 13px; color: #9a9aae; flex-shrink: 0; }
.form-row .van-field { flex: 1; padding: 0; }
.form-unit { font-size: 13px; color: #1a1a2e; flex-shrink: 0; padding-left: 4px; }
.fee-row { display: flex; justify-content: space-between; font-size: 12px; color: #9a9aae; padding: 8px 0 4px; }
.actual-amount { color: #e8573a; font-weight: 600; }
.err-msg { color: #e8573a; font-size: 12px; margin-top: 8px; text-align: center; }
.fund-btn { margin-top: 12px; height: 42px; font-size: 15px; font-weight: 600; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; }
.list-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.list-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin-bottom: 12px; }
.record-item { padding: 12px 0; border-bottom: 1px solid #f5f3f0; }
.record-item:last-child { border-bottom: none; }
.record-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.record-no { font-size: 11px; color: #9a9aae; }
.record-status { font-size: 11px; padding: 1px 8px; border-radius: 8px; font-weight: 500; }
.ws-0 { background: #fff3e0; color: #f39c12; }
.ws-1 { background: #e3f2fd; color: #1565c0; }
.ws-2 { background: #e8f8ee; color: #07c160; }
.ws-3 { background: #fde8e5; color: #e8573a; }
.record-amount { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
.record-bottom { display: flex; justify-content: space-between; font-size: 11px; color: #c8c4c0; }
.record-fee { color: #9a9aae; }
.reject-reason { font-size: 12px; color: #e8573a; margin-top: 4px; background: #fdecea; padding: 6px 10px; border-radius: 6px; }
.loading-center { padding: 30px 0; }
.fund-pagination { margin-top: 12px; }
</style>
