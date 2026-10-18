<template>
  <div class="page-merchant-aftersale">
    <div class="nav-sticky">
      <NavBar title="售后管理" />
    </div>

    <van-tabs v-model:active="activeTab" color="#e8573a" title-active-color="#e8573a" @change="loadList">
      <van-tab title="全部" name="" />
      <van-tab title="待处理" name="PENDING" />
      <van-tab title="已完结" name="APPROVED" />
      <van-tab title="已拒绝" name="REJECTED" />
    </van-tabs>

    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>
    <div v-else-if="list.length === 0" class="state-wrap">
      <van-empty description="暂无售后单" />
    </div>

    <van-list
      v-else
      v-model:loading="loadingMore"
      :finished="finished"
      finished-text="没有更多了"
      @load="loadMore"
    >
      <div v-for="item in list" :key="item.id" class="as-card">
        <div class="as-head">
          <span class="as-no">订单 {{ item.orderNo }}</span>
          <span class="as-status" :class="'st-' + item.status">{{ statusText(item.status) }}</span>
        </div>
        <!-- 订单商品明细 -->
        <div v-if="item.items && item.items.length" class="as-items">
          <div v-for="(it, ii) in item.items" :key="ii" class="as-item">
            <van-image v-if="it.image" :src="it.image" width="44" height="44" fit="cover" class="as-item-img" />
            <div class="as-item-info">
              <div class="as-item-name">{{ it.spuName || it.skuName }}</div>
              <div class="as-item-spec">{{ it.skuName }} ×{{ it.quantity }}</div>
            </div>
          </div>
        </div>
        <div class="as-row">
          <span class="as-label">类型</span>
          <span>{{ typeText(item.type) }}</span>
        </div>
        <div class="as-row">
          <span class="as-label">{{ isRefundType(item.type) ? '退款金额' : '订单实付' }}</span>
          <span class="as-amount">¥{{ Number(item.refundAmount || 0).toFixed(2) }}</span>
        </div>
        <div v-if="item.reason" class="as-row">
          <span class="as-label">申请原因</span>
          <span class="as-reason">{{ item.reason }}</span>
        </div>
        <div v-if="item.status === 'REJECTED' && item.rejectReason" class="as-row">
          <span class="as-label">拒绝原因</span>
          <span class="as-reason">{{ item.rejectReason }}</span>
        </div>
        <div class="as-time">申请时间：{{ formatTime(item.createTime) }}</div>

        <!-- 操作区：仅待处理可操作 -->
        <div v-if="item.status === 'PENDING'" class="as-actions">
          <van-button round size="small" plain class="as-btn" @click="handleReject(item)">拒绝</van-button>
          <van-button round size="small" type="primary" class="as-btn primary" :loading="item._approving" @click="handleApprove(item)">
            同意{{ isRefundType(item.type) ? '并退款' : '' }}
          </van-button>
        </div>
      </div>
    </van-list>
    <van-dialog
      v-model:show="rejectDialog.show"
      title="拒绝售后"
      show-cancel-button
      :before-close="confirmReject"
    >
      <div class="reject-dialog-body">
        <van-field
          v-model="rejectDialog.reason"
          placeholder="请填写拒绝原因"
          maxlength="200"
          type="textarea"
          rows="2"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import NavBar from '../../components/NavBar.vue'
import { getMerchantAfterSales, approveAfterSale, rejectAfterSale } from '../../api/afterSale.js'

const activeTab = ref('')
const loading = ref(true)
const loadingMore = ref(false)
const finished = ref(false)
const list = ref([])
let pageNum = 1

// 拒绝弹窗
const rejectDialog = ref({ show: false, reason: '', target: null })

function openReject(item) {
  rejectDialog.value = { show: true, reason: '', target: item }
}

async function confirmReject(action) {
  if (action !== 'confirm') return true
  const reason = rejectDialog.value.reason?.trim() || ''
  if (!reason) { showToast('请填写拒绝原因'); return false }
  try {
    await rejectAfterSale(rejectDialog.value.target.id, reason)
    showToast('已拒绝')
    await loadList()
    return true
  } catch { /* 统一 toast，保持弹窗可重试 */ return false }
}

function typeText(t) {
  return { REFUND_ONLY: '仅退款', RETURN_REFUND: '退货退款', EXCHANGE: '换货' }[t] || t || '--'
}

function isRefundType(t) {
  return t === 'REFUND_ONLY' || t === 'RETURN_REFUND'
}

function statusText(s) {
  return { PENDING: '待处理', APPROVED: '已完结', REJECTED: '已拒绝' }[s] || s || '--'
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function fetchPage(reset) {
  if (reset) { pageNum = 1; list.value = []; finished.value = false }
  const data = await getMerchantAfterSales({ pageNum, pageSize: 10, status: activeTab.value || undefined })
  const records = data?.records || []
  list.value.push(...records)
  if (!data || pageNum >= (data.pages || 1) || records.length < 10) finished.value = true
  pageNum++
}

async function loadList() {
  loading.value = true
  try { await fetchPage(true) } catch { /* 统一 toast */ } finally { loading.value = false }
}

async function loadMore() {
  loadingMore.value = true
  try { await fetchPage(false) } catch { finished.value = true } finally { loadingMore.value = false }
}

async function handleApprove(item) {
  const tip = isRefundType(item.type)
    ? `同意后将立即给用户退款 ¥${Number(item.refundAmount || 0).toFixed(2)}，并扣减本店可用余额。是否继续？`
    : '同意换货后售后单将完结，请线下安排寄出新商品。是否继续？'
  try {
    await showConfirmDialog({ title: '同意售后', message: tip, confirmButtonColor: '#e8573a' })
  } catch { return }
  item._approving = true
  try {
    await approveAfterSale(item.id)
    showToast('已同意')
    await loadList()
  } catch { /* 失败（如微信退款异常）由 request.js 统一 toast，状态未变可重试 */ }
  finally { item._approving = false }
}

async function handleReject(item) {
  openReject(item)
}

onMounted(loadList)
</script>

<style scoped>
.page-merchant-aftersale {
  min-height: 100vh;
  background: #f5f3f0;
}
.nav-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
}
.state-wrap {
  padding: 60px 0;
  text-align: center;
}
.as-card {
  margin: 10px 12px;
  padding: 14px;
  background: #fff;
  border-radius: 10px;
}
.as-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.as-no {
  font-size: 13px;
  color: #9a9aae;
}
.as-status {
  font-size: 13px;
  font-weight: 600;
}
.as-status.st-PENDING { color: #c8a04a; }
.as-status.st-APPROVED { color: #07c160; }
.as-status.st-REJECTED { color: #9a9aae; }
.as-row {
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: #3a3a4a;
  margin-bottom: 6px;
}
.as-label {
  color: #9a9aae;
  flex-shrink: 0;
}
.as-amount {
  color: #e8573a;
  font-weight: 600;
}
.as-reason {
  word-break: break-all;
}
.as-time {
  margin-top: 8px;
  font-size: 11px;
  color: #bababa;
}
.as-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0 10px;
  margin-bottom: 8px;
  border-bottom: 1px dashed #f0ece8;
}
.as-item {
  display: flex;
  gap: 10px;
  align-items: center;
}
.as-item-img {
  border-radius: 6px;
  flex-shrink: 0;
}
.as-item-info {
  min-width: 0;
}
.as-item-name {
  font-size: 13px;
  color: #3a3a4a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.as-item-spec {
  font-size: 11px;
  color: #9a9aae;
  margin-top: 2px;
}
.as-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f5f3f0;
}
.as-btn.primary {
  background: linear-gradient(135deg, #f06a4a, #e8573a);
  border: none;
}
.reject-dialog-body {
  padding: 12px 16px 16px;
}
</style>
