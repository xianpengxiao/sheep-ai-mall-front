<template>
  <div class="page-goods-detail">
    <!-- 加载中 -->
    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="state-wrap">
      <van-empty description="商品信息加载失败">
        <van-button
          round
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          @click="fetchDetail"
        >重新加载</van-button>
      </van-empty>
    </div>

    <!-- 无数据 -->
    <div v-else-if="!spu" class="state-wrap">
      <van-empty description="商品不存在" />
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <!-- 导航栏（与首页 top-bar 风格统一） -->
      <div class="detail-top-bar">
        <van-icon name="arrow-left" size="20" class="back-icon" @click="goBack" />
        <span class="top-bar-title">商品详情</span>
        <div class="top-bar-actions">
          <div class="icon-btn" @click="$router.push('/cart')">
            <van-icon name="shopping-cart-o" size="20" />
          </div>
        </div>
      </div>

      <!-- ═══════ 主体：左右分栏 ═══════ -->
      <div class="detail-body">
        <!-- 右栏（DOM 在前，移动端先展示：商家 + 商品信息） -->
        <div class="detail-right">
          <div class="detail-right-inner">
            <div class="detail-info">
              <!-- ═══════ 商家信息条 ═══════ -->
              <div class="merchant-bar">
                <div class="mbar-left" @click="goToShop">
                  <div class="mbar-logo-wrap">
                    <van-image
                      v-if="merchantInfo?.shopLogo || spu.shopLogo"
                      :src="merchantInfo?.shopLogo || spu.shopLogo"
                      round
                      width="34"
                      height="34"
                      fit="cover"
                      class="mbar-logo"
                    />
                    <span v-else class="mbar-logo-fallback">店</span>
                    <span class="mbar-badge">自营</span>
                  </div>
                  <div class="mbar-info">
                    <div class="mbar-name-row">
                      <span class="mbar-name">{{ merchantInfo?.shopName || spu.shopName || '商家店铺' }}</span>
                      <van-icon name="arrow" class="mbar-arrow" />
                    </div>
                    <div class="mbar-meta-row">
                      <span class="mbar-platform">商城</span>
                      <span class="mbar-divider">|</span>
                      <span class="mbar-scores" v-if="merchantDsr?.describeScore">
                        <span class="mbar-score-item">
                          <span class="mbar-score-label">描述</span>
                          <span class="mbar-score-val">{{ merchantDsr.describeScore }}</span>
                        </span>
                        <span class="mbar-score-item">
                          <span class="mbar-score-label">服务</span>
                          <span class="mbar-score-val">{{ merchantDsr.serviceScore ?? '-' }}</span>
                        </span>
                        <span class="mbar-score-item">
                          <span class="mbar-score-label">物流</span>
                          <span class="mbar-score-val">{{ merchantDsr.logisticsScore ?? '-' }}</span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <div class="mbar-right">
                  <van-button round plain size="mini" class="mbar-btn" icon="service-o" @click="contactService">客服</van-button>
                  <van-button round plain size="mini" class="mbar-btn mbar-btn-shop" icon="shop-o" @click="goToShop">进店</van-button>
                </div>
              </div>

              <h1 class="goods-name">{{ spu.name }}</h1>
              <p class="goods-subtitle" v-if="spu.subTitle">{{ spu.subTitle }}</p>

              <div class="info-row">
                <span class="goods-price">&yen;{{ displayPrice }}</span>
                <span class="goods-sales" v-if="spu.sales > 0">已售 {{ spu.sales }}</span>
                <span class="goods-sales" v-else>暂无销量</span>
              </div>

              <!-- ═══════ 规格选择 ═══════ -->
              <div v-if="skuList.length > 0" class="specs-block">
                <div class="specs-title">规格</div>
                <div class="specs-list">
                  <div
                    v-for="sku in skuList"
                    :key="sku.id"
                    class="spec-chip"
                    :class="{
                      active: selectedSku?.id === sku.id,
                      disabled: sku.stock === 0
                    }"
                    @click="selectSku(sku)"
                  >
                    <div class="spec-chip-top">
                      <span class="spec-chip-name">{{ sku.skuName || formatSpecInfo(sku.specInfo) || sku.skuCode || '默认' }}</span>
                      <van-icon v-if="selectedSku?.id === sku.id" name="success" class="spec-chip-check" />
                    </div>
                    <span v-if="sku.price" class="spec-chip-price">&yen;{{ sku.price }}</span>
                    <span v-if="sku.stock === 0" class="spec-chip-nostock">缺货</span>
                    <span v-else-if="sku.stock <= 100" class="spec-chip-warning">仅剩 {{ sku.stock }} 件</span>
                  </div>
                </div>
              </div>

              <!-- ═══════ 数量选择 ═══════ -->
              <div class="quantity-block">
                <span class="quantity-label">数量</span>
                <van-stepper
                  v-model="quantity"
                  :min="1"
                  :max="maxQuantity"
                  integer
                  class="quantity-stepper"
                />
              </div>

              <!-- ═══════ 操作按钮 ═══════ -->
              <div class="action-block">
                <div class="action-row">
                  <van-button
                    round
                    class="action-btn-cart"
                    color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
                    :loading="addingCart"
                    @click="addToCart"
                  >加入购物车</van-button>
                  <van-button
                    round
                    class="action-btn-buy"
                    color="#d63031"
                    @click="buyNow"
                  >立即购买</van-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 左栏（DOM 在后，桌面端 row-reverse 展示在左侧）：商品图 + Tab -->
        <div class="detail-left">
          <!-- 商品图片 -->
          <div class="detail-gallery">
            <!-- 主图大图 -->
            <div class="gallery-main">
              <van-image :src="activeImage" fit="cover" class="gallery-main-img" />
            </div>
            <!-- 缩略图列表 -->
            <div class="gallery-thumbs" v-if="spuImages.length > 0">
              <div
                v-for="(img, i) in spuImages"
                :key="i"
                class="gallery-thumb"
                :class="{ active: i === activeIndex }"
                @click="setActiveImage(i)"
              >
                <van-image :src="img" fit="cover" class="gallery-thumb-img" />
              </div>
            </div>
          </div>

          <!-- Tab 切换：商品详情 / 用户评价 -->
          <div class="tab-section">
            <!-- Tab 栏 -->
            <div class="tab-bar">
              <div
                class="tab-item"
                :class="{ active: activeTab === 'desc' }"
                @click="activeTab = 'desc'"
              >商品详情</div>
              <div
                class="tab-item"
                :class="{ active: activeTab === 'review' }"
                @click="activeTab = 'review'"
              >用户评价 ({{ reviewTotal }})</div>
            </div>

            <!-- 商品详情内容 -->
            <div v-show="activeTab === 'desc'" class="tab-panel">
              <div v-if="spu.description" class="desc-content" v-html="spu.description"></div>
              <van-empty v-else description="暂无商品详情" />
            </div>

            <!-- 用户评价内容 -->
            <div v-show="activeTab === 'review'" class="tab-panel">
              <!-- 筛选标签 -->
              <div class="review-tags">
                <span
                  v-for="tag in reviewTags"
                  :key="tag.key"
                  class="review-tag"
                  :class="{ active: reviewFilter === tag.key }"
                  @click="setReviewFilter(tag.key)"
                >{{ tag.label }} {{ tag.count }}</span>
              </div>

              <!-- 评价列表 -->
              <div v-if="displayReviews.length > 0" class="review-list">
                <div
                  v-for="item in displayReviews"
                  :key="item.id"
                  class="review-item"
                >
                  <div class="review-item-head">
                    <div class="review-user">
                      <van-image v-if="item.avatar" round width="28" height="28" :src="item.avatar" class="review-avatar-img" />
                      <span v-else class="review-avatar-text"><van-icon name="user-o" size="14" color="#c8c4c0" /></span>
                      <span class="review-nickname">{{ item.username || '匿名用户' }}</span>
                    </div>
                    <span class="review-date">{{ item.createTime?.slice(0, 10) }}</span>
                  </div>
                  <div class="review-spec" v-if="item.skuName">{{ item.skuName }}</div>
                  <div class="review-stars">
                    <span v-for="n in 5" :key="n" class="review-star" :class="{ on: n <= item.rating }">★</span>
                  </div>
                  <p class="review-content" v-if="item.content">{{ item.content }}</p>
                  <div class="review-images" v-if="item.imageList?.length">
                    <van-image
                      v-for="(img, idx) in item.imageList"
                      :key="idx"
                      :src="img"
                      fit="cover"
                      class="review-img"
                      @click="previewReviewImage(item.imageList, idx)"
                    />
                  </div>
                </div>
              </div>
              <van-empty v-else description="暂无评价" />

              <div class="review-more" v-if="hasMoreReviews">
                <van-button
                  round
                  plain
                  hairline
                  color="#e8573a"
                  :loading="loadingReviews"
                  @click="loadMoreReviews"
                >查看更多评价</van-button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getSpuDetail, getSpuReviews } from '../api/goods.js'
import { getMerchantInfo, getShopDsr } from '../api/merchant.js'
import { addCart } from '../api/cart.js'
import { useUserStore } from '../stores/user.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ── 状态 ──
const spu = ref(null)
const loading = ref(true)
const error = ref(false)
const selectedSku = ref(null)
const quantity = ref(1)
const addingCart = ref(false)
const activeIndex = ref(0)
/** 点击缩略图后置为 true，允许缩略图覆盖 SKU 图片 */
const thumbOverride = ref(false)

// ── 计算属性 ──
/** SPU 原始图片列表（缩略图用） */
const spuImages = computed(() => {
  if (!spu.value) return [fallbackImg]
  return parseImages(spu.value.images || spu.value.mainImage || '')
})

/** 当前展示的大图：缩略图点击优先，否则 SKU 有图用 SKU 图 */
const activeImage = computed(() => {
  if (thumbOverride.value) return spuImages.value[activeIndex.value] || fallbackImg
  if (selectedSku.value?.image) return selectedSku.value.image
  return spuImages.value[activeIndex.value] || fallbackImg
})

const skuList = computed(() => {
  return spu.value?.skuList || []
})

const minSkuPrice = computed(() => {
  const skus = skuList.value
  if (!skus || skus.length === 0) return 0
  return Math.min(...skus.map(s => Number(s.price || 0)))
})

const displayPrice = computed(() => {
  if (selectedSku.value) return selectedSku.value.price
  return minSkuPrice.value || spu.value?.price || 0
})

/** 可选最大数量：根据选中 SKU 的库存，默认 999 */
const maxQuantity = computed(() => {
  if (selectedSku.value?.stock) {
    return Math.min(selectedSku.value.stock, 999)
  }
  // 未选择时，取所有 SKU 的最大库存
  const maxStock = skuList.value.reduce((max, sku) => Math.max(max, sku.stock || 0), 0)
  return Math.min(maxStock || 999, 999)
})

// ── 切换到新 SKU 时重置数量及缩略图状态 ──
watch(selectedSku, () => {
  quantity.value = 1
  thumbOverride.value = false
  activeIndex.value = 0
})

// ── 工具 ──
const fallbackImg = 'https://placehold.co/600x600/f5f3f0/9a9aae?text=暂无图片'

function parseImages(images) {
  if (!images) return [fallbackImg]
  if (Array.isArray(images)) return images.length > 0 ? images : [fallbackImg]
  if (typeof images === 'string') {
    if (images.includes(',')) {
      const parts = images.split(',').map(s => s.trim()).filter(Boolean)
      return parts.length > 0 ? parts : [fallbackImg]
    }
    return [images]
  }
  return [fallbackImg]
}

/** 将 specInfo Map 转为可读字符串，如 "颜色:红色 尺码:XL" */
function formatSpecInfo(specInfo) {
  if (!specInfo) return ''
  if (typeof specInfo === 'string') return specInfo
  if (typeof specInfo === 'object') {
    return Object.entries(specInfo)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ')
  }
  return String(specInfo)
}

// ── 数据获取 ──
async function fetchDetail() {
  const id = route.params.id
  if (!id) {
    console.warn('[GoodsDetail] 缺少商品 ID')
    error.value = true
    loading.value = false
    return
  }

  loading.value = true
  error.value = false
  selectedSku.value = null

  try {
    const data = await getSpuDetail(id)
    console.log('[GoodsDetail] API 响应:', JSON.stringify(data, null, 2))

    if (!data) {
      console.warn('[GoodsDetail] 响应数据为空')
      spu.value = null
    } else {
      const raw = data.spu || data
      console.log('[GoodsDetail] raw 字段:', Object.keys(raw))
      console.log('[GoodsDetail] data 字段:', Object.keys(data))
      console.log('[GoodsDetail] raw.merchant:', raw.merchant, 'data.merchant:', data.merchant)

      // 从各层级查找商家ID
      const rawMid = raw.merchantId || raw.merchant_id || raw.shopId || raw.shop_id
      const dataMid = data.merchantId || data.merchant_id || data.shopId || data.shop_id
      const merchantObj = raw.merchant || data.merchant || raw.shop || data.shop || null

      spu.value = {
        id: raw.id,
        name: raw.name || raw.title || '',
        subTitle: raw.subTitle || '',
        price: raw.price ?? 0,
        sales: raw.sales ?? raw.salesCount ?? 0,
        mainImage: raw.mainImage || raw.image || '',
        images: raw.imageList || raw.images || raw.imgs || raw.pics || raw.imageUrls || '',
        description: raw.description || raw.desc || raw.detail || '',
        skuList: data.skuList || raw.skuList || raw.skus || raw.skuVOList || [],
        merchantId: rawMid || dataMid || merchantObj?.id || merchantObj?.merchantId || 0,
        shopName: raw.shopName || raw.merchantName || raw.shop_name || merchantObj?.shopName || merchantObj?.name || '',
        shopLogo: raw.shopLogo || raw.merchantLogo || merchantObj?.shopLogo || merchantObj?.logo || '',
      }
    }
  } catch (e) {
    console.error('[GoodsDetail] 请求失败:', e.message || e)
    error.value = true
    spu.value = null
  } finally {
    loading.value = false
    if (spu.value?.merchantId) fetchMerchantInfo()
  }
}

// ── 交互 ──
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
}

function selectSku(sku) {
  if (sku.stock === 0) return
  // 再次点击已选中规格 → 取消选中
  if (selectedSku.value?.id === sku.id) {
    selectedSku.value = null
    return
  }
  selectedSku.value = sku
}

/** 点击缩略图切换大图，覆盖 SKU 图片优先展示 */
function setActiveImage(index) {
  activeIndex.value = index
  thumbOverride.value = true
}

async function addToCart() {
  if (!userStore.isLogin) {
    try {
      await showConfirmDialog({
        title: '提示',
        message: '请先登录后再加入购物车',
        confirmButtonText: '去登录',
        cancelButtonText: '再想想',
        confirmButtonColor: '#e8573a',
      })
      router.push({ name: 'Login', query: { redirect: route.fullPath } })
    } catch {
      // 用户取消
    }
    return
  }

  // 有 SKU 但未选择 → 提示
  if (skuList.value.length > 0 && !selectedSku.value) {
    showToast('请选择规格')
    return
  }

  addingCart.value = true
  try {
    await addCart({
      userId: userStore.memberInfo?.userId || 0,
      spuId: spu.value.id,
      skuId: selectedSku.value?.id || 0,
      quantity: quantity.value,
    })
    showToast('已加入购物车')
    quantity.value = 1
  } catch {
    // token 过期导致 API 失败后，引导重新登录
    if (!userStore.isLogin) {
      try {
        await showConfirmDialog({
          title: '提示',
          message: '登录已过期，请重新登录',
          confirmButtonText: '去登录',
          cancelButtonText: '再想想',
          confirmButtonColor: '#e8573a',
        })
        router.push({ name: 'Login', query: { redirect: route.fullPath } })
      } catch {
        // 用户取消
      }
    }
  } finally {
    addingCart.value = false
  }
}

async function buyNow() {
  if (!userStore.isLogin) {
    try {
      await showConfirmDialog({
        title: '提示',
        message: '请先登录后再购买',
        confirmButtonText: '去登录',
        cancelButtonText: '再想想',
        confirmButtonColor: '#e8573a',
      })
      router.push({ name: 'Login', query: { redirect: route.fullPath } })
    } catch { /* cancel */ }
    return
  }
  if (skuList.value.length > 0 && !selectedSku.value) {
    showToast('请选择规格')
    return
  }
  const items = [{
    spuId: spu.value.id,
    spuName: spu.value.name,
    skuId: selectedSku.value?.id || 0,
    skuName: selectedSku.value?.skuName || '',
    price: selectedSku.value?.price || spu.value.price || 0,
    image: selectedSku.value?.image || spu.value.mainImage || '',
    quantity: quantity.value,
  }]
  router.push({
    path: '/order',
    query: { buyNow: '1', items: JSON.stringify(items) },
  })
}

// ── 商家信息 ──
const merchantInfo = ref(null)
const merchantDsr = ref(null)

async function fetchMerchantInfo() {
  const mid = spu.value?.merchantId
  if (!mid) return
  try {
    const [info, dsr] = await Promise.all([
      getMerchantInfo(mid).catch(() => null),
      getShopDsr(mid).catch(() => null),
    ])
    if (info) merchantInfo.value = info
    if (dsr) merchantDsr.value = dsr
  } catch {
    // 静默
  }
}

function merchantStarClass(pos, score) {
  const s = Number(score || 0)
  if (pos <= Math.floor(s)) return 'full'
  if (pos === Math.ceil(s) && s % 1 >= 0.3) return 'half'
  return ''
}

function goToShop() {
  const name = merchantInfo.value?.shopName || spu.value?.shopName
  if (name) {
    router.push({ path: '/search', query: { keyword: name } })
  } else {
    showToast('店铺主页开发中')
  }
}

function contactService() {
  showToast('客服功能开发中')
}

// ── 用户评价（从 API 获取） ──
const activeTab = ref('desc')
const reviewList = ref([])
const reviewTotal = ref(0)
const reviewPages = ref(0)
const reviewFilter = ref('all')
const reviewPage = ref(1)
const pageSize = 5
const loadingReviews = ref(false)

const reviewTags = computed(() => {
  const all = reviewList.value
  return [
    { key: 'all', label: '全部', count: all.length },
    { key: 'img', label: '有图', count: all.filter(r => r.imageList?.length).length },
    { key: 'good', label: '好评', count: all.filter(r => r.rating >= 4).length },
    { key: 'mid', label: '中评', count: all.filter(r => r.rating === 3).length },
    { key: 'bad', label: '差评', count: all.filter(r => r.rating <= 2).length },
  ]
})

const filteredReviews = computed(() => {
  const all = reviewList.value
  switch (reviewFilter.value) {
    case 'img': return all.filter(r => r.imageList?.length)
    case 'good': return all.filter(r => r.rating >= 4)
    case 'bad': return all.filter(r => r.rating <= 2)
    default: return all
  }
})

const displayReviews = computed(() => {
  return filteredReviews.value.slice(0, reviewPage.value * pageSize)
})

const hasMoreReviews = computed(() => {
  return displayReviews.value.length < filteredReviews.value.length
})

async function fetchReviews() {
  const spuId = route.params.id
  if (!spuId) return
  try {
    const res = await getSpuReviews(spuId, { pageNum: 1, pageSize: 50 })
    reviewList.value = res?.records || []
    reviewTotal.value = res?.total || 0
    reviewPages.value = res?.pages || 0
  } catch {
    reviewList.value = []
    reviewTotal.value = 0
  }
}

function setReviewFilter(key) {
  reviewFilter.value = key
  reviewPage.value = 1
}

function loadMoreReviews() {
  loadingReviews.value = true
  setTimeout(() => {
    reviewPage.value++
    loadingReviews.value = false
  }, 300)
}

function previewReviewImage(images, index) {
  window.open(images[index], '_blank')
}

// 切换到评价 tab 时按需加载
watch(activeTab, (tab) => {
  if (tab === 'review' && reviewList.value.length === 0) fetchReviews()
})

// ── 生命周期 ──
onMounted(() => { fetchDetail(); fetchReviews() })
// keep-alive 场景下路由参数变化时重新加载
watch(() => route.params.id, () => {
  if (route.name === 'GoodsDetail') { fetchDetail(); fetchReviews() }
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   商品详情页 — 左图右信息布局，规格直接展示
   ══════════════════════════════════════════════════════════════ */

.page-goods-detail {
  min-height: 100vh;
  background: #fff;
}

/* ── 顶部导航栏（与首页 top-bar 统一） ── */
.detail-top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}
.back-icon {
  cursor: pointer;
  color: var(--text-h, #1a1a2e);
  flex-shrink: 0;
}
.top-bar-title {
  font-family: var(--heading, 'DM Sans', 'Inter', sans-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--text-h, #1a1a2e);
  flex: 1;
}
.top-bar-actions {
  display: flex;
  gap: 12px;
}
.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f5f3f0;
  border: 1.5px solid #eeeae6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.icon-btn:hover {
  border-color: #e8573a;
  background: #fff;
}

/* ── 状态容器 ── */
.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

/* ══════════════════════════════════════════════════════════════
   主体：左右分栏
   ══════════════════════════════════════════════════════════════ */
.detail-body {
  display: block;
  background: #fff;
}
.detail-left {
  width: 100%;
}
.detail-right {
  width: 100%;
}
.detail-right-inner {
  /* desktop sticky 在下方 media 中启用 */
  min-width: 0;
}

/* ── 图片画廊：大图 + 缩略图 ── */
.detail-gallery {
  background: #fff;
  padding: 16px;
}
.gallery-main {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: #f0ece8;
}
.gallery-main-img {
  width: 100%;
  aspect-ratio: 1;
  display: block;
}

/* 缩略图横排 */
.gallery-thumbs {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.gallery-thumbs::-webkit-scrollbar {
  display: none;
}
.gallery-thumb {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s;
  background: #f0ece8;
}
.gallery-thumb.active {
  border-color: var(--accent, #e8573a);
}
.gallery-thumb-img {
  width: 100%;
  height: 100%;
  display: block;
}

/* ── 商品信息区 ── */
.detail-info {
  padding: 20px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.goods-name {
  margin: 0;
  font-family: var(--heading, 'DM Sans', 'Inter', sans-serif);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.3px;
  color: var(--text-h, #1a1a2e);
}
.goods-subtitle {
  margin: 0;
  font-size: 14px;
  color: #9a9aae;
  line-height: 1.4;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.goods-price {
  font-family: var(--heading, 'DM Sans', 'Inter', sans-serif);
  font-size: 28px;
  font-weight: 800;
  color: var(--price, #d63031);
  letter-spacing: -0.5px;
}
.goods-sales {
  font-size: 12px;
  color: #9a9aae;
  background: #f5f3f0;
  padding: 4px 10px;
  border-radius: 10px;
  font-weight: 500;
}

/* ══════════════════════════════════════════════════════════════
   规格选择 — 直接展示的卡片列表
   ══════════════════════════════════════════════════════════════ */
.specs-block {
  border-top: 1px solid var(--border, #eeeae6);
  padding-top: 16px;
}
.specs-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h, #1a1a2e);
  margin-bottom: 10px;
}
.specs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.spec-chip {
  min-width: 110px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #f8f6f4;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}
.spec-chip:active {
  transform: scale(0.97);
}
.spec-chip.active {
  background: #fff5f3;
  border-color: var(--accent, #e8573a);
}
.spec-chip.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.spec-chip-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.spec-chip-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h, #1a1a2e);
}
.spec-chip-check {
  color: var(--accent, #e8573a);
  font-size: 16px;
  flex-shrink: 0;
}
.spec-chip-price {
  font-size: 15px;
  font-weight: 700;
  color: var(--price, #d63031);
}
.spec-chip-nostock {
  font-size: 11px;
  color: #9a9aae;
}
.spec-chip-warning {
  font-size: 11px;
  color: #e8573a;
  font-weight: 500;
}

/* ══════════════════════════════════════════════════════════════
   数量选择
   ══════════════════════════════════════════════════════════════ */
.quantity-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}
.quantity-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h, #1a1a2e);
}
.quantity-stepper {
  --van-stepper-input-width: 44px;
  --van-stepper-input-height: 32px;
}

/* ══════════════════════════════════════════════════════════════
   操作按钮
   ══════════════════════════════════════════════════════════════ */
.action-block {
  padding-top: 4px;
}
.action-row {
  display: flex;
  gap: 10px;
}
.action-btn-cart {
  flex: 1;
  height: 46px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border: none;
  box-shadow: 0 4px 14px rgba(232,87,58,0.3);
}
.action-btn-buy {
  flex: 1;
  height: 46px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border: none;
}
.cart-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border: none;
  box-shadow: 0 4px 14px rgba(232,87,58,0.3);
}

/* ══════════════════════════════════════════════════════════════
   商家信息条（位于商品标题上方）
   ══════════════════════════════════════════════════════════════ */
.merchant-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: #faf8f6;
  border-radius: 10px;
  border: 1px solid #f0ece8;
}
.mbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.mbar-logo-wrap {
  position: relative;
  flex-shrink: 0;
}
.mbar-logo {
  display: block;
  border-radius: 50%;
}
.mbar-logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}
.mbar-badge {
  position: absolute;
  bottom: -2px;
  right: -4px;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
  background: #e8573a;
  color: #fff;
  line-height: 1.2;
  white-space: nowrap;
}
.mbar-info {
  flex: 1;
  min-width: 0;
}
.mbar-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.mbar-name {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
.mbar-arrow {
  font-size: 12px;
  color: #c8c4c0;
  flex-shrink: 0;
}
.mbar-meta-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 11px;
}
.mbar-platform {
  background: #e8573a;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.4;
}
.mbar-divider {
  color: #e0dcd8;
  font-size: 10px;
}
.mbar-scores {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mbar-score-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
}
.mbar-score-label {
  color: #9a9aae;
}
.mbar-score-val {
  font-weight: 700;
  color: #e8573a;
}
.mbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.mbar-btn {
  height: 28px !important;
  font-size: 11px !important;
  padding: 0 8px !important;
  border-color: #e0dcd8 !important;
  color: #5a5a6e !important;
  border-width: 1px !important;
}
.mbar-btn :deep(.van-icon) {
  font-size: 13px !important;
}
.mbar-btn-shop {
  border-color: #e8573a !important;
  color: #e8573a !important;
}

/* ══════════════════════════════════════════════════════════════
   Tab 切换区：商品详情 / 用户评价
   ══════════════════════════════════════════════════════════════ */
.tab-section {
  background: #fff;
  margin-top: 2px;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  position: sticky;
  top: 62px;
  z-index: 50;
  background: #fff;
  border-bottom: 1px solid var(--border, #eeeae6);
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 14px;
  font-weight: 600;
  color: #9a9aae;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  user-select: none;
}
.tab-item.active {
  color: var(--accent, #e8573a);
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  border-radius: 2px;
  background: var(--accent, #e8573a);
}

/* Tab 面板 */
.tab-panel {
  padding: 20px 16px 32px;
}

/* 商品详情内容 */
.desc-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text, #5a5a6e);
}
.desc-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 8px 0;
}
.desc-content :deep(p) {
  margin: 8px 0;
}

/* 筛选标签 */
.review-tags {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.review-tag {
  padding: 6px 16px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 500;
  background: #f5f3f0;
  color: #5a5a6e;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid transparent;
  user-select: none;
}
.review-tag.active {
  background: #e8573a;
  color: #fff;
  box-shadow: 0 2px 8px rgba(232,87,58,0.3);
}

/* 评价列表 */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.review-item {
  padding: 16px 0;
  border-bottom: 1px solid #f0ece8;
}
.review-item:last-child {
  border-bottom: none;
}

/* 评价头部 */
.review-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.review-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.review-avatar {
  font-size: 22px;
  line-height: 1;
}
.review-nickname {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h, #1a1a2e);
}
.review-date {
  font-size: 12px;
  color: #9a9aae;
}

/* 规格标签 */
.review-spec {
  display: inline-block;
  font-size: 11px;
  color: #9a9aae;
  background: #f5f3f0;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}

/* 星级 */
.review-stars {
  margin-bottom: 6px;
}
.review-star {
  font-size: 15px;
  color: #ddd;
}
.review-star.on {
  color: #f39c12;
}

/* 评价内容 */
.review-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text, #5a5a6e);
  margin: 0 0 10px;
}

/* 评价图片 */
.review-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.review-img {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  cursor: pointer;
  background: #f0ece8;
  flex-shrink: 0;
}

/* 加载更多 */
.review-more {
  text-align: center;
  padding-top: 20px;
}

/* ══════════════════════════════════════════════════════════════
   响应式
   ══════════════════════════════════════════════════════════════ */
@media (min-width: 640px) {
  .detail-top-bar {
    padding: 14px 24px;
  }
  .detail-gallery {
    padding: 20px;
  }
  .detail-info {
    padding: 24px 24px 28px;
  }
  .tab-panel {
    padding: 20px 24px 32px;
  }
  .gallery-thumb {
    width: 72px;
    height: 72px;
  }
}

/* ── 桌面端：左右双栏（flex row-reverse 使 DOM 右-左显示为左-右） ── */
@media (min-width: 768px) {
  .detail-top-bar {
    padding: 16px 32px;
  }
  .top-bar-title {
    font-size: 20px;
  }

  .detail-body {
    display: flex;
    flex-direction: row-reverse;
    gap: 24px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 32px;
  }
  .detail-left {
    flex: 1;
    min-width: 0;
  }
  .detail-right {
    width: 360px;
    flex-shrink: 0;
  }
  .detail-right-inner {
    position: sticky;
    top: 70px;
  }

  .detail-gallery {
    padding: 0;
  }
  .gallery-main-img {
    aspect-ratio: 1;
  }

  .detail-info {
    padding: 0;
    overflow-y: visible;
    min-height: 0;
  }
  .goods-name {
    font-size: 24px;
  }
  .goods-price {
    font-size: 32px;
  }

  .specs-list {
    gap: 12px;
  }
  .spec-chip {
    min-width: 130px;
    padding: 12px 16px;
  }

  .tab-panel {
    padding: 28px 32px 40px;
    max-width: 100%;
    margin: 0;
  }
}

@media (min-width: 1024px) {
  .detail-body {
    gap: 32px;
    padding: 0 40px;
  }
  .detail-right {
    width: 400px;
  }
  .goods-name {
    font-size: 28px;
  }
  .goods-price {
    font-size: 36px;
  }
}

@media (min-width: 1400px) {
  .detail-body {
    gap: 40px;
  }
  .detail-right {
    width: 420px;
  }
  .gallery-main-img {
    aspect-ratio: 4/3;
  }
}
</style>
