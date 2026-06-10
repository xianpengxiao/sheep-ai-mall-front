<template>
  <div class="tab-goods-manage">
    <!-- 子 tab -->
    <div class="sub-tabs">
      <span class="sub-tab" :class="{ active: subTab === 'all' }" @click="subTab = 'all'">全部商品</span>
      <span class="sub-tab" :class="{ active: subTab === 'audit' }" @click="subTab = 'audit'">待审核</span>
    </div>

    <!-- ===== 全部商品 ===== -->
    <template v-if="subTab === 'all'">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <div class="filter-search">
          <van-icon name="search" size="14" color="#c8c4c0" />
          <input v-model="filters.keyword" placeholder="搜索商品名称" @input="onSearchInput" />
        </div>
        <select v-model="filters.status" class="filter-select" @change="handleSearch">
          <option value="">全部状态</option><option value="1">上架</option><option value="0">下架</option>
        </select>
        <van-button size="small" round style="border-color:#e8573a;color:#e8573a;font-size:12px;padding:0 14px;" @click="handleSearch">搜索</van-button>
      </div>

      <!-- 表格 -->
      <div class="table-wrap">
        <van-loading v-if="loading" class="loading-center" size="24" />
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>商品图片</th><th>商品名称</th><th>品牌</th><th>售价</th><th>库存</th><th>状态</th><th>创建时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="list.length === 0">
              <td colspan="8" class="empty-cell">{{ hasFilter ? '未找到匹配的商品' : '暂无商品数据' }}</td>
            </tr>
            <tr v-for="row in list" :key="row.id" class="goods-row" @click="showDetail(row)">
              <td>
                <van-image width="52" height="52" :src="row.mainImage || ''" class="goods-thumb" @error="onImgError" />
              </td>
              <td>
                <div class="goods-name">{{ row.name || '--' }}</div>
                <div v-if="row.subTitle" class="goods-sub">{{ row.subTitle }}</div>
              </td>
              <td>{{ row.brand || '--' }}</td>
              <td class="cell-price">{{ row.minPrice != null ? '¥' + row.minPrice : (row.maxPrice != null ? '¥' + row.maxPrice : '--') }}</td>
              <td>{{ row.stock ?? '--' }}</td>
              <td><span class="status-dot" :class="row.status === 1 ? 'on' : 'off'"></span>{{ row.status === 1 ? '上架' : '下架' }}</td>
              <td class="cell-time">{{ row.createTime ? fmt(row.createTime) : '--' }}</td>
              <td class="cell-actions">
                <van-button v-if="row.status === 1" size="small" plain round class="btn-off" @click="toggleStatus(row, 0)">下架</van-button>
                <van-button v-else size="small" plain round class="btn-on" @click="toggleStatus(row, 1)">上架</van-button>
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

      <!-- 商品详情弹窗 -->
      <van-dialog v-model:show="showDetailDialog" title="商品详情" closeable close-icon-position="top-left" class="detail-dialog" :show-confirm-button="false">
        <div class="detail-body" v-if="detailData">
          <!-- SPU 基本信息 -->
          <div class="detail-section">
            <div class="detail-header">
              <van-image width="60" height="60" :src="detailData.mainImage || ''" class="detail-thumb" />
              <div class="detail-title">
                <div class="detail-name">{{ detailData.name }}</div>
                <div v-if="detailData.subTitle" class="detail-sub">{{ detailData.subTitle }}</div>
                <div class="detail-meta">
                  <span v-if="detailData.brand">品牌：{{ detailData.brand }}</span>
                  <span>分类：{{ detailData.categoryId ?? '--' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SKU 列表 -->
          <div class="detail-section">
            <div class="section-label">SKU 列表（{{ skuList.length }}）</div>
            <table class="sku-table" v-if="skuList.length">
              <thead>
                <tr>
                  <th>规格</th><th>售价</th><th>市场价</th><th>库存</th><th>SKU编码</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sku in skuList" :key="sku.id">
                  <td>{{ sku.skuName || '--' }}</td>
                  <td class="cell-price">¥{{ sku.price }}</td>
                  <td class="cell-old" v-if="sku.oldPrice">¥{{ sku.oldPrice }}</td>
                  <td v-else>--</td>
                  <td>{{ sku.stock ?? '--' }}</td>
                  <td class="cell-code">{{ sku.skuCode || '--' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="empty-sku">暂无 SKU 数据</div>
          </div>
        </div>
        <div class="detail-body" v-else>
          <van-loading class="loading-center" size="20" />
        </div>
      </van-dialog>
    </template>

    <!-- ===== 待审核 ===== -->
    <template v-if="subTab === 'audit'">
      <div class="table-wrap">
        <van-loading v-if="auditLoading" class="loading-center" size="24" />
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>商品图片</th><th>商品名称</th><th>品牌</th><th>商家ID</th><th>创建时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="auditList.length === 0">
              <td colspan="6" class="empty-cell">暂无待审核商品</td>
            </tr>
            <tr v-for="item in auditList" :key="item.id">
              <td>
                <van-image width="52" height="52" :src="item.mainImage || ''" class="goods-thumb" @error="onImgError" />
              </td>
              <td>
                <div class="goods-name">{{ item.name || '未命名' }}</div>
                <div v-if="item.subTitle" class="goods-sub">{{ item.subTitle }}</div>
              </td>
              <td>{{ item.brand || '--' }}</td>
              <td>{{ item.merchantId ?? '--' }}</td>
              <td class="cell-time">{{ item.createTime ? fmt(item.createTime) : '--' }}</td>
              <td class="cell-actions">
                <van-button size="small" plain round class="btn-reject" @click="openReject(item)">驳回</van-button>
                <van-button size="small" round class="btn-approve" @click="handleApprove(item)">通过</van-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination-bar" v-if="auditTotal > 0">
        <van-pagination v-model="auditPage" :page-count="auditPageCount" mode="simple" @change="loadAuditData" />
        <span class="page-info">共 {{ auditTotal }} 条</span>
      </div>

      <!-- 驳回弹窗 -->
      <van-dialog
        v-model:show="showReject"
        title="驳回原因"
        show-cancel-button
        confirm-button-color="#e8573a"
        @confirm="confirmReject"
      >
        <van-field
          v-model="rejectMsg"
          label="驳回原因"
          type="textarea"
          :rows="3"
          autosize
          placeholder="请填写驳回原因"
          maxlength="200"
        />
      </van-dialog>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { getSpuPage, toggleSpuStatus, getSkuBySpuId, getSpuDetail } from '../../../api/goods.js'
import { getPendingAuditGoods, auditGoods } from '../../../api/admin.js'

// ── 子 tab ──
const subTab = ref('all')

// ── 筛选 ──
const filters = ref({ keyword: '', status: '' })
const hasFilter = computed(() => filters.value.keyword || filters.value.status !== '')
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
    if (filters.value.status !== '') params.status = filters.value.status
    const data = await getSpuPage(params)
    list.value = data?.records || []
    total.value = data?.total || 0
  } catch { showToast('加载失败') }
  finally { loading.value = false }
}

// ── 待审核 ──
const auditList = ref([])
const auditLoading = ref(false)
const auditPage = ref(1)
const auditTotal = ref(0)
const auditPageCount = computed(() => Math.ceil(auditTotal.value / size) || 1)

async function loadAuditData() {
  auditLoading.value = true
  try {
    const data = await getPendingAuditGoods({ pageNum: auditPage.value, pageSize: size })
    auditList.value = data?.records || []
    auditTotal.value = data?.total || 0
  } catch (e) {
    if (e?.response?.status === 403) showToast('暂无审核权限')
    else showToast('加载失败')
  } finally {
    auditLoading.value = false
  }
}

// ── 审核：通过 ──
async function handleApprove(item) {
  try {
    await auditGoods(item.id, 1)
    showToast('审核通过')
    afterAuditAction(item)
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    if (msg.includes('已审核') || msg.includes('重复')) {
      showToast('该商品已被审核')
      afterAuditAction(item, true)
    }
  }
}

// ── 审核：驳回 ──
const showReject = ref(false)
const rejectMsg = ref('')
const rejectTarget = ref(null)

function openReject(item) {
  rejectTarget.value = item
  rejectMsg.value = ''
  showReject.value = true
}

async function confirmReject() {
  if (!rejectMsg.value.trim()) {
    showToast('请填写驳回原因')
    return false
  }
  try {
    await auditGoods(rejectTarget.value.id, 2, rejectMsg.value.trim())
    showToast('已驳回')
    showReject.value = false
    afterAuditAction(rejectTarget.value)
    return true
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    if (msg.includes('已审核') || msg.includes('重复')) {
      showToast('该商品已被审核')
      afterAuditAction(rejectTarget.value, true)
    }
    return false
  }
}

function afterAuditAction(item) {
  auditList.value = auditList.value.filter(i => i.id !== item.id)
  if (auditList.value.length === 0 && auditPage.value > 1) {
    auditPage.value--
    loadAuditData()
  }
}

// ── 图片加载失败 ──
function onImgError(event) {
  event.target.src = ''
  event.target.style.display = 'none'
}

// ── 上下架 ──
async function toggleStatus(row, newStatus) {
  const action = newStatus === 1 ? '上架' : '下架'
  try {
    await showConfirmDialog({ title: action + '商品', message: '确定要' + action + '该商品吗？', confirmButtonColor: '#e8573a' })
    await toggleSpuStatus(row.id, newStatus)
    showToast(action + '成功')
    row.status = newStatus
  } catch (e) {
    if (e !== 'cancel' && e !== undefined) showToast('操作失败')
  }
}

// ── 工具 ──
function fmt(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── 商品详情弹窗 ──
const showDetailDialog = ref(false)
const detailData = ref(null)
const skuList = ref([])

async function showDetail(row) {
  showDetailDialog.value = true
  detailData.value = null
  skuList.value = []
  try {
    const [spu, skus] = await Promise.all([
      getSpuDetail(row.id),
      getSkuBySpuId(row.id),
    ])
    detailData.value = spu
    skuList.value = Array.isArray(skus) ? skus : []
  } catch {
    showToast('加载详情失败')
  }
}

onMounted(loadData)

watch(subTab, (val) => {
  if (val === 'audit') loadAuditData()
  else if (val === 'all') loadData()
})
</script>

<style scoped>
.tab-goods-manage { font-size: 13px; }
.loading-center { padding: 60px 0; }

/* ── 子 tab ── */
.sub-tabs {
  display: flex; gap: 24px; margin-bottom: 16px;
  border-bottom: 1.5px solid #eeeae6; padding-bottom: 8px;
}
.sub-tab {
  font-size: 14px; font-weight: 500; color: #5a5a6e;
  cursor: pointer; padding-bottom: 8px; margin-bottom: -9px;
  border-bottom: 2px solid transparent; user-select: none;
  transition: color 0.2s;
}
.sub-tab:hover { color: #1a1a2e; }
.sub-tab.active {
  color: #1a1a2e; font-weight: 600;
  border-bottom-color: #e8573a;
}

/* ── 筛选栏 ── */
.filter-bar {
  display: flex; gap: 8px; margin-bottom: 14px; align-items: center; flex-wrap: wrap;
}
.filter-search {
  display: flex; align-items: center; gap: 6px;
  background: #fff; border: 1.5px solid #eeeae6; border-radius: 8px;
  padding: 0 10px; max-width: 220px;
}
.filter-search input {
  flex: 1; border: none; outline: none; font-size: 13px;
  padding: 7px 0; background: transparent; color: #1a1a2e; min-width: 120px;
}
.filter-search input::placeholder { color: #c8c4c0; }
.filter-select {
  border: 1.5px solid #eeeae6; border-radius: 8px; padding: 6px 8px;
  font-size: 12px; color: #1a1a2e; background: #fff; outline: none;
}

/* ── 表格 ── */
.table-wrap { overflow-x: auto; }
.data-table {
  width: 100%; min-width: 820px; border-collapse: collapse;
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.data-table th {
  padding: 11px 10px; text-align: left; font-weight: 600;
  color: #5a5a6e; background: #faf8f6;
  border-bottom: 1px solid #eeeae6; white-space: nowrap; font-size: 12px;
}
.data-table td {
  padding: 10px; color: #1a1a2e;
  border-bottom: 1px solid #f5f3f0; white-space: nowrap;
}
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 12px; color: #5a5a6e; }
.cell-actions { white-space: nowrap; display: flex; gap: 6px; }
.cell-price { color: #d63031; font-weight: 600; }

.goods-thumb { border-radius: 6px; overflow: hidden; flex-shrink: 0; }
.goods-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.goods-sub { font-size: 11px; color: #9a9aae; margin-top: 1px; }

/* 状态圆点 */
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
.status-dot.on { background: #2e7d32; }
.status-dot.off { background: #c8c4c0; }

/* 按钮 */
.btn-on { border-color: #2e7d32 !important; color: #2e7d32 !important; font-size: 12px; padding: 0 10px; }
.btn-off { border-color: #c62828 !important; color: #c62828 !important; font-size: 12px; padding: 0 10px; }

/* ── 审核按钮 ── */
.btn-reject {
  border-color: #e8573a !important;
  color: #e8573a !important;
  font-size: 12px; padding: 0 10px;
}
.btn-approve {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important;
  font-size: 12px; padding: 0 10px;
}

/* 分页 */
.pagination-bar {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; margin-top: 16px;
}
.page-info { font-size: 12px; color: #9a9aae; }

/* ── 行点击 ── */
.goods-row { cursor: pointer; }

/* ── 商品详情弹窗 ── */
.detail-dialog :deep(.van-dialog__header) { font-weight: 600; font-size: 16px; padding: 16px 20px 0; }
.detail-body { padding: 12px 20px 20px; max-height: 520px; overflow-y: auto; }
.detail-section { margin-bottom: 16px; }
.detail-header { display: flex; gap: 14px; }
.detail-thumb { border-radius: 8px; flex-shrink: 0; }
.detail-title { flex: 1; min-width: 0; }
.detail-name { font-size: 15px; font-weight: 600; color: #1a1a2e; margin-bottom: 2px; }
.detail-sub { font-size: 12px; color: #9a9aae; margin-bottom: 6px; }
.detail-meta { display: flex; gap: 12px; font-size: 12px; color: #5a5a6e; }
.section-label { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; }
.sku-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.sku-table th {
  padding: 8px 6px; text-align: left; font-weight: 600;
  color: #5a5a6e; background: #faf8f6;
  border-bottom: 1px solid #eeeae6; white-space: nowrap;
}
.sku-table td { padding: 8px 6px; border-bottom: 1px solid #f5f3f0; color: #1a1a2e; }
.cell-old { color: #9a9aae; text-decoration: line-through; font-size: 11px; }
.cell-code { font-family: monospace; font-size: 11px; color: #5a5a6e; }
.empty-sku { text-align: center; color: #9a9aae; padding: 20px 0; font-size: 12px; }
</style>