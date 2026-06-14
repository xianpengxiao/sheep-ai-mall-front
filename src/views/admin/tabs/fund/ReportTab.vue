<template>
  <div class="sub-page">
    <div class="fund-sub-tabs" style="margin-bottom:14px">
      <span v-for="st in reportTabs" :key="st.key" class="fund-sub-tab" :class="{ active: subActive === st.key }" @click="subActive = st.key; handleSearch()">{{ st.label }}</span>
    </div>

    <!-- 每日汇总报表 -->
    <template v-if="subActive === 'daily'">
      <div class="sub-toolbar">
        <div class="sub-search"><input v-model="startDate" placeholder="开始日期" /></div>
        <span class="date-sep" style="font-size:12px;color:#c8c4c0">至</span>
        <div class="sub-search"><input v-model="endDate" placeholder="结束日期" /></div>
        <van-button round size="small" class="sub-search-btn" @click="handleSearch">搜索</van-button>
      </div>
      <div class="sub-table-wrap">
        <van-loading v-if="loading" class="loading-center" size="24" />
        <table v-else class="data-table">
          <thead><tr><th>统计日期</th><th>平台佣金</th><th>提现金额</th><th>退款金额</th><th>净收入</th></tr></thead>
          <tbody>
            <tr v-if="dailyList.length === 0"><td colspan="5" class="empty-cell">暂无数据</td></tr>
            <tr v-for="row in dailyList" :key="row.statDate">
              <td>{{ row.statDate }}</td>
              <td class="cell-amount">{{ row.totalCommission ?? '--' }}</td>
              <td class="cell-amount">{{ row.totalWithdraw ?? '--' }}</td>
              <td class="cell-amount">{{ row.totalRefund ?? '--' }}</td>
              <td class="cell-income">{{ row.netIncome ?? '--' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 单店铺对账 -->
    <template v-if="subActive === 'merchant'">
      <div class="sub-toolbar">
        <div class="sub-search"><input v-model="merchantId" placeholder="商家ID" @keyup.enter="handleSearch" /></div>
        <div class="sub-search"><input v-model="startDate" placeholder="开始日期" /></div>
        <span class="date-sep" style="font-size:12px;color:#c8c4c0">至</span>
        <div class="sub-search"><input v-model="endDate" placeholder="结束日期" /></div>
        <van-button round size="small" class="sub-search-btn" @click="handleSearch">搜索</van-button>
      </div>
      <div class="sub-table-wrap">
        <van-loading v-if="loading" class="loading-center" size="24" />
        <table v-else class="data-table">
          <thead><tr><th>商家ID</th><th>店铺名称</th><th>订单数</th><th>营业额</th><th>平台佣金</th><th>提现金额</th><th>退款金额</th><th>应结算</th><th>统计日期</th></tr></thead>
          <tbody>
            <tr v-if="merchantList.length === 0"><td colspan="9" class="empty-cell">暂无数据</td></tr>
            <tr v-for="row in merchantList" :key="row.merchantId + (row.statDate || '')">
              <td>{{ row.merchantId }}</td><td>{{ row.shopName }}</td><td>{{ row.orderCount ?? '--' }}</td>
              <td class="cell-amount">{{ row.turnover ?? '--' }}</td><td class="cell-amount">{{ row.totalCommission ?? '--' }}</td>
              <td class="cell-amount">{{ row.totalWithdraw ?? '--' }}</td><td class="cell-amount">{{ row.totalRefund ?? '--' }}</td>
              <td class="cell-income">{{ row.settlementAmount ?? '--' }}</td><td class="cell-time">{{ row.statDate || '--' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div class="sub-pagination" v-if="total > 0">
      <van-pagination v-model="page" :page-count="pageCount" mode="simple" @change="loadData" />
      <span class="page-info">共 {{ total }} 条</span>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { getDailyReport, getMerchantReport } from '../../../../api/fund.js'
import { useUserStore } from '../../../../stores/user.js'
const us = useUserStore()
const reportTabs = [
  { key: 'daily', label: '每日汇总报表' },
  { key: 'merchant', label: '单店铺对账' },
]
const subActive = ref('daily')
const startDate = ref(''); const endDate = ref(''); const merchantId = ref('')
const page = ref(1); const total = ref(0); const size = 10
const dailyList = ref([]); const merchantList = ref([]); const loading = ref(false)
const pageCount = computed(() => Math.ceil(total.value / size) || 1)
async function loadData() {
  loading.value = true
  try {
    if (subActive.value === 'daily') {
      const params = { pageNum: page.value, pageSize: size }
      if (startDate.value) params.startDate = startDate.value
      if (endDate.value) params.endDate = endDate.value
      const r = await getDailyReport(params); dailyList.value = r?.records || []; total.value = r?.total || 0
    } else {
      const params = { pageNum: page.value, pageSize: size }
      if (merchantId.value) params.merchantId = merchantId.value
      if (startDate.value) params.startDate = startDate.value
      if (endDate.value) params.endDate = endDate.value
      const r = await getMerchantReport(params); merchantList.value = r?.records || []; total.value = r?.total || 0
    }
  } catch { dailyList.value = []; merchantList.value = []; total.value = 0 }
  finally { loading.value = false }
}
function handleSearch() { page.value = 1; loadData() }
</script>
<style scoped>
.sub-page { font-size: 13px; }
.sub-toolbar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
.sub-search { display: flex; align-items: center; background: #fff; border: 1.5px solid #eeeae6; border-radius: 10px; padding: 0 12px; max-width: 200px; }
.sub-search input { flex: 1; border: none; outline: none; font-size: 13px; padding: 8px 0; background: transparent; color: #1a1a2e; width: 80px; }
.sub-search input::placeholder { color: #c8c4c0; }
.sub-search-btn { height: 34px; font-size: 13px; font-weight: 500; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 16px; }
.sub-table-wrap { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.data-table { width: 100%; min-width: 800px; border-collapse: collapse; }
.data-table th { padding: 11px 8px; text-align: left; font-weight: 600; color: #5a5a6e; background: #faf8f6; border-bottom: 1px solid #eeeae6; white-space: nowrap; font-size: 12px; }
.data-table td { padding: 9px 8px; color: #1a1a2e; border-bottom: 1px solid #f5f3f0; white-space: nowrap; font-size: 12px; }
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 11px; color: #9a9aae; }
.cell-amount { font-weight: 600; color: #1a1a2e; }
.cell-income { font-weight: 600; color: #07c160; }
.loading-center { padding: 60px 0; }
.sub-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; }
.page-info { font-size: 12px; color: #9a9aae; }
.fund-sub-tabs { display: flex; gap: 20px; padding: 0 0 8px; border-bottom: 1.5px solid #eeeae6; }
.fund-sub-tab { font-size: 13px; font-weight: 500; color: #5a5a6e; cursor: pointer; padding: 6px 0 8px; border-bottom: 2px solid transparent; transition: color 0.2s; user-select: none; }
.fund-sub-tab:hover { color: #1a1a2e; }
.fund-sub-tab.active { color: #1a1a2e; font-weight: 600; border-bottom-color: #e8573a; }
</style>
