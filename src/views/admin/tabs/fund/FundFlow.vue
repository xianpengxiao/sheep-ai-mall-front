<template>
  <div class="sub-page">
    <div class="sub-toolbar">
      <div class="sub-search"><input v-model="merchantId" placeholder="商家ID" @keyup.enter="handleSearch" /></div>
      <select v-model="flowType" class="status-select" @change="handleSearch">
        <option value="">全部类型</option><option value="INCOME">收入</option><option value="EXPENSE">支出</option>
      </select>
      <div class="sub-search date-range">
        <input v-model="startDate" placeholder="开始日期" />
        <span class="date-sep">至</span>
        <input v-model="endDate" placeholder="结束日期" />
      </div>
      <van-button round size="small" class="sub-search-btn" @click="handleSearch">搜索</van-button>
    </div>
    <div class="sub-table-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <table v-else class="data-table">
        <thead><tr><th>ID</th><th>流水号</th><th>商家ID</th><th>店铺名称</th><th>金额</th><th>类型</th><th>账户余额</th><th>备注</th><th>创建时间</th></tr></thead>
        <tbody>
          <tr v-if="list.length === 0"><td colspan="9" class="empty-cell">暂无数据</td></tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.id }}</td><td>{{ row.flowNo }}</td><td>{{ row.merchantId }}</td><td>{{ row.shopName }}</td>
            <td :class="row.flowType === 'INCOME' ? 'cell-income' : 'cell-expense'">{{ row.flowType === 'EXPENSE' ? '-' : '' }}{{ row.amount ?? '--' }}</td>
            <td><span :class="row.flowType === 'INCOME' ? 'tag-green' : 'tag-red'">{{ row.flowType === 'INCOME' ? '收入' : '支出' }}</span></td>
            <td class="cell-amount">{{ row.balance ?? '--' }}</td>
            <td>{{ row.remark || '--' }}</td><td class="cell-time">{{ row.createTime }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="sub-pagination" v-if="total > 0">
      <van-pagination v-model="page" :page-count="pageCount" mode="simple" @change="loadData" />
      <span class="page-info">共 {{ total }} 条</span>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getFundFlowPage } from '../../../../api/fund.js'
const merchantId = ref(''); const flowType = ref(''); const startDate = ref(''); const endDate = ref('')
const page = ref(1); const total = ref(0); const size = 10
const list = ref([]); const loading = ref(false)
const pageCount = computed(() => Math.ceil(total.value / size) || 1)
async function loadData() {
  loading.value = true
  try {
    const params = { pageNum: page.value, pageSize: size }
    if (merchantId.value) params.merchantId = merchantId.value
    if (flowType.value) params.flowType = flowType.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const r = await getFundFlowPage(params); list.value = r?.records || []; total.value = r?.total || 0
  } catch { list.value = []; total.value = 0 }
  finally { loading.value = false }
}
function handleSearch() { page.value = 1; loadData() }
onMounted(loadData)
</script>
<style scoped>
.sub-page { font-size: 13px; }
.sub-toolbar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
.sub-search { display: flex; align-items: center; background: #fff; border: 1.5px solid #eeeae6; border-radius: 10px; padding: 0 12px; max-width: 200px; }
.sub-search.date-range { max-width: 300px; gap: 4px; }
.sub-search input { flex: 1; border: none; outline: none; font-size: 13px; padding: 8px 0; background: transparent; color: #1a1a2e; width: 80px; }
.sub-search input::placeholder { color: #c8c4c0; }
.date-sep { color: #c8c4c0; font-size: 12px; flex-shrink: 0; }
.status-select { border: 1.5px solid #eeeae6; border-radius: 10px; padding: 7px 8px; font-size: 12px; color: #1a1a2e; background: #fff; outline: none; }
.sub-search-btn { height: 34px; font-size: 13px; font-weight: 500; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 16px; }
.sub-table-wrap { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.data-table { width: 100%; min-width: 1100px; border-collapse: collapse; }
.data-table th { padding: 11px 8px; text-align: left; font-weight: 600; color: #5a5a6e; background: #faf8f6; border-bottom: 1px solid #eeeae6; white-space: nowrap; font-size: 12px; }
.data-table td { padding: 9px 8px; color: #1a1a2e; border-bottom: 1px solid #f5f3f0; white-space: nowrap; font-size: 12px; }
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 11px; color: #9a9aae; }
.cell-amount { font-weight: 600; color: #1a1a2e; }
.cell-income { font-weight: 600; color: #07c160; }
.cell-expense { font-weight: 600; color: #e8573a; }
.loading-center { padding: 60px 0; }
.sub-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; }
.page-info { font-size: 12px; color: #9a9aae; }
.tag-green { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #e8f8ee; color: #07c160; font-weight: 500; }
.tag-red { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #fde8e5; color: #e8573a; font-weight: 500; }
</style>
