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

      <!-- ═══════ 主体：左图右信息 ═══════ -->
      <div class="detail-main">
        <!-- 左侧：商品图片 -->
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

        <!-- 右侧：商品信息 + 规格 + 数量 + 操作 -->
        <div class="detail-info">
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
            <van-button
              round
              class="cart-btn"
              color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
              :loading="addingCart"
              @click="addToCart"
            >加入购物车</van-button>
          </div>
        </div>
      </div>

      <!-- ═══════ Tab 切换：商品详情 / 用户评价 ═══════ -->
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
          >用户评价 ({{ mockReviews.length }})</div>
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
              @click="reviewFilter = tag.key"
            >{{ tag.label }} {{ tag.count }}</span>
          </div>

          <!-- 评价列表 -->
          <div v-if="pagedReviews.length > 0" class="review-list">
            <div
              v-for="item in pagedReviews"
              :key="item.id"
              class="review-item"
            >
              <div class="review-item-head">
                <div class="review-user">
                  <span class="review-avatar">{{ item.avatar }}</span>
                  <span class="review-nickname">{{ item.nickname }}</span>
                </div>
                <span class="review-date">{{ item.date }}</span>
              </div>
              <div class="review-spec" v-if="item.skuName">{{ item.skuName }}</div>
              <div class="review-stars">
                <span v-for="n in 5" :key="n" class="review-star" :class="{ on: n <= item.stars }">★</span>
              </div>
              <p class="review-content" v-if="item.content">{{ item.content }}</p>
              <div class="review-images" v-if="item.images && item.images.length > 0">
                <van-image
                  v-for="(img, idx) in item.images"
                  :key="idx"
                  :src="img"
                  fit="cover"
                  class="review-img"
                  @click="previewReviewImage(item.images, idx)"
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getSpuDetail } from '../api/goods.js'
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
      }
    }
  } catch (e) {
    console.error('[GoodsDetail] 请求失败:', e.message || e)
    error.value = true
    spu.value = null
  } finally {
    loading.value = false
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

// ── 用户评价（Mock 数据，后续对接后端） ──
const activeTab = ref('desc')

const mockReviews = [
  { id: 1, nickname: '张三', avatar: '👤', skuName: '颜色:红色 · 尺码:XL', stars: 5, content: '质量很好，颜色和图片一样，非常满意！面料柔软舒适，穿着很合身，物流也快。', images: ['https://pics0.baidu.com/feed/024f78f0f736afc315d66d1ba63dfbd4b64512ad.jpeg?token=c4633f7e6f4fd69ffc114c41cf36eed2'], date: '2024-06-01' },
  { id: 2, nickname: '李四', avatar: '😊', skuName: '颜色:蓝色', stars: 4, content: '物流很快，穿着舒服。就是颜色比图片稍微深了一点，不过整体满意。', images: [], date: '2024-05-28' },
  { id: 3, nickname: '王五', avatar: '👍', skuName: '', stars: 5, content: '性价比很高，推荐购买！已经是第二次买了。', images: [], date: '2024-05-25' },
  { id: 4, nickname: '赵六', avatar: '💪', skuName: '颜色:红色 · 尺码:L', stars: 3, content: '一般般，这个价位算可以了。线头有点多。', images: [], date: '2024-05-20' },
  { id: 5, nickname: '小明', avatar: '🎯', skuName: '', stars: 2, content: '不太满意，材质和描述有差距。', images: [], date: '2024-05-15' },
  { id: 6, nickname: '小红', avatar: '🌸', skuName: '颜色:蓝色 · 尺码:M', stars: 5, content: '超级好看！朋友都问我要链接，会回购的！', images: ['https://pics0.baidu.com/feed/024f78f0f736afc315d66d1ba63dfbd4b64512ad.jpeg?token=c4633f7e6f4fd69ffc114c41cf36eed2', 'https://pics0.baidu.com/feed/024f78f0f736afc315d66d1ba63dfbd4b64512ad.jpeg?token=c4633f7e6f4fd69ffc114c41cf36eed2'], date: '2024-05-10' },
  { id: 7, nickname: '大刘', avatar: '🏃', skuName: '颜色:红色 · 尺码:XXL', stars: 4, content: '做工不错，细节处理到位。活动价买的，非常划算。', images: [], date: '2024-05-08' },
  { id: 8, nickname: '阿花', avatar: '💐', skuName: '', stars: 5, content: '质量超乎预期！', images: [], date: '2024-05-01' },
]

const reviewFilter = ref('all')
const reviewPage = ref(1)
const pageSize = 3

const reviewTags = computed(() => [
  { key: 'all', label: '全部', count: mockReviews.length },
  { key: 'img', label: '有图', count: mockReviews.filter(r => r.images && r.images.length > 0).length },
  { key: 'good', label: '好评', count: mockReviews.filter(r => r.stars >= 4).length },
  { key: 'bad', label: '差评', count: mockReviews.filter(r => r.stars <= 2).length },
])

const filteredReviews = computed(() => {
  switch (reviewFilter.value) {
    case 'img': return mockReviews.filter(r => r.images && r.images.length > 0)
    case 'good': return mockReviews.filter(r => r.stars >= 4)
    case 'bad': return mockReviews.filter(r => r.stars <= 2)
    default: return mockReviews
  }
})

const pagedReviews = computed(() => {
  return filteredReviews.value.slice(0, reviewPage.value * pageSize)
})

const hasMoreReviews = computed(() => {
  return pagedReviews.value.length < filteredReviews.value.length
})

const loadingReviews = ref(false)

function loadMoreReviews() {
  loadingReviews.value = true
  setTimeout(() => {
    reviewPage.value++
    loadingReviews.value = false
  }, 400)
}

function previewReviewImage(images, index) {
  // 简易预览：后续可接入 Vant ImagePreview
  window.open(images[index], '_blank')
}

// ── 生命周期 ──
onMounted(fetchDetail)
// keep-alive 场景下路由参数变化时重新加载
watch(() => route.params.id, () => {
  if (route.name === 'GoodsDetail') fetchDetail()
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
   主体：左图右信息
   ══════════════════════════════════════════════════════════════ */
.detail-main {
  display: flex;
  flex-direction: column;
  background: #fff;
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

/* ── 桌面端：左右双栏 ── */
@media (min-width: 768px) {
  .detail-top-bar {
    padding: 16px 32px;
  }
  .top-bar-title {
    font-size: 20px;
  }

  .detail-main {
    flex-direction: row;
    align-items: flex-start;
  }
  .detail-gallery {
    flex: 0 0 50%;
    position: sticky;
    top: 70px;
    padding: 20px;
  }
  .gallery-main-img {
    aspect-ratio: 1;
  }

  .detail-info {
    flex: 1;
    min-height: 50vh;
    padding: 28px 32px 32px;
    overflow-y: auto;
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
    max-width: 900px;
    margin: 0 auto;
  }
}

@media (min-width: 1024px) {
  .detail-gallery {
    flex: 0 0 45%;
    padding: 24px;
  }
  .detail-info {
    padding: 36px 40px 40px;
  }
  .goods-name {
    font-size: 28px;
  }
  .goods-price {
    font-size: 36px;
  }
  .tab-panel {
    max-width: 960px;
  }
}

@media (min-width: 1400px) {
  .detail-gallery {
    flex: 0 0 40%;
  }
  .gallery-main-img {
    aspect-ratio: 4/3;
  }
}
</style>
