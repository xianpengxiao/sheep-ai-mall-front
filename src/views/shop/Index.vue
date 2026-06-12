<template>
  <div class="page-shop">
    <div class="shop-navbar-wrap">
      <NavBar title="店铺" />
    </div>

    <!-- ═══════ 店铺信息头 ═══════ -->
    <div v-if="shopLoadFail" class="shop-error">
      <van-empty description="店铺不存在或已关闭" />
    </div>
    <div v-else-if="shopInfo" class="shop-header">
      <div class="sh-top">
        <van-image
          width="56" height="56" round
          :src="shopInfo.shopLogo || defaultLogo"
          class="sh-logo"
        />
        <div class="sh-info">
          <div class="sh-name-row">
            <span class="sh-name">{{ shopInfo.shopName }}</span>
            <span class="sh-badge" :class="shopInfo.shopStatus === 1 ? 'on' : 'off'">
              <span class="sh-dot"></span>{{ shopInfo.shopStatus === 1 ? '营业中' : '休息中' }}
            </span>
          </div>
          <div class="sh-tags">
            <span class="sh-tag" v-if="shopInfo.businessHours">{{ shopInfo.businessHours }}</span>
            <span class="sh-tag" v-if="shopInfo.afterSaleInfo">{{ shopInfo.afterSaleInfo }}</span>
          </div>
          <div class="sh-meta" v-if="shopInfo.businessScope">{{ shopInfo.businessScope?.split('、').join(' · ') }}</div>
        </div>
      </div>

      <div class="sh-desc-row" v-if="shopInfo.shopDesc">
        <span class="sh-desc-text">{{ shopInfo.shopDesc }}</span>
      </div>

      <!-- DSR 评分 -->
      <div class="sh-score">
        <span class="sh-star">★</span>
        <span class="sh-num">{{ shopInfo.describeScore ?? '--' }}</span>
        <span class="sh-lbl">描述</span>
        <span class="sh-gap"></span>
        <span class="sh-star">★</span>
        <span class="sh-num">{{ shopInfo.serviceScore ?? '--' }}</span>
        <span class="sh-lbl">服务</span>
        <span class="sh-gap"></span>
        <span class="sh-star">★</span>
        <span class="sh-num">{{ shopInfo.logisticsScore ?? '--' }}</span>
        <span class="sh-lbl">物流</span>
        <span class="sh-total">{{ shopInfo.dsrCount || 0 }}条评价</span>
      </div>
    </div>
    <van-loading v-else-if="!shopLoadFail" class="sh-loading" size="24" />

    <!-- ═══════ Tab ═══════ -->
    <van-tabs v-model:active="activeTab" class="shop-tabs" sticky offset-top="46">
      <van-tab title="全部商品" name="goods">
        <div class="tab-content">
          <div v-if="goodsList.length > 0" class="goods-grid">
            <GoodsCard
              v-for="item in goodsList"
              :key="item.id"
              :id="item.id"
              :title="item.name"
              :price="item.minPrice ?? '0.00'"
              :sales="item.salesCount"
              :image="item.mainImage"
            />
          </div>
          <van-empty v-else-if="!goodsLoading" description="暂无商品" />
          <van-loading v-if="goodsLoading" class="loading-center" size="24" />
          <van-pagination
            v-if="goodsTotal > 0"
            v-model="goodsPage"
            :total-items="goodsTotal"
            :items-per-page="goodsPageSize"
            @change="fetchGoods"
            mode="simple"
            class="shop-pagination"
          />
        </div>
      </van-tab>

      <van-tab title="评价" name="reviews">
        <div class="tab-content">
          <div class="review-filter">
            <span
              v-for="opt in reviewFilterOptions"
              :key="opt.value"
              class="filter-btn"
              :class="{ active: reviewRating === opt.value }"
              @click="filterReviews(opt.value)"
            >{{ opt.label }}<em v-if="opt.count != null" class="filter-count">{{ opt.count }}</em></span>
          </div>
          <div v-if="displayReviews.length > 0" class="review-list">
            <div v-for="item in displayReviews" :key="item.id" class="review-item">
              <div class="review-user-row">
                <van-image v-if="item.avatar" round width="32" height="32" :src="item.avatar" class="review-avatar" />
                <div v-else class="review-avatar-placeholder"><van-icon name="user-o" size="16" color="#c8c4c0" /></div>
                <div class="review-user-info">
                  <span class="review-username">{{ item.memberName || item.username || '匿名用户' }}</span>
                  <span class="review-time">{{ item.createTime }}</span>
                </div>
                <span class="review-stars">
                  <van-icon v-for="s in 5" :key="s" :name="s <= item.rating ? 'star' : 'star-o'" size="16" :color="s <= item.rating ? '#f39c12' : '#e0dcd8'" />
                </span>
              </div>
              <div class="review-content">{{ item.content }}</div>
              <div v-if="item.spuName || item.skuName" class="review-spec-row">
                <span v-if="item.spuName" class="review-spu">{{ item.spuName }}</span>
                <span v-if="item.skuName" class="review-sku">{{ item.skuName }}</span>
              </div>
              <div v-if="item.imageList?.length" class="review-images">
                <van-image
                  v-for="(img, i) in item.imageList" :key="i"
                  width="64" height="64" fit="cover" :src="img"
                  class="review-img" @click="previewImages(item.imageList, i)"
                />
              </div>
            </div>
          </div>
          <van-empty v-else-if="!reviewsLoading" description="暂无评价" />
          <van-loading v-if="reviewsLoading" class="loading-center" size="24" />
          <van-pagination
            v-if="filteredTotal > 0"
            v-model="reviewsPage"
            :total-items="filteredTotal"
            :items-per-page="reviewsPageSize"
            mode="simple"
            class="shop-pagination"
          />
        </div>
      </van-tab>
    </van-tabs>

    <!-- 图片预览 -->
    <van-image-preview v-model:show="showPreview" :images="previewImagesList" :start-position="previewIndex" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onActivated, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getMerchantInfo, getMerchantGoods, getMerchantReviews } from '../../api/merchant.js'
import NavBar from '../../components/NavBar.vue'
import GoodsCard from '../../components/GoodsCard.vue'

const route = useRoute()
const router = useRouter()

const defaultLogo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e8573a' rx='16'/%3E%3Ctext x='50' y='66' text-anchor='middle' font-size='44' fill='%23fff'%3E🏪%3C/text%3E%3Csvg%3E"

// ── 店铺信息 ──
const shopInfo = ref(null)
const shopLoadFail = ref(false)

// ── Tab ──
const activeTab = ref('goods')

// ── 商品 ──
const goodsList = ref([])
const goodsLoading = ref(false)
const goodsPage = ref(1)
const goodsPageSize = 20
const goodsTotal = ref(0)

// ── 评价 ──
const reviewsList = ref([])
const reviewsLoading = ref(false)
const reviewsPage = ref(1)
const reviewsPageSize = 10
const reviewsTotal = ref(0)
const reviewRating = ref(0)
const reviewFilterOptions = computed(() => {
  const all = reviewsList.value
  return [
    { label: '全部', value: 0, count: all.length },
    { label: '好评', value: 1, count: all.filter(r => r.rating >= 4).length },
    { label: '中评', value: 2, count: all.filter(r => r.rating === 3).length },
    { label: '差评', value: 3, count: all.filter(r => r.rating <= 2).length },
  ]
})

/** 客户端按评分过滤 */
const filteredReviews = computed(() => {
  const list = reviewsList.value
  const r = reviewRating.value
  if (r === 0) return list
  if (r === 1) return list.filter(i => i.rating >= 4)
  if (r === 2) return list.filter(i => i.rating === 3)
  if (r === 3) return list.filter(i => i.rating <= 2)
  return list
})

/** 当前页展示的评价 */
const displayReviews = computed(() => {
  const start = (reviewsPage.value - 1) * reviewsPageSize
  return filteredReviews.value.slice(start, start + reviewsPageSize)
})

/** 过滤后的总数 */
const filteredTotal = computed(() => filteredReviews.value.length)

// ── 图片预览 ──
const showPreview = ref(false)
const previewImagesList = ref([])
const previewIndex = ref(0)

function previewImages(images, index) {
  previewImagesList.value = images
  previewIndex.value = index
  showPreview.value = true
}

// ── 获取店铺信息 ──
async function fetchShopInfo() {
  const id = route.params.id
  if (!id) return
  shopLoadFail.value = false
  try {
    shopInfo.value = await getMerchantInfo(id, { silent: true })
  } catch {
    shopInfo.value = null
    shopLoadFail.value = true
    console.warn('[Shop] 店铺不存在或获取失败 id=', id)
  }
}

// ── 获取商品列表 ──
async function fetchGoods() {
  const id = route.params.id
  if (!id) return
  goodsLoading.value = true
  try {
    const res = await getMerchantGoods(id, { pageNum: goodsPage.value, pageSize: goodsPageSize })
    goodsList.value = res.records || res.list || []
    goodsTotal.value = res.total || 0
  } catch {
    goodsList.value = []
  } finally {
    goodsLoading.value = false
  }
}

// ── 获取评价列表 ──
async function fetchReviews() {
  const id = route.params.id
  if (!id) return
  reviewsLoading.value = true
  try {
    const res = await getMerchantReviews(id, { pageNum: 1, pageSize: 50 })
    reviewsList.value = res.records || res.list || []
    reviewsTotal.value = res.total || 0
  } catch {
    reviewsList.value = []
  } finally {
    reviewsLoading.value = false
  }
}

function filterReviews(val) {
  reviewRating.value = val
  reviewsPage.value = 1
}

// 切换到评价 Tab 时加载数据
watch(activeTab, (val) => {
  if (val === 'reviews' && !reviewsLoading.value) {
    fetchReviews()
  }
})

// keep-alive 重新激活时刷新评价
onActivated(() => {
  if (route.name === 'Shop' && activeTab.value === 'reviews') {
    fetchReviews()
  }
})

onMounted(async () => {
  await fetchShopInfo()
  fetchGoods()
})

// keep-alive 缓存下路由参数变化时重新加载数据
watch(() => route.params.id, (newId) => {
  if (route.name === 'Shop' && newId) {
    shopInfo.value = null
    fetchShopInfo()
    fetchGoods()
    reviewsList.value = []
  }
})
</script>

<style scoped>
.page-shop {
  min-height: 100vh;
  background: #f5f3f0;
  padding-bottom: 20px;
}

/* ── 店铺加载失败 ── */
.shop-error {
  background: #fff;
  padding: 40px 0;
}
.sh-loading {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

/* ── 店铺信息头（暖色渐变，参考商家中心风格） ── */
.shop-header {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
  padding: 0;
  margin-bottom: 0;
}
.sh-top {
  display: flex;
  gap: 14px;
  padding: 20px 18px 12px;
}
.sh-logo {
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.25);
}
.sh-info {
  flex: 1;
  min-width: 0;
}
.sh-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.sh-name {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sh-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 8px;
  white-space: nowrap;
}
.sh-badge.on {
  background: rgba(105,240,174,0.2);
  color: #69f0ae;
}
.sh-badge.on .sh-dot {
  box-shadow: 0 0 3px currentColor;
}
.sh-badge.off {
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.6);
}
.sh-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.sh-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.sh-tag {
  font-size: 11px;
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.12);
  padding: 1px 8px;
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.sh-meta {
  font-size: 12px;
  margin-top: 2px;
  opacity: 0.55;
}
.sh-desc-row {
  padding: 2px 18px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255,255,255,0.85);
}
.sh-score {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: rgba(0,0,0,0.06);
  flex-wrap: wrap;
  margin-top: 0;
  border-top: none;
}
.sh-star {
  font-size: 14px;
  color: #ffd54f;
  margin-right: 2px;
}
.sh-num {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  margin-right: 0;
}
.sh-lbl {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}
.sh-gap {
  width: 1px;
  height: 14px;
  background: rgba(255,255,255,0.2);
  margin: 0 10px;
}
.sh-total {
  margin-left: auto;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}

.sh-loading {
  padding: 60px 0;
}

/* ── Sticky NavBar ── */
.shop-navbar-wrap {
  position: sticky;
  top: 0;
  z-index: 101;
}

/* ── Tabs ── */
.shop-tabs :deep(.van-tabs__wrap) {
  position: sticky;
  top: 46px;
  z-index: 100;
  background: #fff;
}
.shop-tabs :deep(.van-tab) {
  font-size: 14px;
  color: #9a9aae;
}
.shop-tabs :deep(.van-tab--active) {
  color: #e8573a;
  font-weight: 600;
}
.shop-tabs :deep(.van-tabs__line) {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  width: 28px;
}

/* ── Tab 内容 ── */
.tab-content {
  padding: 12px 12px 0;
}

/* ── 商品网格（主页风格） ── */
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (min-width: 640px) {
  .goods-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 1024px) {
  .goods-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* ── 评价 ── */
.review-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.filter-btn {
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 16px;
  background: #fff;
  color: #5a5a6e;
  cursor: pointer;
  border: 1px solid #f0ece8;
  transition: all 0.15s;
}
.filter-btn.active {
  background: #e8573a;
  color: #fff;
  border-color: #e8573a;
  font-weight: 500;
}
.filter-count {
  font-style: normal;
  font-size: 11px;
  margin-left: 3px;
}
.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.review-item {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
}
.review-user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.review-avatar {
  flex-shrink: 0;
}
.review-avatar-placeholder {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: #f5f3f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.review-user-info {
  flex: 1;
  min-width: 0;
}
.review-username {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  display: block;
}
.review-time {
  font-size: 12px;
  color: #9a9aae;
}
.review-stars {
  flex-shrink: 0;
  display: flex;
  gap: 2px;
}
.review-content {
  font-size: 14px;
  color: #1a1a2e;
  line-height: 1.6;
}
.review-spec-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.review-spu,
.review-sku {
  font-size: 12px;
  color: #5a5a6e;
  background: #f5f3f0;
  padding: 3px 10px;
  border-radius: 4px;
}
.review-images {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.review-img {
  border-radius: 6px;
  cursor: pointer;
}

/* ── 分页 ── */
.shop-pagination {
  padding: 16px 0;
  background: transparent;
}
.shop-pagination :deep(.van-pagination__item) {
  border: none;
  background: transparent;
  color: #5a5a6e;
}
.shop-pagination :deep(.van-pagination__item--active) {
  color: #e8573a;
  font-weight: 600;
}

.loading-center {
  padding: 60px 0;
}
</style>
