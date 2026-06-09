<template>
  <div class="tab-review">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-search">
        <van-icon name="search" size="14" color="#c8c4c0" />
        <input v-model="filters.keyword" placeholder="搜索商品名/评价内容/用户名" @input="onSearchInput" />
      </div>
      <select v-model="filters.rating" class="filter-select" @change="handleSearch">
        <option value="">全部评分</option><option value="5">5星</option><option value="4">4星</option>
        <option value="3">3星</option><option value="2">2星</option><option value="1">1星</option>
      </select>
      <select v-model="filters.status" class="filter-select" @change="handleSearch">
        <option value="">全部状态</option><option value="1">显示</option><option value="0">隐藏</option>
      </select>
      <input v-model="filters.startTime" type="date" class="filter-date" @change="handleSearch" />
      <span style="color:#c8c4c0;font-size:12px;">~</span>
      <input v-model="filters.endTime" type="date" class="filter-date" @change="handleSearch" />
      <van-button size="small" round style="border-color:#e8573a;color:#e8573a;font-size:12px;padding:0 14px;" @click="handleSearch">搜索</van-button>
    </div>

    <!-- 表格 -->
    <div class="table-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>商品信息</th><th>用户</th><th>评分</th><th>评价内容</th><th>评价图片</th><th>显示状态</th><th>评价时间</th>
            <th v-if="hasActionPerm">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="list.length === 0">
            <td colspan="8" class="empty-cell">{{ hasFilter ? '未找到匹配的评价' : '暂无评价数据' }}</td>
          </tr>
          <tr v-for="row in list" :key="row.id">
            <td>
              <div class="goods-cell">
                <span class="goods-name">{{ row.spuName || '--' }}</span>
                <span v-if="row.skuName" class="goods-sku">{{ row.skuName }}</span>
              </div>
            </td>
            <td>
              <div class="user-cell">
                <van-image v-if="row.avatar" :src="row.avatar" round width="28" height="28" />
                <span v-else class="user-placeholder">{{ (row.username || '?')[0] }}</span>
                <span class="user-name">{{ row.username || '--' }}</span>
              </div>
            </td>
            <td>
              <span class="star-display" :title="'描述:'+ (row.describeScore||'-') +' 服务:'+ (row.serviceScore||'-') +' 物流:'+ (row.logisticsScore||'-')">
                {{ '★'.repeat(row.rating || 0) }}{{ '☆'.repeat(5 - (row.rating || 0)) }}
              </span>
            </td>
            <td>
              <div class="content-cell" :class="{ expanded: row._expanded }" @click="toggleContent(row)">
                {{ row._expanded ? (row.content || '--') : ((row.content || '').slice(0, 50) + ((row.content||'').length > 50 ? '...' : '')) }}
              </div>
            </td>
            <td>
              <div class="img-cell" v-if="row.imageList?.length">
                <van-image v-for="(img, i) in row.imageList.slice(0, 3)" :key="i" :src="img" width="36" height="36" class="thumb-img" @click="previewImgs = row.imageList; previewStart = i" />
              </div>
              <span v-else style="color:#c8c4c0">--</span>
            </td>
            <td><span class="status-tag" :class="row.status === 1 ? 'on' : 'off'">{{ row.status === 1 ? '显示' : '隐藏' }}</span></td>
            <td class="cell-time">{{ row.createTime ? fmt(row.createTime) : '--' }}</td>
            <td v-if="hasActionPerm" class="cell-actions">
              <van-button v-if="hasPerm('review:manage')" size="small" plain round :class="row.status === 1 ? 'btn-warn' : 'btn-ok'" @click="toggleStatus(row)">
                {{ row.status === 1 ? '隐藏' : '显示' }}
              </van-button>
              <van-button v-if="hasPerm('review:delete')" size="small" plain round class="btn-muted" @click="handleDelete(row)">删除</van-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pagination-bar" v-if="total > 0">
      <van-pagination v-model="page" :page-count="pageCount" mode="simple" @change="loadData" />
      <span class="page-info">共 {{ total }} 条</span>
    </div>

    <!-- 图片预览 -->
    <van-image-preview v-model:show="showPreview" :images="previewImgs" :start-position="previewStart" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '../../../stores/user.js'
import { getReviewList, setReviewStatus, deleteReview } from '../../../api/admin.js'

const userStore = useUserStore()
function hasPerm(p) { return Array.isArray(userStore.permissions) && userStore.permissions.includes(p) }
const canView = computed(() => hasPerm('review:list') || hasPerm('review:manage') || hasPerm('review:delete'))
const hasActionPerm = computed(() => hasPerm('review:manage') || hasPerm('review:delete'))

// ── 筛选 ──
const filters = ref({ keyword: '', rating: '', status: '', startTime: '', endTime: '' })
const hasFilter = computed(() => filters.value.keyword || filters.value.rating || filters.value.status || filters.value.startTime || filters.value.endTime)
let searchTimer = null

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; loadData() }, 300)
}
function handleSearch() { page.value = 1; loadData() }

// ── 列表 ──
const list = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const size = 10
const pageCount = computed(() => Math.ceil(total.value / size) || 1)

async function loadData() {
  loading.value = true
  try {
    const params = { pageNum: page.value, pageSize: size }
    if (filters.value.keyword) params.keyword = filters.value.keyword
    if (filters.value.rating) params.rating = filters.value.rating
    if (filters.value.status !== '') params.status = filters.value.status
    if (filters.value.startTime) params.startTime = filters.value.startTime
    if (filters.value.endTime) params.endTime = filters.value.endTime
    const data = await getReviewList(params)
    list.value = (data?.records || []).map(r => ({ ...r, _expanded: false }))
    total.value = data?.total || 0
  } catch { showToast('加载失败') }
  finally { loading.value = false }
}

// ── 展开评价内容 ──
function toggleContent(row) { row._expanded = !row._expanded }

// ── 切换显示状态 ──
async function toggleStatus(row) {
  const newStatus = row.status === 1 ? 0 : 1
  try {
    await setReviewStatus(row.id, newStatus)
    row.status = newStatus
    showToast(newStatus === 1 ? '已显示' : '已隐藏')
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    if (msg.includes('不存在') || msg.includes('已删除')) { showToast('评价不存在或已删除'); loadData() }
  }
}

// ── 删除 ──
async function handleDelete(row) {
  try {
    await showConfirmDialog({ title: '确认删除', message: '确定要删除该评价吗？删除后不可恢复', confirmButtonColor: '#e8573a' })
    await deleteReview(row.id)
    showToast('已删除')
    list.value = list.value.filter(i => i.id !== row.id)
    if (list.value.length === 0 && page.value > 1) { page.value--; loadData() }
  } catch (e) {
    if (e !== 'cancel' && e !== undefined) {
      const msg = e?.response?.data?.msg || ''
      if (msg.includes('不存在') || msg.includes('已删除')) { showToast('评价不存在或已删除'); loadData() }
    }
  }
}

// ── 图片预览 ──
const showPreview = ref(false)
const previewImgs = ref([])
const previewStart = ref(0)

// ── 工具 ──
function fmt(t) {
  if (!t) return ''
  const d = new Date(t); const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(loadData)
</script>

<style scoped>
.tab-review { font-size: 13px; }
.loading-center { padding: 60px 0; }

/* ── 筛选栏 ── */
.filter-bar {
  display: flex; gap: 8px; margin-bottom: 14px; align-items: center; flex-wrap: wrap;
}
.filter-search {
  display: flex; align-items: center; gap: 6px;
  background: #fff; border: 1.5px solid #eeeae6; border-radius: 8px;
  padding: 0 10px; max-width: 200px;
}
.filter-search input {
  flex: 1; border: none; outline: none; font-size: 13px;
  padding: 7px 0; background: transparent; color: #1a1a2e; min-width: 100px;
}
.filter-search input::placeholder { color: #c8c4c0; }
.filter-select {
  border: 1.5px solid #eeeae6; border-radius: 8px; padding: 6px 8px;
  font-size: 12px; color: #1a1a2e; background: #fff; outline: none;
}
.filter-date {
  border: 1.5px solid #eeeae6; border-radius: 8px; padding: 6px 8px;
  font-size: 12px; color: #1a1a2e; background: #fff; outline: none; width: 130px;
  font-family: inherit;
}

/* ── 表格 ── */
.table-wrap { overflow-x: auto; }
.data-table {
  width: 100%; min-width: 920px; border-collapse: collapse;
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.data-table th {
  padding: 11px 8px; text-align: left; font-weight: 600;
  color: #5a5a6e; background: #faf8f6;
  border-bottom: 1px solid #eeeae6; white-space: nowrap; font-size: 12px;
}
.data-table td {
  padding: 10px 8px; color: #1a1a2e;
  border-bottom: 1px solid #f5f3f0;
  max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 12px; color: #5a5a6e; white-space: nowrap; }
.cell-actions { white-space: nowrap; display: flex; gap: 6px; }

/* 商品 */
.goods-cell { display: flex; flex-direction: column; gap: 1px; }
.goods-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
.goods-sku { font-size: 11px; color: #9a9aae; }

/* 用户 */
.user-cell { display: flex; align-items: center; gap: 6px; }
.user-placeholder {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%);
  color: #fff; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.user-name { overflow: hidden; text-overflow: ellipsis; }

/* 评分 */
.star-display {
  color: #f39c12; font-size: 14px; letter-spacing: 1px;
  cursor: help; white-space: nowrap;
}

/* 评价内容 */
.content-cell {
  font-size: 12px; color: #5a5a6e; cursor: pointer;
  max-width: 200px; line-height: 1.4;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.content-cell.expanded { white-space: normal; word-break: break-word; }

/* 图片 */
.img-cell { display: flex; gap: 4px; }
.thumb-img { border-radius: 4px; overflow: hidden; cursor: pointer; flex-shrink: 0; }

/* 状态标签 */
.status-tag { display: inline-block; font-size: 11px; padding: 2px 10px; border-radius: 10px; font-weight: 500; }
.status-tag.on { background: #e8f8e8; color: #2e7d32; }
.status-tag.off { background: #f0ece8; color: #9a9aae; }

/* 按钮 */
.btn-warn { border-color: #c62828 !important; color: #c62828 !important; font-size: 12px; padding: 0 8px; }
.btn-ok { border-color: #2e7d32 !important; color: #2e7d32 !important; font-size: 12px; padding: 0 8px; }
.btn-muted { border-color: #9a9aae !important; color: #9a9aae !important; font-size: 12px; padding: 0 8px; }

/* 分页 */
.pagination-bar {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; margin-top: 16px;
}
.page-info { font-size: 12px; color: #9a9aae; }
</style>
