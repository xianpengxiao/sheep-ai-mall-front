<template>
  <div class="page-merchant">
    <NavBar title="我的店铺" />

    <!-- ==================== 🏪 店铺信息头部 ==================== -->
    <div v-if="shopInfo" class="shop-header" @click="openShopDetail">
      <div class="shop-avatar">
        <van-image width="64" height="64" :src="shopInfo.shopLogo || defaultLogo" class="shop-logo-img" />
      </div>
      <div class="shop-meta">
        <div class="shop-name">{{ shopInfo.shopName }}</div>
        <div class="shop-contact">{{ shopInfo.contactName }} | {{ shopInfo.contactPhone }}</div>
        <div class="shop-scope">{{ shopInfo.businessScope || '未设置经营范围' }}</div>
      </div>
    </div>
    <van-loading v-else-if="shopLoading" class="loading-center" size="24" />

    <!-- 店铺详情弹窗（点击头部弹出） -->
    <van-dialog v-model:show="showShopDetail" title="店铺信息" :show-confirm-button="false" closeable close-icon-position="top-left">
      <div class="dialog-body">
        <div class="logo-upload-wrap" @click="logoInputRef?.click()">
          <van-image width="72" height="72" :src="shopForm.logoPreview || shopInfo?.shopLogo || defaultLogo" class="logo-preview" />
          <div class="logo-overlay">
            <van-icon name="camera-o" size="20" color="#fff" />
          </div>
        </div>
        <input ref="logoInputRef" type="file" accept="image/*" class="file-hidden" @change="onLogoSelected" />
        <!-- 营业执照 -->
        <div class="license-section">
          <span class="license-label">营业执照</span>
          <van-image
            width="100%"
            height="auto"
            fit="contain"
            :src="shopInfo?.businessLicense"
            class="license-img"
          />
        </div>
        <van-field v-model="shopForm.shopName" label="店铺名称" placeholder="请输入店铺名称" />
        <van-field v-model="shopForm.businessScope" is-link readonly label="经营范围" placeholder="请选择经营范围" :rules="[{ required: true, message: '请选择经营范围' }]" @click="openScopePicker" />
        <van-field v-model="shopForm.contactName" label="联系人" placeholder="请输入联系人姓名" />
        <van-field v-model="shopForm.contactPhone" label="联系电话" type="tel" placeholder="请输入联系电话" />
        <van-button round block class="dialog-btn" @click="handleSaveShop" :loading="shopSaving">保存</van-button>

      <!-- 经营范围多选 -->
      <van-popup v-model:show="showScopePicker" round position="bottom" class="scope-popup">
        <div class="scope-popup-header">
          <span class="scope-cancel" @click="showScopePicker = false">取消</span>
          <span class="scope-title">选择经营范围</span>
          <span class="scope-confirm" @click="onScopeConfirm">确定</span>
        </div>
        <div class="scope-list">
          <van-checkbox-group v-model="scopeSelected" direction="vertical">
            <van-checkbox v-for="opt in categoryOptions" :key="opt.value" :name="opt.value" shape="square" class="scope-checkbox">
              {{ opt.text }}
            </van-checkbox>
          </van-checkbox-group>
        </div>
      </van-popup>
      </div>
    </van-dialog>


    <!-- ==================== Tabs ==================== -->
    <van-tabs v-model:active="activeTab" class="merchant-tabs">
      <van-tab title="商品管理" name="goods" />
      <van-tab title="订单管理" name="orders" />
      <van-tab title="数据评价" name="data" />
    </van-tabs>

    <div v-show="activeTab === 'goods'" class="tab-content">
      <div class="toolbar">
        <div class="search-bar">
          <van-icon name="search" size="16" color="#9a9aae" />
          <input v-model="goodsKeyword" class="search-input" placeholder="搜索商品名称..." @keyup.enter="handleSearch" />
          <van-icon v-if="goodsKeyword" name="close" size="14" color="#c8c4c0" class="search-clear" @click.stop="clearSearch" />
        </div>
        <van-button plain round size="small" class="toolbar-btn-cat" @click="showGoodsCategory = true">
          {{ goodsCategoryName || '全部分类' }}
          <van-icon name="arrow-down" size="12" />
        </van-button>
        <van-button round size="small" class="toolbar-btn" @click="openAddGoods">
          <van-icon name="plus" size="14" /> 新增商品
        </van-button>
      </div>
      <van-action-sheet v-model:show="showGoodsCategory" title="选择分类" @cancel="showGoodsCategory = false">
        <div class="category-sheet-list">
          <div class="category-sheet-item" :class="{ active: !goodsCategoryId }" @click="selectGoodsCategory(null, '全部分类')">全部分类</div>
          <div v-for="cat in flatCategories" :key="cat.value" class="category-sheet-item" :class="{ active: goodsCategoryId === cat.value }" @click="selectGoodsCategory(cat.value, cat.text.trim())">{{ cat.text }}</div>
        </div>
      </van-action-sheet>

      <div v-if="goodsList.length > 0" class="list-items">
        <div v-for="item in goodsList" :key="item.id" class="list-item">
          <van-image width="64" height="64" fit="cover" :src="item.mainImage || defaultImg" class="item-img" />
          <div class="item-info">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-meta">
              <span class="item-price">¥{{ item.minPrice || '0.00' }}</span>
              <span class="item-tag" :class="item.status === 1 ? 'tag-on' : 'tag-off'">
                {{ item.status === 1 ? '上架' : '下架' }}
              </span>
            </div>
          </div>
          <div class="item-actions">
            <van-icon name="edit" size="18" color="#5a5a6e" @click="editGoods(item)" />
            <van-icon
              :name="item.status === 1 ? 'eye-o' : 'closed-eye'"
              size="18"
              :color="item.status === 1 ? '#07c160' : '#c8c4c0'"
              @click="handleToggle(item)"
            />
          </div>
        </div>
      </div>
      <van-empty v-if="!goodsLoading && goodsList.length === 0" description="暂无商品" />

      <van-pagination
        v-if="goodsTotal > 0"
        v-model="goodsPage"
        :total-items="goodsTotal"
        :items-per-page="10"
        @change="onGoodsPageChange"
        mode="simple"
        class="goods-pagination"
      />

      <!-- 编辑商品弹窗 -->
      <van-dialog v-model:show="showEditGoods" title="编辑商品" :show-confirm-button="false" closeable close-icon-position="top-left" class="edit-goods-dialog">
        <GoodsForm ref="editGoodsFormRef" :init-form="editGoodsData" submit-text="保存" @submit="handleEditGoods" />
      </van-dialog>
    </div>

    <!-- ==================== Tab 订单管理 ==================== -->
    <div v-show="activeTab === 'orders'" class="tab-content">
      <div class="order-summary">共 {{ orderTotal }} 笔订单</div>

      <van-tabs v-model:active="orderStatus" class="order-status-tabs" @change="onOrderStatusChange">
        <van-tab title="全部" :name="-1" />
        <van-tab title="待付款" :name="0" />
        <van-tab title="已支付" :name="1" />
        <van-tab title="已发货" :name="2" />
        <van-tab title="已完成" :name="3" />
        <van-tab title="已取消" :name="4" />
      </van-tabs>

      <van-list v-model:loading="orderLoading" :finished="orderFinished" finished-text="没有更多了" @load="fetchOrders">
        <div class="list-items">
          <div v-for="item in orderList" :key="item.id" class="list-item order-item">
            <div class="order-info">
              <div class="order-top">
                <span class="order-id">订单 #{{ item.id }}</span>
                <span class="order-status" :class="'status-' + item.status">{{ orderStatusText(item.status) }}</span>
              </div>
              <div class="order-amount">¥{{ item.totalAmount || '0.00' }}</div>
              <div class="order-time">{{ item.createTime }}</div>
            </div>
            <div class="order-actions">
              <van-button size="mini" round plain class="action-btn" @click="viewOrder(item)">详情</van-button>
              <van-button v-if="item.status === 1" size="mini" round class="action-btn primary" @click="handleDeliver(item)">发货</van-button>
            </div>
          </div>
        </div>
        <van-empty v-if="!orderLoading && orderList.length === 0" description="暂无订单" />
      </van-list>

      <!-- 订单详情弹窗 -->
      <van-dialog v-model:show="showOrderDetail" title="订单详情" :show-confirm-button="false" closeable close-icon-position="top-left">
        <div class="dialog-body">
          <div class="detail-row"><span class="detail-lbl">订单号</span><span class="detail-val">{{ orderDetail.id }}</span></div>
          <div class="detail-row"><span class="detail-lbl">状态</span><span class="detail-val">{{ orderStatusText(orderDetail.status) }}</span></div>
          <div class="detail-row"><span class="detail-lbl">收货人</span><span class="detail-val">{{ orderDetail.receiverName }}</span></div>
          <div class="detail-row"><span class="detail-lbl">联系电话</span><span class="detail-val">{{ orderDetail.receiverPhone }}</span></div>
          <div class="detail-row"><span class="detail-lbl">收货地址</span><span class="detail-val">{{ orderDetail.receiverAddress }}</span></div>
          <div class="detail-row"><span class="detail-lbl">实付金额</span><span class="detail-val price">¥{{ orderDetail.totalAmount || '0.00' }}</span></div>
          <div class="detail-row"><span class="detail-lbl">下单时间</span><span class="detail-val">{{ orderDetail.createTime }}</span></div>
        </div>
      </van-dialog>

      <!-- 发货表单弹窗 -->
      <van-dialog v-model:show="showDeliverForm" title="订单发货" :show-confirm-button="false" closeable close-icon-position="top-left">
        <div class="dialog-body">
          <van-field
            v-model="deliverForm.company"
            is-link
            readonly
            label="快递公司"
            placeholder="请选择快递公司"
            :rules="[{ required: true, message: '请选择快递公司' }]"
            @click="showCompanyPicker = true"
          />
          <van-field
            v-model="deliverForm.trackingNo"
            label="快递单号"
            placeholder="请输入快递单号"
            :rules="[{ required: true, message: '请输入快递单号' }]"
          />
          <van-button round block class="dialog-btn" @click="confirmDeliver" :loading="deliverLoading">确认发货</van-button>
        </div>
      </van-dialog>

      <!-- 快递公司选择器 -->
      <van-action-sheet v-model:show="showCompanyPicker" title="选择快递公司" @cancel="showCompanyPicker = false">
        <div class="company-list">
          <div
            v-for="name in deliveryCompanies"
            :key="name"
            class="company-item"
            @click="onCompanyConfirm(name)"
          >{{ name }}</div>
        </div>
      </van-action-sheet>
    </div>

    <!-- ==================== Tab 数据评价 ==================== -->
    <div v-show="activeTab === 'data'" class="tab-content">
      <!-- 营收概览 -->
      <div class="data-cards">
        <div class="data-card">
          <div class="data-num">¥{{ stats.totalRevenue || '0.00' }}</div>
          <div class="data-lbl">总营收</div>
        </div>
        <div class="data-card">
          <div class="data-num">{{ stats.orderCount || 0 }}</div>
          <div class="data-lbl">订单总数</div>
        </div>
        <div class="data-card">
          <div class="data-num">¥{{ stats.avgAmount || '0.00' }}</div>
          <div class="data-lbl">客单价</div>
        </div>
      </div>

      <!-- 评价列表 -->
      <div class="review-section">
        <div class="section-title">最新评价</div>
        <van-list v-model:loading="reviewLoading" :finished="reviewFinished" finished-text="没有更多了" @load="fetchReviews">
          <div class="review-list">
            <div v-for="item in reviewList" :key="item.id" class="review-item">
              <div class="review-top">
                <span class="review-user">{{ item.memberName || '匿名用户' }}</span>
                <span class="review-stars">
                  <van-icon v-for="s in 5" :key="s" :name="s <= item.rating ? 'star' : 'star-o'" size="14" :color="s <= item.rating ? '#f39c12' : '#e0dcd8'" />
                </span>
              </div>
              <div class="review-content">{{ item.content }}</div>
              <div class="review-meta">
                <span class="review-product">{{ item.productName }}</span>
                <span class="review-time">{{ item.createTime }}</span>
              </div>
            </div>
          </div>
          <van-empty v-if="!reviewLoading && reviewList.length === 0" description="暂无评价" />
        </van-list>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onActivated, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import NavBar from '../../components/NavBar.vue'
import GoodsForm from '../../components/goods/GoodsForm.vue'
import { getShopInfo, updateShopInfo, getShopOrders, getShopStats, getShopReviews, updateMerchantGoods, getMerchantGoodsPage } from '../../api/merchant.js'
import { getSpuDetail, toggleSpuStatus } from '../../api/goods.js'
import { getOrderDetail, deliverOrder } from '../../api/order.js'
import { getTree } from '../../api/category.js'

const router = useRouter()
const defaultImg = 'https://img.yzcdn.cn/vant/ipad.jpeg'
const defaultLogo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e8573a' rx='16'/%3E%3Ctext x='50' y='66' text-anchor='middle' font-size='44' fill='%23fff'%3E🏪%3C/text%3E%3C/svg%3E"

const activeTab = ref('goods')

// 经营范围选择
const showScopePicker = ref(false)
const categoryOptions = ref([])
const scopeSelected = ref([])
function flattenTree(nodes, depth = 0) {
  const result = []
  for (const node of nodes) {
    result.push({ text: '  '.repeat(depth) + node.name, value: node.name })
    if (node.children?.length) result.push(...flattenTree(node.children, depth + 1))
  }
  return result
}
onMounted(async () => {
  try {
    const tree = await getTree()
    categoryOptions.value = flattenTree(tree || [])
    // build flat category list for goods filter
    const cats = []
    function walk(nodes) {
      for (const n of nodes) {
        cats.push({ text: n.name, value: n.id })
        if (n.children?.length) walk(n.children)
      }
    }
    walk(tree || [])
    flatCategories.value = cats
  } catch { categoryOptions.value = []; flatCategories.value = [] }
})
function onScopeConfirm() {
  shopForm.businessScope = scopeSelected.value.join('、')
  showScopePicker.value = false
}

function openScopePicker() {
  scopeSelected.value = shopForm.businessScope ? shopForm.businessScope.split('、') : []
  showScopePicker.value = true
}

// ═══════════════ 店铺管理 ═══════════════
const shopLoading = ref(false)
const shopInfo = ref(null)
const showShopDetail = ref(false)
const shopSaving = ref(false)

const shopForm = reactive({ shopName: '', businessScope: '', contactName: '', contactPhone: '', logoPreview: '' })
const logoInputRef = ref(null)
const logoFile = ref(null)

function onLogoSelected(e) {
  const f = e.target.files?.[0]
  if (!f) return
  logoFile.value = f
  const reader = new FileReader()
  reader.onload = (ev) => { shopForm.logoPreview = ev.target?.result || '' }
  reader.readAsDataURL(f)
}

async function fetchShop() {
  shopLoading.value = true
  try { shopInfo.value = await getShopInfo() }
  catch { shopInfo.value = null }
  finally { shopLoading.value = false }
}

function openShopDetail() {
  if (!shopInfo.value) return
  shopForm.shopName = shopInfo.value.shopName || ''
  shopForm.businessScope = shopInfo.value.businessScope || ''
  shopForm.contactName = shopInfo.value.contactName || ''
  shopForm.contactPhone = shopInfo.value.contactPhone || ''
  shopForm.logoPreview = ''
  logoFile.value = null
  showShopDetail.value = true
}

async function handleSaveShop() {
  if (!shopForm.shopName) return showToast('请输入店铺名称')
  shopSaving.value = true
  try {
    let logoUrl = shopInfo.value?.shopLogo
    if (logoFile.value) {
      const { uploadImage } = await import('../../api/merchant.js')
      logoUrl = await uploadImage(logoFile.value, 'cert')
    }
    await updateShopInfo({ shopName: shopForm.shopName, businessScope: shopForm.businessScope, contactName: shopForm.contactName, contactPhone: shopForm.contactPhone, shopLogo: logoUrl })
    showToast('保存成功')
    showShopDetail.value = false
    await fetchShop()
  } catch { /* toast by interceptor */ }
  finally { shopSaving.value = false }
}

// ═══════════════ 商品管理 ═══════════════
const goodsList = ref([])
const goodsLoading = ref(false)
const goodsFinished = ref(false)
const goodsPage = ref(1)
const goodsTotal = ref(0)
const goodsKeyword = ref('')
const goodsCategoryId = ref(null)
const goodsCategoryName = ref('')
const showGoodsCategory = ref(false)
const showEditGoods = ref(false)
const editGoodsData = ref({})
const editGoodsId = ref(null)
const editGoodsFormRef = ref(null)

async function fetchGoods() {
  goodsLoading.value = true
  try {
    const params = { pageNum: goodsPage.value, pageSize: 10 }
    if (goodsKeyword.value) params.keyword = goodsKeyword.value
    if (goodsCategoryId.value) params.categoryId = goodsCategoryId.value
    const res = await getMerchantGoodsPage(params)
    goodsList.value = res?.records || []
    goodsTotal.value = res?.total || 0
    goodsFinished.value = goodsList.value.length < 10
  } catch { goodsFinished.value = true }
  finally { goodsLoading.value = false }
}

function handleSearch() {
  goodsPage.value = 1
  fetchGoods()
}

function clearSearch() {
  goodsKeyword.value = ''
  goodsPage.value = 1
  fetchGoods()
}

function onGoodsPageChange() {
  fetchGoods()
}

const flatCategories = ref([])

function selectGoodsCategory(id, name) {
  goodsCategoryId.value = id
  goodsCategoryName.value = name
  showGoodsCategory.value = false
  goodsPage.value = 1
  fetchGoods()
}

function openAddGoods() {
  router.push('/merchant/goods/publish')
}

async function editGoods(item) {
  editGoodsId.value = item.id
  try {
    const detail = await getSpuDetail(item.id)
    editGoodsData.value = { ...detail }
  } catch {
    editGoodsData.value = { ...item }
  }
  showEditGoods.value = true
}

async function handleEditGoods(payload) {
  await updateMerchantGoods(editGoodsId.value, payload)
  showToast('保存成功')
  showEditGoods.value = false
  goodsPage.value = 1; goodsFinished.value = false; fetchGoods()
}

async function handleToggle(item) {
  const action = item.status === 1 ? '下架' : '上架'
  const newStatus = item.status === 1 ? 0 : 1
  try {
    await showConfirmDialog({ title: '提示', message: `确认${action}该商品？`, confirmButtonText: '确定', cancelButtonText: '取消' })
    await toggleSpuStatus(item.id, newStatus)
    showToast(`${action}成功`)
    goodsPage.value = 1; goodsFinished.value = false; fetchGoods()
  } catch { /* cancel */ }
}

// ═══════════════ 订单管理 ═══════════════
const orderList = ref([])
const orderLoading = ref(false)
const orderFinished = ref(false)
const orderPage = ref(1)
const orderTotal = ref(0)
const orderStatus = ref(-1)
const showOrderDetail = ref(false)
const orderDetail = ref({})

function orderStatusText(s) {
  const map = { 0: '待付款', 1: '已支付', 2: '已发货', 3: '已完成', 4: '已取消' }
  return map[s] ?? '未知'
}

async function fetchOrders() {
  try {
    const params = { pageNum: orderPage.value, pageSize: 10 }
    if (orderStatus.value >= 0) params.status = orderStatus.value
    const res = await getShopOrders(params)
    const records = res?.records || []
    orderTotal.value = res?.total || 0
    orderList.value.push(...records)
    orderPage.value++
    if (records.length < 10) orderFinished.value = true
  } catch { orderFinished.value = true }
  finally { orderLoading.value = false }
}

function onOrderStatusChange() {
  orderList.value = []; orderPage.value = 1; orderFinished.value = false; orderLoading.value = true
  fetchOrders()
}

async function viewOrder(item) {
  try {
    orderDetail.value = await getOrderDetail(String(item.id))
    showOrderDetail.value = true
  } catch { /* toast */ }
}

const deliveryCompanies = [
  '顺丰速运', '中通快递', '圆通速递', '韵达快递', '申通快递',
  '百世快递', '京东快递', '邮政EMS', '德邦快递', '极兔速递',
  '菜鸟速递', '丹鸟物流', '跨越速运', '壹米滴答',
]
const showDeliverForm = ref(false)
const showCompanyPicker = ref(false)
const deliverLoading = ref(false)
const deliverForm = reactive({ company: '', trackingNo: '' })
const deliveringOrderId = ref('')

function onCompanyConfirm(name) {
  deliverForm.company = name
  showCompanyPicker.value = false
}

function handleDeliver(item) {
  deliveringOrderId.value = String(item.id)
  deliverForm.company = ''
  deliverForm.trackingNo = ''
  showDeliverForm.value = true
}

async function confirmDeliver() {
  if (!deliverForm.company) return showToast('请选择快递公司')
  if (!deliverForm.trackingNo) return showToast('请输入快递单号')
  deliverLoading.value = true
  try {
    await deliverOrder(deliveringOrderId.value, deliverForm.company, deliverForm.trackingNo)
    showToast('已发货')
    showDeliverForm.value = false
    orderList.value = []; orderPage.value = 1; orderFinished.value = false
  } catch { /* toast */ }
  finally { deliverLoading.value = false }
}

// ═══════════════ 数据评价 ═══════════════
const stats = ref({ totalRevenue: 0, orderCount: 0, avgAmount: 0 })
const reviewList = ref([])
const reviewLoading = ref(false)
const reviewFinished = ref(false)
const reviewPage = ref(1)

async function fetchStats() {
  try {
    stats.value = await getShopStats()
  } catch { /* silent */ }
}

async function fetchReviews() {
  try {
    const res = await getShopReviews({ pageNum: reviewPage.value, pageSize: 10 })
    const records = res?.records || []
    reviewList.value.push(...records)
    reviewPage.value++
    if (records.length < 10) reviewFinished.value = true
  } catch { reviewFinished.value = true }
  finally { reviewLoading.value = false }
}

// ── Tab 切换懒加载 ──
watch(activeTab, (tab) => {
  if (tab === 'goods' && goodsList.value.length === 0) {
    goodsList.value = []; goodsPage.value = 1; goodsFinished.value = false; fetchGoods()
  }
  if (tab === 'orders' && orderList.value.length === 0) {
    orderList.value = []; orderPage.value = 1; orderFinished.value = false; orderLoading.value = true; fetchOrders()
  }
  if (tab === 'data' && reviewList.value.length === 0) {
    fetchStats()
    reviewList.value = []; reviewPage.value = 1; reviewFinished.value = false; reviewLoading.value = true; fetchReviews()
  }
})

onActivated(() => { fetchShop() })
</script>

<style scoped>
.page-merchant {
  min-height: 100vh;
  background: #f5f3f0;
}
.loading-center { padding: 60px 0; }
.tab-content { padding: 12px 16px 24px; }

/* ── 店铺头部 ── */
.shop-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 16px;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
  position: relative;
}
.shop-avatar {
  flex-shrink: 0;
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,0.4);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255,255,255,0.15);
}
.shop-logo-img {
  border-radius: 12px;
}
.shop-meta { flex: 1; min-width: 0; }
.shop-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.shop-contact { font-size: 13px; opacity: 0.9; }
.shop-scope { font-size: 12px; opacity: 0.75; margin-top: 2px; }

/* ── 订单汇总 ── */
.order-summary { font-size: 13px; color: #9a9aae; margin-bottom: 8px; }
.order-status-tabs { margin-bottom: 8px; }

/* ── Merchant Tabs ── */
.merchant-tabs {
  margin-top: 12px;
}

/* ── 弹窗表单 ── */
.dialog-body { padding: 16px 20px 24px; display: flex; flex-direction: column; align-items: center; }
.license-section {
  width: 100%;
  margin-bottom: 12px;
}
.license-label {
  display: block;
  font-size: 13px;
  color: #5a5a6e;
  margin-bottom: 6px;
}
.license-img {
  border-radius: 8px;
  border: 1px solid #f0ece8;
}
.dialog-btn {
  margin-top: 16px; height: 40px; font-size: 14px; font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important; width: 100%;
}

/* ── Logo 上传 ── */
.logo-upload-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  margin-bottom: 16px;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
}
.logo-preview { border-radius: 12px; }
.logo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 12px;
}
.logo-upload-wrap:hover .logo-overlay { opacity: 1; }
.file-hidden { display: none; }

/* ── 分类选择按钮 ── */
.toolbar-btn-cat {
  flex-shrink: 0;
  font-size: 12px;
  color: #5a5a6e !important;
  border-color: #d0ccc8 !important;
  padding: 0 10px;
  height: 32px;
}
.category-sheet-list { padding: 8px 16px 24px; max-height: 50vh; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 10px; }
.category-sheet-item {
  flex: 0 0 calc(33.33% - 7px);
  padding: 10px 0;
  text-align: center;
  font-size: 13px;
  color: #1a1a2e;
  background: #f5f3f0;
  border-radius: 8px;
  cursor: pointer;
}
.category-sheet-item:active { background: #e0dcd8; }
.category-sheet-item.active { background: #e8573a; color: #fff; }

/* ── 工具栏 ── */
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.toolbar-btn {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important; font-weight: 600; padding: 0 16px;
}

/* ── 搜索栏 ── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  background: #fff;
  border-radius: 20px;
  padding: 0 12px;
  height: 36px;
  border: 1px solid #e0dcd8;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #1a1a2e;
  background: transparent;
}
.search-input::placeholder { color: #c8c4c0; }
.search-clear { cursor: pointer; }
.goods-pagination { margin-top: 16px; }

/* ── 商品列表 ── */
.list-items { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.list-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #f0ece8; }
.list-item:last-child { border-bottom: none; }
.item-img { border-radius: 8px; flex-shrink: 0; }
.item-info { flex: 1; min-width: 0; }
.item-name { font-size: 14px; font-weight: 500; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.item-price { font-size: 15px; font-weight: 700; color: #e8573a; }
.item-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.tag-on { background: #e8f8ee; color: #07c160; }
.tag-off { background: #f5f3f0; color: #9a9aae; }
.item-actions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.scope-popup {
  max-height: 60vh;
}
.scope-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f0ece8;
}
.scope-cancel {
  font-size: 14px;
  color: #9a9aae;
}
.scope-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
}
.scope-confirm {
  font-size: 14px;
  color: #e8573a;
  font-weight: 500;
}
.scope-list {
  padding: 12px 16px;
  max-height: 40vh;
  overflow-y: auto;
}
.scope-checkbox {
  padding: 10px 0;
}

/* ── 编辑商品弹窗 ── */
:deep(.edit-goods-dialog) {
  width: 92% !important;
}
:deep(.edit-goods-dialog .van-dialog__content) {
  max-height: 85vh;
  overflow-y: auto;
}

/* ── 订单管理 ── */
.order-item { display: flex; align-items: center; padding: 14px 12px; }
.order-info { flex: 1; min-width: 0; }
.order-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.order-id { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.order-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.status-0 { background: #fff3e0; color: #f39c12; }
.status-1 { background: #e8f8ee; color: #07c160; }
.status-2 { background: #e3f2fd; color: #1989fa; }
.status-3 { background: #f5f3f0; color: #9a9aae; }
.status-4 { background: #f5f3f0; color: #c8c4c0; }
.order-amount { font-size: 16px; font-weight: 700; color: #e8573a; }
.order-time { font-size: 11px; color: #c8c4c0; margin-top: 2px; }
.order-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
.action-btn { height: 28px; font-size: 12px; padding: 0 12px; }
.action-btn.primary { background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important; border: none !important; color: #fff !important; }

/* ── 订单详情弹窗行 ── */
.detail-row { display: flex; align-items: flex-start; width: 100%; padding: 8px 0; border-bottom: 1px solid #f5f3f0; }
.detail-row:last-child { border-bottom: none; }
.detail-lbl { width: 70px; font-size: 13px; color: #9a9aae; flex-shrink: 0; }
.detail-val { flex: 1; font-size: 13px; color: #1a1a2e; word-break: break-all; }
.detail-val.price { font-weight: 700; color: #e8573a; }

/* ── 数据评价 ── */
.data-cards { display: flex; gap: 10px; margin-bottom: 16px; }
.data-card { flex: 1; background: #fff; border-radius: 12px; padding: 16px 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.data-num { font-size: 18px; font-weight: 700; color: #e8573a; }
.data-lbl { font-size: 12px; color: #9a9aae; margin-top: 4px; }
.review-section { }
.section-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin-bottom: 10px; }
.review-list { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.review-item { padding: 14px 16px; border-bottom: 1px solid #f0ece8; }
.review-item:last-child { border-bottom: none; }
.review-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.review-user { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.review-stars { display: flex; gap: 2px; }
.review-content { font-size: 13px; color: #5a5a6e; line-height: 1.5; margin-bottom: 6px; }
.review-meta { display: flex; align-items: center; justify-content: space-between; }
.review-product { font-size: 11px; color: #9a9aae; }
.review-time { font-size: 11px; color: #c8c4c0; }
.company-list { padding: 8px 16px 24px; max-height: 50vh; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 10px; }
.company-item { flex: 0 0 calc(33.33% - 7px); padding: 10px 0; text-align: center; font-size: 14px; color: #1a1a2e; background: #f5f3f0; border-radius: 8px; cursor: pointer; }
.company-item:active { background: #e0dcd8; }
</style>
