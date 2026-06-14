<template>
  <div class="sub-page">
    <div class="sub-toolbar">
      <div class="sub-search"><input v-model="orderNo" placeholder="订单号" @keyup.enter="handleSearch" /></div>
      <div class="sub-search"><input v-model="merchantId" placeholder="商家ID" @keyup.enter="handleSearch" /></div>
      <div class="sub-search date-range">
        <input v-model="startDate" placeholder="开始日期 yyyy-MM-dd" />
        <span class="date-sep">至</span>
        <input v-model="endDate" placeholder="结束日期" />
      </div>
      <van-button round size="small" class="sub-search-btn" @click="handleSearch">搜索</van-button>
    </div>
    <div class="sub-table-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <table v-else class="data-table">
        <thead><tr><th>ID</th><th>订单号</th><th>商品名称</th><th>分类</th><th>店铺</th><th>实付金额</th><th>佣金比例(%)</th><th>平台佣金</th><th>商家到手</th><th>状态</th><th>结算时间</th><th>创建时间</th></tr></thead>
        <tbody>
          <tr v-if="list.length === 0"><td colspan="12" class="empty-cell">暂无数据</td></tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.id }}</td><td>{{ row.orderNo }}</td><td>{{ row.spuName }}</td><td>{{ row.categoryName }}</td><td>{{ row.shopName }}</td>
            <td class="cell-amount">{{ row.totalPrice ?? '--' }}</td><td>{{ row.commissionRate }}</td><td class="cell-amount">{{ row.commissionAmount ?? '--' }}</td><td class="cell-amount">{{ row.merchantIncome ?? '--' }}</td>
            <td><span :class="'comm-' + row.status">{{ {0:'待结算',1:'已结算',2:'已退款'}[row.status] || row.status }}</span></td>
            <td class="cell-time">{{ row.settleTime || '--' }}</td><td class="cell-time">{{ row.createTime }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="sub-pagination" v-if="total > 0">
      <van-pagination v-model="page" :page-count="pageCount" mode="simple" @change="loadData" />
      <span class="page-info">共 {{ total }} 条</span>
    </div>
    <div class="sub-tip">说明：分佣在买家确认收货时自动触发，无需人工操作。</div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCommissionLogPage } from '../../../../api/fund.js'
const orderNo = ref(''); const merchantId = ref(''); const startDate = ref(''); const endDate = ref('')
const page = ref(1); const total = ref(0); const size = 10
const list = ref([]); const loading = ref(false)
const pageCount = computed(() => Math.ceil(total.value / size) || 1)
async function loadData() {
  loading.value = true
  try {
    const params = { pageNum: page.value, pageSize: size }
    if (orderNo.value) params.orderNo = orderNo.value
    if (merchantId.value) params.merchantId = merchantId.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const r = await getCommissionLogPage(params); list.value = r?.records || []; total.value = r?.total || 0
  } catch { list.value = []; total.value = 0 }
  finally { loading.value = false }
}
function handleSearch() { page.value = 1; loadData() }
onMounted(loadData)
</script>
<style scoped>
.sub-page { font-size: 13px; }
.sub-toolbar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.sub-search { display: flex; align-items: center; background: #fff; border: 1.5px solid #eeeae6; border-radius: 10px; padding: 0 12px; max-width: 200px; }
.sub-search.date-range { max-width: 340px; gap: 4px; }
.sub-search input { flex: 1; border: none; outline: none; font-size: 13px; padding: 8px 0; background: transparent; color: #1a1a2e; width: 80px; }
.sub-search input::placeholder { color: #c8c4c0; }
.date-sep { color: #c8c4c0; font-size: 12px; flex-shrink: 0; }
.sub-search-btn { height: 34px; font-size: 13px; font-weight: 500; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 16px; }
.sub-table-wrap { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.data-table { width: 100%; min-width: 1100px; border-collapse: collapse; }
.data-table th { padding: 11px 8px; text-align: left; font-weight: 600; color: #5a5a6e; background: #faf8f6; border-bottom: 1px solid #eeeae6; white-space: nowrap; font-size: 12px; }
.data-table td { padding: 9px 8px; color: #1a1a2e; border-bottom: 1px solid #f5f3f0; white-space: nowrap; font-size: 12px; }
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 11px; color: #9a9aae; }
.cell-amount { text-align: right; font-weight: 600; color: #e8573a; }
.loading-center { padding: 60px 0; }
.sub-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; }
.page-info { font-size: 12px; color: #9a9aae; }
.sub-tip { margin-top: 12px; font-size: 12px; color: #9a9aae; background: #fff8e6; border-radius: 8px; padding: 8px 14px; }
.comm-0 { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #fff3e0; color: #f39c12; font-weight: 500; }
.comm-1 { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #e8f8ee; color: #07c160; font-weight: 500; }
.comm-2 { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #f0ece8; color: #9a9aae; font-weight: 500; }
</style>
