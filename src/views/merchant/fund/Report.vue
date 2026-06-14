<template>
  <div class="fund-section">
    <!-- 日期选择 -->
    <div class="filter-bar">
      <input v-model="startDate" class="filter-input" placeholder="开始日期" />
      <span class="filter-sep">~</span>
      <input v-model="endDate" class="filter-input" placeholder="结束日期" />
      <van-button round size="small" class="filter-btn" @click="loadReport">查询</van-button>
    </div>

    <!-- 数据卡片 -->
    <div v-if="report" class="report-summary">
      <div class="report-shop">店铺：{{ report.shopName }}</div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-num income">¥{{ report.orderIncome ?? '0.00' }}</div><div class="stat-lbl">订单入账</div></div>
        <div class="stat-card"><div class="stat-num deduct">¥{{ report.commissionDeduct ?? '0.00' }}</div><div class="stat-lbl">佣金扣除</div></div>
        <div class="stat-card"><div class="stat-num expense">¥{{ report.withdrawAmount ?? '0.00' }}</div><div class="stat-lbl">提现支出</div></div>
        <div class="stat-card"><div class="stat-num balance">¥{{ report.availableBalance ?? '0.00' }}</div><div class="stat-lbl">可提现余额</div></div>
      </div>
      <div class="report-detail">
        <div class="detail-item"><span class="detail-lbl">统计周期</span><span class="detail-val">{{ startDate || '--' }} ~ {{ endDate || '--' }}</span></div>
        <div class="detail-item"><span class="detail-lbl">订单数</span><span class="detail-val">{{ report.orderCount ?? 0 }} 笔</span></div>
        <div class="detail-item"><span class="detail-lbl">退款金额</span><span class="detail-val">¥{{ report.refundAmount ?? '0.00' }}</span></div>
        <div class="detail-item"><span class="detail-lbl">净收入</span><span class="detail-val income">¥{{ report.availableBalance ?? '0.00' }}</span></div>
      </div>
    </div>

    <!-- 空状态 -->
    <van-empty v-else-if="!loading" description="请选择日期范围查询报表" />

    <van-loading v-if="loading" class="loading-center" size="20" />
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { getReport } from '../../../api/merchant_fund.js'

const startDate = ref(''); const endDate = ref('')
const report = ref(null); const loading = ref(false)

async function loadReport() {
  if (!startDate.value || !endDate.value) return showToast('请选择日期范围')
  loading.value = true; report.value = null
  try { report.value = await getReport({ startDate: startDate.value, endDate: endDate.value }) }
  catch { report.value = null }
  finally { loading.value = false }
}
import { showToast } from 'vant'
</script>
<style scoped>
.fund-section { padding: 0 0 16px; }
.filter-bar { display: flex; gap: 6px; align-items: center; margin-bottom: 12px; }
.filter-input { border: 1.5px solid #e0dcd8; border-radius: 8px; padding: 6px 8px; font-size: 12px; color: #1a1a2e; background: #fff; outline: none; width: 100px; }
.filter-input::placeholder { color: #c8c4c0; }
.filter-sep { font-size: 12px; color: #c8c4c0; }
.filter-btn { background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 12px; height: 30px; font-size: 12px; }
.report-summary { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.report-shop { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 12px; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.stat-card { background: #faf8f6; border-radius: 10px; padding: 14px 10px; text-align: center; }
.stat-num { font-size: 18px; font-weight: 700; }
.stat-num.income { color: #07c160; }
.stat-num.deduct { color: #f39c12; }
.stat-num.expense { color: #e8573a; }
.stat-num.balance { color: #1a1a2e; }
.stat-lbl { font-size: 11px; color: #9a9aae; margin-top: 4px; }
.report-detail { border-top: 1px solid #f5f3f0; padding-top: 12px; }
.detail-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
.detail-lbl { color: #9a9aae; }
.detail-val { color: #1a1a2e; font-weight: 500; }
.detail-val.income { color: #07c160; font-weight: 600; }
.loading-center { padding: 60px 0; }
</style>
