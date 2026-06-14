<template>
  <div class="fund-section">
    <!-- 筛选 -->
    <div class="filter-bar">
      <input v-model="startDate" class="filter-input" placeholder="开始日期" />
      <span class="filter-sep">~</span>
      <input v-model="endDate" class="filter-input" placeholder="结束日期" />
      <van-button round size="small" class="filter-btn" @click="handleSearch">搜索</van-button>
    </div>

    <!-- 列表 -->
    <div class="list-card">
      <van-loading v-if="loading" class="loading-center" size="20" />
      <template v-else>
        <div v-for="row in list" :key="row.id" class="comm-item">
          <div class="comm-top">
            <span class="comm-order-no">订单 {{ row.orderNo }}</span>
            <span class="comm-status comm-settled">已结算</span>
          </div>
          <div class="comm-goods">{{ row.spuName }}<span v-if="row.categoryName" class="comm-cat"> / {{ row.categoryName }}</span></div>
          <div class="comm-row">
            <span>实付：¥{{ row.totalPrice ?? '0.00' }}</span>
            <span>佣金：¥{{ row.commissionAmount ?? '0.00' }} ({{ row.commissionRate }}%)</span>
            <span class="comm-income">到账：¥{{ row.merchantIncome ?? '0.00' }}</span>
          </div>
          <div class="comm-time">{{ row.createTime }}</div>
        </div>
        <van-empty v-if="list.length === 0" description="暂无分佣记录" />
      </template>
      <van-pagination v-if="total > 0" v-model="page" :page-count="pageCount" mode="simple" @change="loadData" class="fund-pagination" />
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCommissionPage } from '../../../api/merchant_fund.js'

const startDate = ref(''); const endDate = ref('')
const page = ref(1); const total = ref(0); const size = 10
const list = ref([]); const loading = ref(false)
const pageCount = computed(() => Math.ceil(total.value / size) || 1)

async function loadData() {
  loading.value = true
  try {
    const params = { pageNum: page.value, pageSize: size }
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const r = await getCommissionPage(params); list.value = r?.records || []; total.value = r?.total || 0
  } catch { list.value = []; total.value = 0 }
  finally { loading.value = false }
}
function handleSearch() { page.value = 1; loadData() }
onMounted(loadData)
</script>
<style scoped>
.fund-section { padding: 0 0 16px; }
.filter-bar { display: flex; gap: 6px; align-items: center; margin-bottom: 12px; }
.filter-input { border: 1.5px solid #e0dcd8; border-radius: 8px; padding: 6px 8px; font-size: 12px; color: #1a1a2e; background: #fff; outline: none; width: 100px; }
.filter-input::placeholder { color: #c8c4c0; }
.filter-sep { font-size: 12px; color: #c8c4c0; }
.filter-btn { background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 12px; height: 30px; font-size: 12px; }
.list-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.comm-item { padding: 14px 0; border-bottom: 1px solid #f5f3f0; }
.comm-item:last-child { border-bottom: none; }
.comm-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.comm-order-no { font-size: 11px; color: #9a9aae; }
.comm-status { font-size: 11px; padding: 1px 8px; border-radius: 8px; font-weight: 500; }
.comm-settled { background: #e8f8ee; color: #07c160; }
.comm-goods { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 6px; }
.comm-cat { font-size: 12px; color: #9a9aae; font-weight: 400; }
.comm-row { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #5a5a6e; margin-bottom: 4px; }
.comm-income { color: #e8573a; font-weight: 600; }
.comm-time { font-size: 11px; color: #c8c4c0; }
.loading-center { padding: 30px 0; }
.fund-pagination { margin-top: 12px; }
</style>
