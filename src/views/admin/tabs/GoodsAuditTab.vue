<template>
  <div class="tab-goods">
    <div class="section-header">
      <span class="section-title">待审核商品</span>
      <span class="section-count" v-if="total > 0">共 {{ total }} 条</span>
    </div>

    <!-- 表格 -->
    <div class="table-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>商品图片</th>
            <th>商品名称</th>
            <th>品牌</th>
            <th>商家ID</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="list.length === 0">
            <td colspan="6" class="empty-cell">暂无待审核商品</td>
          </tr>
          <tr v-for="item in list" :key="item.id">
            <td>
              <van-image
                width="56" height="56"
                :src="item.mainImage || ''"
                class="goods-img"
                @error="onImgError($event, item)"
              />
            </td>
            <td>
              <div class="goods-name">{{ item.name || '未命名' }}</div>
              <div class="goods-sub" v-if="item.subTitle">{{ item.subTitle }}</div>
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
    <div class="pagination-bar" v-if="total > 0">
      <van-pagination v-model="page" :page-count="pageCount" mode="simple" @change="loadData" />
      <span class="page-info">共 {{ total }} 条</span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { getPendingAuditGoods, auditGoods } from '../../../api/admin.js'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 10
const pageCount = computed(() => Math.ceil(total.value / pageSize) || 1)

async function loadData() {
  loading.value = true
  try {
    const data = await getPendingAuditGoods({ pageNum: page.value, pageSize })
    list.value = data?.records || []
    total.value = data?.total || 0
  } catch (e) {
    if (e?.response?.status === 403) showToast('暂无审核权限')
    else showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// ── 图片加载失败 ──
function onImgError(event, item) {
  event.target.src = ''
  event.target.style.display = 'none'
}

// ── 通过 ──
async function handleApprove(item) {
  try {
    await auditGoods(item.id, 1)
    showToast('审核通过')
    afterAction(item)
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    if (msg.includes('已审核') || msg.includes('重复')) {
      showToast('该商品已被审核')
      afterAction(item, true)
    }
  }
}

// ── 驳回 ──
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
    afterAction(rejectTarget.value)
    return true
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    if (msg.includes('已审核') || msg.includes('重复')) {
      showToast('该商品已被审核')
      afterAction(rejectTarget.value, true)
    }
    return false
  }
}

// ── 操作后处理：移除当前项 + 自动回退页码 ──
function afterAction(item, noRemove = false) {
  if (!noRemove) {
    list.value = list.value.filter(i => i.id !== item.id)
  } else {
    // 即使已审核也从列表移除（因 auditStatus 已变）
    list.value = list.value.filter(i => i.id !== item.id)
  }
  // 当前页记录全部操作完，回到上一页
  if (list.value.length === 0 && page.value > 1) {
    page.value--
    loadData()
  }
}

// ── 工具 ──
function fmt(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(loadData)
</script>

<style scoped>
.tab-goods { font-size: 13px; }
.loading-center { padding: 60px 0; }

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.section-title { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.section-count { font-size: 12px; color: #9a9aae; }

/* ── 表格 ── */
.table-wrap { overflow-x: auto; }

.data-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.data-table th {
  padding: 11px 10px;
  text-align: left;
  font-weight: 600;
  color: #5a5a6e;
  background: #faf8f6;
  border-bottom: 1px solid #eeeae6;
  white-space: nowrap;
  font-size: 12px;
}
.data-table td {
  padding: 10px;
  color: #1a1a2e;
  border-bottom: 1px solid #f5f3f0;
  white-space: nowrap;
}
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 12px; color: #5a5a6e; }
.cell-actions { white-space: nowrap; display: flex; gap: 8px; }

.goods-img { border-radius: 6px; overflow: hidden; flex-shrink: 0; }
.goods-name { font-weight: 600; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.goods-sub { font-size: 11px; color: #9a9aae; margin-top: 1px; }

/* ── 按钮 ── */
.btn-reject {
  border-color: #e8573a !important;
  color: #e8573a !important;
  font-size: 12px;
  padding: 0 10px;
}
.btn-approve {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  font-size: 12px;
  padding: 0 10px;
}

/* ── 分页 ── */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}
.page-info { font-size: 12px; color: #9a9aae; }
</style>
