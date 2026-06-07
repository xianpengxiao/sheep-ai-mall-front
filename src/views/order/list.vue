<template>
  <div class="page-order-list">
    <div class="nav-sticky">
      <NavBar title="我的订单" />
    </div>

    <!-- ═══════ 状态标签 ═══════ -->
    <div class="tabs-sticky">
      <van-tabs v-model:active="activeTab" @change="onTabChange" color="#e8573a" title-active-color="#e8573a" sticky>
        <van-tab title="所有订单" name="all" />
        <van-tab title="待付款" name="0" />
        <van-tab title="待发货" name="1" />
        <van-tab title="待收货" name="2" />
        <van-tab title="已完成" name="3" />
      </van-tabs>
    </div>

    <!-- ═══════ 加载中 ═══════ -->
    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <!-- ═══════ 空状态 ═══════ -->
    <div v-else-if="list.length === 0" class="state-wrap">
      <van-empty description="暂无订单" />
    </div>

    <!-- ═══════ 订单列表 ═══════ -->
    <template v-else>
      <div class="order-list">
        <div v-for="order in list" :key="order.id" class="order-card">
          <!-- ── 订单头部 ── -->
          <div class="order-header" @click="goDetail(order.id)">
            <div class="header-left">
              <span class="header-date">{{ formatTime(order.createTime) }}</span>
              <span class="header-id">订单号：{{ order.orderNo || order.id }}</span>
            </div>
            <div class="header-status" :class="'s-' + order.status">{{ statusLabel(order.status) }}</div>
          </div>

          <!-- ── 商品列表 ── -->
          <div class="order-items">
            <div
              v-for="(item, i) in orderItems(order)"
              :key="i"
              class="order-item"
              @click="goGoods(item.spuId)"
            >
              <van-image
                :src="item.image || item.skuImage"
                width="64"
                height="64"
                fit="cover"
                class="item-thumb"
              />
              <div class="item-info">
                <div class="item-name van-multi-ellipsis--l2">{{ item.spuName || item.skuName }}</div>
                <div class="item-spec" v-if="item.skuName && item.skuName !== item.spuName">{{ item.skuName }}</div>
              </div>
            </div>
          </div>

          <!-- ── 金额合计 ── -->
          <div class="order-summary">
            <span class="summary-text">共 {{ itemCount(order) }} 件商品 合计</span>
            <span class="summary-amount">
              实付：<em class="amount-num">&yen;{{ formatPrice(order.totalAmount) }}</em>
            </span>
          </div>

          <!-- ── 操作按钮 ── -->
          <div class="order-actions">
            <template v-if="order.status === 0">
              <van-button round size="small" plain class="action-btn" @click="handleCancel(order)">取消订单</van-button>
              <van-button round size="small" type="primary" class="action-btn primary" @click="goPay(order)">立即付款</van-button>
            </template>
            <template v-else-if="order.status === 1">
              <van-button round size="small" plain class="action-btn" @click="goDetail(order.id)">查看详情</van-button>
            </template>
            <template v-else-if="order.status === 2">
              <van-button round size="small" plain class="action-btn" @click="handleComplete(order)">确认收货</van-button>
            </template>
            <template v-else-if="order.status === 3">
              <template v-if="orderReviewState(order) === 1">
                <van-button round size="small" plain class="action-btn" @click="viewReview(order)">查看我的评论</van-button>
              </template>
              <template v-else-if="orderReviewState(order) === 2">
                <van-button round size="small" plain disabled class="action-btn action-btn-disabled" @click="showToast('该订单时间过于久远，无法评论')">无法评论</van-button>
              </template>
              <template v-else>
                <van-button round size="small" plain class="action-btn" @click="openReview(order)">评价</van-button>
              </template>
              <van-button round size="small" plain class="action-btn" @click="goDetail(order.id)">查看详情</van-button>
            </template>
            <template v-else-if="order.status === 4">
              <van-button round size="small" plain class="action-btn" @click="goDetail(order.id)">查看详情</van-button>
            </template>
            <!-- 再买一单 -->
            <van-button
              round
              size="small"
              class="action-btn rebuy"
              @click="handleRebuy(order)"
            >再买一单</van-button>
          </div>
        </div>
      </div>

      <!-- ── 分页 ── -->
      <div class="pagination-wrap" v-if="totalPages > 1">
        <van-pagination
          v-model="pageNum"
          :total-items="total"
          :items-per-page="pageSize"
          @change="fetchOrders"
          mode="simple"
          prev-text="上一页"
          next-text="下一页"
        />
      </div>
    </template>

    <!-- ═══════ 评价弹窗 ═══════ -->
    <van-popup
      v-model:show="showReview"
      position="bottom"
      round
      :style="{ maxHeight: '80vh' }"
      closeable
      close-icon-position="top-left"
    >
      <div class="review-popup">
        <div class="review-popup-title">评价商品</div>

        <!-- 被评价的商品 -->
        <div class="review-items" v-if="reviewingItems.length > 0">
          <div v-for="(item, i) in reviewingItems" :key="i" class="review-item">
            <van-image
              :src="item.image || item.skuImage"
              width="44"
              height="44"
              fit="cover"
              class="review-item-img"
            />
            <div class="review-item-info">
              <div class="review-item-name van-multi-ellipsis--l2">{{ item.spuName || item.skuName }}</div>
              <div class="review-item-spec" v-if="item.skuName && item.skuName !== item.spuName">{{ item.skuName }}</div>
            </div>
          </div>
        </div>

        <!-- DSR 三维评分 -->
        <div class="review-dsr">
          <div class="review-dsr-item">
            <span class="review-dsr-label">描述相符</span>
            <van-rate v-model="reviewForm.describeScore" :count="5" size="20" color="#f39c12" void-color="#ddd" />
          </div>
          <div class="review-dsr-item">
            <span class="review-dsr-label">服务态度</span>
            <van-rate v-model="reviewForm.serviceScore" :count="5" size="20" color="#f39c12" void-color="#ddd" />
          </div>
          <div class="review-dsr-item">
            <span class="review-dsr-label">物流服务</span>
            <van-rate v-model="reviewForm.logisticsScore" :count="5" size="20" color="#f39c12" void-color="#ddd" />
          </div>
        </div>

        <!-- 图片上传（参考头像上传模式） -->
        <div class="review-uploader-block">
          <div class="review-uploader-label">上传图片（选填）</div>
          <div class="review-image-grid">
            <div v-for="(img, i) in reviewImageList" :key="i" class="review-image-cell">
              <van-image :src="img.preview" width="72" height="72" fit="cover" class="review-image-preview" />
              <van-icon name="close" class="review-image-remove" @click="removeReviewImage(i)" />
            </div>
            <div v-if="reviewImageList.length < 6" class="review-image-cell review-image-add" @click="reviewFileInputRef?.click()">
              <van-icon name="photograph" size="28" color="#c8c4c0" />
            </div>
          </div>
          <input ref="reviewFileInputRef" type="file" accept="image/*" multiple class="file-input-hidden" @change="onReviewFileSelected" />
        </div>

        <!-- 评价内容 -->
        <van-field
          v-model="reviewForm.content"
          type="textarea"
          placeholder="说说你的购物体验…"
          :maxlength="500"
          rows="4"
          show-word-limit
          class="review-textarea"
        />

        <van-button
          round
          type="primary"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          class="review-submit"
          :loading="reviewSubmitting"
          @click="handleSubmitReview"
        >提交评价</van-button>
      </div>
    </van-popup>

    <!-- ═══════ 查看我的评论弹窗 ═══════ -->
    <van-popup
      v-model:show="showReviewDetail"
      position="bottom"
      round
      :style="{ maxHeight: '80vh' }"
      closeable
      close-icon-position="top-left"
    >
      <div class="state-wrap" v-if="loadingDetail" style="min-height:200px">
        <van-loading size="24" color="#e8573a">加载中...</van-loading>
      </div>
      <div class="review-popup" v-else-if="reviewDetail">
        <div class="review-popup-title">我的评论</div>

        <!-- 商品信息 -->
        <div class="review-items">
          <div class="review-item">
            <van-image
              :src="reviewDetail.skuImage || reviewDetail.spuImage"
              width="44"
              height="44"
              fit="cover"
              class="review-item-img"
            />
            <div class="review-item-info">
              <div class="review-item-name van-multi-ellipsis--l2">{{ reviewDetail.spuName }}</div>
              <div class="review-item-spec" v-if="reviewDetail.skuName">{{ reviewDetail.skuName }}</div>
            </div>
          </div>
        </div>

        <!-- DSR 评分（只读） -->
        <div class="review-dsr">
          <div class="review-dsr-item">
            <span class="review-dsr-label">描述相符</span>
            <van-rate v-model="reviewDetail.describeScore" :count="5" size="20" color="#f39c12" void-color="#ddd" readonly />
          </div>
          <div class="review-dsr-item">
            <span class="review-dsr-label">服务态度</span>
            <van-rate v-model="reviewDetail.serviceScore" :count="5" size="20" color="#f39c12" void-color="#ddd" readonly />
          </div>
          <div class="review-dsr-item">
            <span class="review-dsr-label">物流服务</span>
            <van-rate v-model="reviewDetail.logisticsScore" :count="5" size="20" color="#f39c12" void-color="#ddd" readonly />
          </div>
        </div>

        <!-- 评价内容 -->
        <p class="review-detail-content">{{ reviewDetail.content }}</p>

        <!-- 评价图片 -->
        <div class="review-image-grid" v-if="reviewDetail.imageList?.length">
          <div v-for="(img, i) in reviewDetail.imageList" :key="i" class="review-image-cell review-image-cell-done">
            <van-image :src="img" width="72" height="72" fit="cover" class="review-image-preview" />
          </div>
        </div>

        <!-- 评价时间 -->
        <div class="review-detail-time">{{ formatTime(reviewDetail.createTime) }}</div>

        <!-- 操作按钮 -->
        <div class="review-detail-actions">
          <van-button
            round
            plain
            size="small"
            class="review-detail-btn"
            @click="handleToggleStatus"
          >{{ reviewDetail.status === 1 ? '隐藏评论' : '显示评论' }}</van-button>
          <van-button
            round
            plain
            size="small"
            class="review-detail-btn review-detail-btn-danger"
            @click="handleDeleteReview"
          >删除评论</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showConfirmDialog, showLoadingToast, closeToast } from 'vant'
import { getOrderList, cancelOrder, completeOrder, submitReview, getOrderReview, updateReviewStatus, deleteReview } from '../../api/order.js'
import { uploadImage } from '../../api/merchant.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()
const route = useRoute()

const activeTab = ref('all')
const list = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

// ── 状态标签映射 ──
const statusMap = { 0: '待付款', 1: '待发货', 2: '待收货', 3: '已完成', 4: '已取消' }
function statusLabel(status) {
  return statusMap[status] || '未知'
}

// ── 工具 ──
function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 兼容不同后端字段名获取订单商品列表
function orderItems(order) {
  return order.items || order.orderItems || order.orderItemList || order.itemList || []
}

function itemCount(order) {
  return orderItems(order).reduce((s, i) => s + (i.quantity || 0), 0)
}

// ── 订单评价状态：0 可评价 / 1 已评价 / 2 已过期 ──
const REVIEWED_KEY = 'order_reviewed_ids'
const reviewedIds = ref(new Set(loadReviewedIds()))

function loadReviewedIds() {
  try {
    const raw = localStorage.getItem(REVIEWED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveReviewedId(id) {
  reviewedIds.value.add(id)
  localStorage.setItem(REVIEWED_KEY, JSON.stringify([...reviewedIds.value]))
}

function orderReviewState(order) {
  if (!order) return 0
  // 本地已提交评价
  if (reviewedIds.value.has(order.id)) return 1
  // 后端返回的字段
  if (order.reviewStatus === 1 || order.reviewed) return 1
  if (order.reviewStatus === 2) return 2
  const items = orderItems(order)
  if (items.length === 0) return 0
  if (items.every(i => i.reviewStatus === 1 || i.reviewed)) return 1
  if (items.some(i => i.reviewStatus === 2)) return 2
  return 0
}

const showReviewDetail = ref(false)
const reviewDetail = ref(null)
const loadingDetail = ref(false)

async function viewReview(order) {
  const items = orderItems(order)
  if (items.length === 0) return
  loadingDetail.value = true
  showReviewDetail.value = true
  reviewDetail.value = null
  try {
    // 取第一个有评价的商品明细
    const reviewedItem = items.find(i => i.reviewStatus === 1 || i.reviewed) || items[0]
    const data = await getOrderReview(reviewedItem.id)
    reviewDetail.value = data
  } catch {
    showToast('获取评价失败')
    showReviewDetail.value = false
  } finally {
    loadingDetail.value = false
  }
}

const toggling = ref(false)
async function handleToggleStatus() {
  const review = reviewDetail.value
  if (!review || toggling.value) return
  toggling.value = true
  const newStatus = review.status === 1 ? 0 : 1
  try {
    await updateReviewStatus(review.id, newStatus)
    reviewDetail.value = { ...review, status: newStatus }
    showToast(newStatus === 1 ? '评论已显示' : '评论已隐藏')
  } catch {
    showToast('操作失败')
  } finally {
    toggling.value = false
  }
}

async function handleDeleteReview() {
  const review = reviewDetail.value
  if (!review) return
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确定要删除该评论吗？删除后不可恢复。',
      confirmButtonText: '确定删除',
      cancelButtonText: '再想想',
      confirmButtonColor: '#d63031',
    })
  } catch {
    return
  }
  try {
    await deleteReview(review.id)
    showToast('评论已删除')
    saveReviewedId(reviewingOrder.value?.id)
    showReviewDetail.value = false
    fetchOrders()
  } catch {
    showToast('删除失败')
  }
}

// ── 获取状态筛选参数 ──
function getStatusFilter() {
  const tab = activeTab.value
  if (tab === 'all') return undefined
  return Number(tab)
}

// ── 加载订单 ──
async function fetchOrders() {
  window.scrollTo(0, 0)
  loading.value = true
  try {
    const params = { pageNum: pageNum.value, pageSize: pageSize.value }
    const statusFilter = getStatusFilter()
    if (statusFilter !== undefined) {
      params.status = statusFilter
    }
    const res = await getOrderList(params)
    const records = res?.records || []
    total.value = res?.total ?? 0
    list.value = records

    console.log('[OrderList] status:', params.status, 'records:', records.length, 'total:', total.value)
  } catch (e) {
    console.error('[OrderList] 加载失败:', e)
    showToast('加载订单失败')
  } finally {
    loading.value = false
  }
}

// ── Tab切换 ──
function onTabChange(name) {
  activeTab.value = name
  pageNum.value = 1
  fetchOrders()
}

// ── 导航 ──
function goDetail(id) {
  router.push(`/order/detail/${id}`)
}

function goGoods(spuId) {
  if (spuId) router.push(`/goods/${spuId}`)
}

function goPay(order) {
  router.push({ name: 'Payment', query: { orderId: order.id } })
}

function goLogistics(id) {
  showToast('物流功能开发中')
}

// ── 评价 ──
const showReview = ref(false)
const reviewingOrder = ref(null)
const reviewSubmitting = ref(false)
const reviewFileInputRef = ref(null)
/** 图片列表：{ preview: base64, url: 服务器地址, uploading: boolean } */
const reviewImageList = ref([])
const reviewForm = ref({
  describeScore: 5,
  serviceScore: 5,
  logisticsScore: 5,
  content: '',
})

const reviewingItems = computed(() => {
  const order = reviewingOrder.value
  if (!order) return []
  return orderItems(order)
})

function openReview(order) {
  const items = orderItems(order)
  if (items.length === 0) { showToast('暂无待评价商品'); return }
  reviewingOrder.value = order
  reviewForm.value = { describeScore: 5, serviceScore: 5, logisticsScore: 5, content: '' }
  reviewImageList.value = []
  showReview.value = true
}

/** 选择文件：存 File 对象用于预览和上传 */
function onReviewFileSelected(e) {
  const files = Array.from(e.target.files || [])
  const remaining = 6 - reviewImageList.value.length
  for (const file of files.slice(0, remaining)) {
    const reader = new FileReader()
    const entry = { preview: '', file }
    reviewImageList.value.push(entry)
    reader.onload = (ev) => { entry.preview = ev.target?.result || '' }
    reader.readAsDataURL(file)
  }
  e.target.value = ''
}

function removeReviewImage(index) {
  reviewImageList.value.splice(index, 1)
}

async function handleSubmitReview() {
  const orderId = reviewingOrder.value?.id
  const items = reviewingItems.value
  if (!orderId || items.length === 0) return

  reviewSubmitting.value = true

  // 1. 上传所有图片，收集 URL
  const imageList = []
  for (const img of reviewImageList.value) {
    if (!img.file) continue
    try {
      const res = await uploadImage(img.file, 'goods')
      const url = res?.data?.url || res?.url || res?.data || res || ''
      if (url) imageList.push(url)
    } catch {
      showToast('部分图片上传失败')
    }
  }

  // 2. 提交评价
  let successCount = 0
  for (const item of items) {
    try {
      await submitReview({
        orderId,
        orderItemId: item.id,
        spuId: item.spuId,
        skuId: item.skuId || item.sku_id || 0,
        describeScore: reviewForm.value.describeScore,
        serviceScore: reviewForm.value.serviceScore,
        logisticsScore: reviewForm.value.logisticsScore,
        content: reviewForm.value.content || undefined,
        imageList: imageList.length > 0 ? imageList : undefined,
      })
      successCount++
    } catch (e) {
      console.error(`[Review] 评价商品[${item.spuName}]失败:`, e)
    }
  }

  reviewSubmitting.value = false
  if (successCount > 0) {
    showToast(`评价成功（${successCount}/${items.length}）`)
    saveReviewedId(orderId)
    showReview.value = false
    fetchOrders()
  } else {
    showToast('评价提交失败，请重试')
  }
}

// ── 取消订单 ──
async function handleCancel(order) {
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确定要取消该订单吗？',
      confirmButtonText: '确定',
      cancelButtonText: '再想想',
      confirmButtonColor: '#d63031',
    })
  } catch {
    return
  }
  showLoadingToast({ message: '取消中...', forbidClick: true, duration: 0 })
  try {
    await cancelOrder(order.id)
    closeToast()
    showToast('订单已取消')
    fetchOrders()
  } catch {
    closeToast()
  }
}

// ── 确认收货 ──
async function handleComplete(order) {
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确认收到商品了吗？',
      confirmButtonText: '确认',
      cancelButtonText: '再想想',
      confirmButtonColor: '#e8573a',
    })
  } catch {
    return
  }
  showLoadingToast({ message: '处理中...', forbidClick: true, duration: 0 })
  try {
    await completeOrder(order.id)
    closeToast()
    showToast('已确认收货')
    fetchOrders()
  } catch {
    closeToast()
  }
}

// ── 再买一单 ──
function handleRebuy(order) {
  const items = orderItems(order)
  if (items.length > 0) {
    const item = items[0]
    router.push(`/goods/${item.spuId}`)
  }
}

// ── 加载当前 tab 数据 ──
function loadWithTab() {
  const tab = route.query.tab
  activeTab.value = tab !== undefined ? String(tab) : 'all'
  pageNum.value = 1
  fetchOrders()
}

// ── 生命周期 ──
onMounted(() => {
  loadWithTab()
})

// keep-alive 缓存下重新激活时刷新
onActivated(() => {
  loadWithTab()
})
</script>

<style scoped>
.page-order-list {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 20px;
}
.nav-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}
.tabs-sticky {
  position: sticky;
  top: 46px;
  z-index: 50;
  background: #fff;
}

/* ── 状态容器 ── */
.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

/* ── 订单卡片 ── */
.order-list {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.order-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* ── 订单头部 ── */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f3f0;
  cursor: pointer;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.header-date {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
}
.header-id {
  font-size: 11px;
  color: #bababa;
}
.header-status {
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
.header-status.s-0 { color: #f39c12; }
.header-status.s-1 { color: #e8573a; }
.header-status.s-2 { color: #1989fa; }
.header-status.s-3 { color: #07c160; }
.header-status.s-4 { color: #9a9aae; }

/* ── 商品清单（与支付页统一） ── */
.order-items {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.item-thumb {
  flex-shrink: 0;
  border-radius: 8px;
  background: #f0ece8;
}
.item-info {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.35;
}
.item-spec {
  font-size: 12px;
  color: #bababa;
  margin-top: 4px;
}
/* ── 金额合计 ── */
.order-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid #f5f3f0;
  font-size: 13px;
  color: #5a5a6e;
}
.summary-amount {
  font-size: 13px;
}
.amount-num {
  font-style: normal;
  font-size: 16px;
  font-weight: 700;
  color: #d63031;
  font-family: 'DM Sans', 'Inter', sans-serif;
}

/* ── 操作按钮 ── */
.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f5f3f0;
  flex-wrap: wrap;
}
.action-btn {
  height: 30px;
  font-size: 12px;
  padding: 0 14px;
  border-color: #e0dcd8;
  color: #5a5a6e;
}
.action-btn.primary {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  border: none;
  color: #fff;
}
.action-btn.rebuy {
  border-color: #e8573a;
  color: #e8573a;
}
.action-btn-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── 分页 ── */
.pagination-wrap {
  padding: 20px 16px;
  display: flex;
  justify-content: center;
}
.pagination-wrap :deep(.van-pagination) {
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid #e8e4e0;
  background: #fff;
  width: auto;
  display: inline-flex;
}
.pagination-wrap :deep(.van-pagination__item) {
  font-size: 13px;
  font-weight: 500;
  color: #5a5a6e;
  border: none;
  background: #fff;
  padding: 0 22px;
  height: 38px;
  min-width: auto;
  position: relative;
}
.pagination-wrap :deep(.van-pagination__item + .van-pagination__item) {
  border-left: 1px solid #f0ece8;
}
.pagination-wrap :deep(.van-pagination__item--active) {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
  font-weight: 600;
  border-left-color: transparent;
}
.pagination-wrap :deep(.van-pagination__item:active) {
  opacity: 0.8;
}
.pagination-wrap :deep(.van-pagination__prev),
.pagination-wrap :deep(.van-pagination__next) {
  color: #1a1a2e;
  font-weight: 500;
}

/* ── 评价弹窗 ── */
.review-popup {
  padding: 16px 20px 28px;
}
.review-popup-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 16px;
  text-align: center;
}
.review-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px;
  background: #faf8f6;
  border-radius: 10px;
}
.review-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.review-item-img {
  flex-shrink: 0;
  border-radius: 6px;
  background: #f0ece8;
}
.review-item-info {
  flex: 1;
  min-width: 0;
}
.review-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.35;
}
.review-item-spec {
  font-size: 11px;
  color: #bababa;
  margin-top: 2px;
}
.review-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.review-field-label {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}
.review-dsr {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
  padding: 14px;
  background: #faf8f6;
  border-radius: 10px;
}
.review-dsr-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.review-dsr-label {
  font-size: 13px;
  color: #5a5a6e;
}
.review-textarea {
  padding: 0;
  margin-bottom: 20px;
}
.review-textarea :deep(.van-field__control) {
  font-size: 14px;
  line-height: 1.5;
}
.review-uploader-block {
  margin-bottom: 14px;
}
.review-uploader-label {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 10px;
}
.review-image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.review-image-cell {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.review-image-preview {
  display: block;
  width: 100%;
  height: 100%;
}
.review-image-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0,0,0,0.45);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
}
.review-image-add {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f3f0;
  border: 1.5px dashed #e0dcd8;
  cursor: pointer;
  transition: border-color 0.2s;
}
.review-image-add:active {
  border-color: #e8573a;
}
.review-detail-content {
  font-size: 14px;
  line-height: 1.6;
  color: #1a1a2e;
  margin: 0 0 14px;
  white-space: pre-wrap;
}
.review-detail-time {
  font-size: 12px;
  color: #bababa;
  margin-top: 12px;
  text-align: right;
}
.review-detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f0ece8;
}
.review-detail-btn {
  height: 30px !important;
  font-size: 12px !important;
  padding: 0 14px !important;
  border-color: #e0dcd8 !important;
  color: #5a5a6e !important;
}
.review-detail-btn-danger {
  border-color: #d63031 !important;
  color: #d63031 !important;
}
.review-image-cell-done {
  border-radius: 8px;
  overflow: hidden;
  background: #f0ece8;
}
.file-input-hidden {
  display: none;
}
.review-submit {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 700;
  border: none;
}
</style>
