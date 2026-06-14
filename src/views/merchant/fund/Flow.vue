<template>
  <div class="fund-section">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select v-model="flowType" class="filter-select" @change="handleSearch">
        <option value="">全部类型</option>
        <option value="order_income">订单入账</option>
        <option value="withdraw_expense">提现支出</option>
        <option value="withdraw_refund">提现退回</option>
      </select>
      <input v-model="startDate" class="filter-input" placeholder="开始日期" />
      <span class="filter-sep">~</span>
      <input v-model="endDate" class="filter-input" placeholder="结束日期" />
      <van-button round size="small" class="filter-btn" @click="handleSearch">搜索</van-button>
    </div>

    <!-- 流水列表 -->
    <div class="list-card">
      <van-loading v-if="loading" class="loading-center" size="20" />
      <template v-else>
        <div v-for="row in list" :key="row.id" class="flow-item">
          <div class="flow-top">
            <span :class="'flow-direction flow-' + (row.direction === 'INCOME' ? 'in' : 'out')">
              {{ row.direction === 'INCOME' ? '+' : '-' }}¥{{ row.amount ?? '0.00' }}
            </span>
            <span class="flow-type-tag">{{ row.flowTypeText }}</span>
          </div>
          <div class="flow-balance-row">
            <span v-if="row.balanceBefore != null">余额：{{ row.balanceBefore }} → ¥{{ row.balanceAfter ?? '--' }}</span>
            <span v-else v-show="row.balanceAfter != null">余额：¥{{ row.balanceAfter }}</span>
          </div>
          <div class="flow-biz" v-if="row.remark">{{ row.remark }}</div>
          <div class="flow-time">{{ row.createTime }}</div>
        </div>
        <van-empty v-if="list.length === 0" description="暂无流水记录" />
      </template>
      <van-pagination v-if="total > 0" v-model="page" :page-count="pageCount" mode="simple" @change="loadData" class="fund-pagination" />
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getFundFlowPage } from '../../../api/merchant_fund.js'

const flowType = ref(''); const startDate = ref(''); const endDate = ref('')
const page = ref(1); const total = ref(0); const size = 10
const list = ref([]); const loading = ref(false)
const pageCount = computed(() => Math.ceil(total.value / size) || 1)

async function loadData() {
  loading.value = true
  try {
    const params = { pageNum: page.value, pageSize: size }
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
.fund-section { padding: 0 0 16px; }
.filter-bar { display: flex; gap: 6px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.filter-select { border: 1.5px solid #e0dcd8; border-radius: 8px; padding: 6px 8px; font-size: 12px; color: #1a1a2e; background: #fff; outline: none; }
.filter-input { border: 1.5px solid #e0dcd8; border-radius: 8px; padding: 6px 8px; font-size: 12px; color: #1a1a2e; background: #fff; outline: none; width: 90px; }
.filter-input::placeholder { color: #c8c4c0; }
.filter-sep { font-size: 12px; color: #c8c4c0; }
.filter-btn { background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 12px; height: 30px; font-size: 12px; }
.list-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.flow-item { padding: 14px 0; border-bottom: 1px solid #f5f3f0; }
.flow-item:last-child { border-bottom: none; }
.flow-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.flow-direction { font-size: 18px; font-weight: 700; }
.flow-in { color: #07c160; }
.flow-out { color: #e8573a; }
.flow-type-tag { font-size: 12px; padding: 2px 10px; border-radius: 10px; background: #f5f3f0; color: #5a5a6e; }
.flow-balance-row { font-size: 12px; color: #9a9aae; margin-bottom: 4px; }
.flow-biz { font-size: 12px; color: #5a5a6e; margin-bottom: 4px; }
.flow-time { font-size: 11px; color: #c8c4c0; }
.loading-center { padding: 30px 0; }
.fund-pagination { margin-top: 12px; }
</style>
