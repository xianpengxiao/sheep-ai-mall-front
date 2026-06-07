<template>
  <div class="page-home">
    <!-- 1. 顶部导航 -->
    <div class="top-bar">
      <div class="brand">SheepAI Mall</div>
      <nav class="pc-nav">
        <span class="pc-nav-item active">首页</span>
        <span class="pc-nav-item" @click="$router.push('/cart')">购物车</span>
        <span class="pc-nav-item" @click="$router.push('/profile')">个人中心</span>
        <!-- 商家中心下拉 -->
        <div class="merchant-dropdown" @mouseenter="openMerchantDropdown" @mouseleave="merchantOpen = false">
          <span class="pc-nav-item merchant-trigger" :class="{ active: merchantOpen }">
            商家中心 <van-icon name="arrow-down" size="12" :class="{ rotated: merchantOpen }" />
          </span>
          <transition name="drop-fade">
            <div v-if="merchantOpen" class="dropdown-panel">
              <div class="dropdown-item" @click="goMerchant('apply')">
                <span class="drop-icon">🏪</span>
                <div class="drop-text">
                  <div class="drop-title">{{ applyBtnText }}</div>
                  <div class="drop-desc">{{ applyBtnDesc }}</div>
                </div>
              </div>
              <div
                class="dropdown-item"
                :class="{ disabled: !merchantVerified }"
                @click="goMerchant('dashboard')"
              >
                <span class="drop-icon">📊</span>
                <div class="drop-text">
                  <div class="drop-title">我的店铺</div>
                  <div class="drop-desc">{{ merchantVerified ? '管理店铺商品/订单' : '请先完成商家入驻' }}</div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </nav>
      <div class="top-actions">
        <div class="icon-btn" @click="goMerchantMobile">
          <van-icon name="shop-o" size="20" />
        </div>
        <div class="icon-btn" @click="$router.push('/cart')">
          <van-icon name="shopping-cart-o" size="20" />
          <span class="badge" v-if="cartCount > 0">{{ cartCount > 99 ? '99+' : cartCount }}</span>
        </div>
        <div class="icon-btn" @click="$router.push('/profile')">
          <van-icon name="user-o" size="20" />
        </div>
      </div>
    </div>

    <!-- 2. 搜索栏 -->
    <div ref="searchWrapRef" class="search-wrap" :class="{ active: showSearch }">
      <!-- 搜索条 -->
      <div class="search-bar" v-if="!showSearch" @click="openSearch">
        <van-icon name="search" size="17" color="#9a9aae" />
        <span>搜索商品、品牌...</span>
      </div>

      <!-- 激活态：输入框 + 下拉面板 -->
      <template v-else>
        <form class="search-bar active" @submit.prevent="onSearchSubmit">
          <van-icon name="search" size="17" color="#9a9aae" />
          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            class="search-input-field"
            placeholder="搜索商品、品牌..."
            autofocus
          />
          <van-icon name="search" size="17" color="#fff" class="search-btn-icon" @click="onSearchSubmit" />
        </form>

        <!-- 搜索历史下拉 -->
        <div v-if="historyList.length > 0" class="search-dropdown">
          <div class="history-head">
            <span>搜索历史</span>
            <span class="history-clear" @click="clearSearchHistory">清除</span>
          </div>
          <div class="history-tags">
            <span
              v-for="(item, i) in historyList"
              :key="i"
              class="history-tag"
              @click="searchKeyword = item; onSearchSubmit()"
            >{{ item }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- 3. Banner -->
    <div class="banner-wrap">
      <div class="banner" @click="$router.push('/search')">
        <div class="banner-text">
          <h3>🔥 夏日焕新季</h3>
          <p>全场低至5折 · 限时特惠</p>
        </div>
        <span class="banner-emoji">🎁</span>
      </div>
    </div>

    <!-- 4. 品类快速入口 -->
    <div class="quick-cats">
      <div class="quick-cats-scroll">
        <div
          v-for="(cat, i) in quickCategories"
          :key="cat.id"
          class="quick-cat-item"
          :class="{ active: quickActive === i }"
          @click="onQuickCatClick(i)"
        >
          <div class="quick-cat-icon">{{ cat.icon }}</div>
          <span class="quick-cat-label">{{ cat.name }}</span>
        </div>
      </div>
    </div>

    <div class="section-gap"></div>

    <!-- 5. 商品区：子分类标签 + 商品网格 -->
    <div class="main-section">
      <div class="sidebar" v-if="subCategories.length > 0">
        <div
          v-for="sub in subCategories"
          :key="sub.id"
          class="sidebar-item"
          :class="{ active: activeSubId === sub.id }"
          @click="onSubCategoryClick(sub)"
        >
          {{ sub.name }}
        </div>
      </div>

      <div class="content-area">
        <div class="sub-tags" v-if="subCategories.length > 0">
          <span
            v-for="sub in subCategories"
            :key="sub.id"
            class="sub-tag"
            :class="{ active: activeSubId === sub.id }"
            @click="onSubCategoryClick(sub)"
          >
            {{ sub.name }}
          </span>
        </div>

        <van-list
          :key="currentCategoryId || 'loading'"
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
          offset="100"
        >
          <div class="goods-grid">
            <GoodsCard
              v-for="item in goodsList"
              :key="item.id"
              :id="item.id"
              :title="item.name"
              :price="item.minPrice"
              :sales="item.sales"
              :image="item.mainImage"
            />
          </div>
          <van-empty v-if="!loading && goodsList.length === 0" description="暂无商品" />
        </van-list>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '../../stores/user.js'
import { getShopInfo } from '../../api/merchant.js'
import { getTree } from '../../api/category.js'
import { getSpuPage, getSkuBySpuId } from '../../api/goods.js'
import GoodsCard from '../../components/GoodsCard.vue'

const router = useRouter()
const userStore = useUserStore()

const isLoggedIn = computed(() => userStore.isLogin)
const merchantOpen = ref(false)
// 是否已验证为商家（通过 /api/merchant/info 确认）
const merchantVerified = ref(null) // null=未查 false=不是 true=是

// 开店入驻按钮文案
const applyBtnText = computed(() => {
  if (merchantVerified.value) return '已入驻'
  return '开店入驻'
})
const applyBtnDesc = computed(() => {
  if (merchantVerified.value) return '您已成功入驻'
  return '成为 SheepAI 商家'
})

async function openMerchantDropdown() {
  merchantOpen.value = true
  if (!isLoggedIn.value || merchantVerified.value !== null) return
  try {
    await getShopInfo()
    merchantVerified.value = true
  } catch {
    merchantVerified.value = false
  }
}

function goMerchant(target) {
  if (!isLoggedIn.value) {
    showConfirmDialog({ title: '提示', message: '请先登录后再操作', confirmButtonText: '去登录', cancelButtonText: '返回' })
      .then(() => router.push({ name: 'Login', query: { redirect: '/merchant/apply' } }))
      .catch(() => {})
    return
  }
  if (target === 'apply') {
    router.push(merchantVerified.value ? '/merchant/dashboard' : '/merchant/apply')
  } else if (target === 'dashboard') {
    if (!merchantVerified.value) return showToast('请先完成商家入驻')
    router.push('/merchant/dashboard')
  }
  merchantOpen.value = false
}

function goMerchantMobile() {
  if (!isLoggedIn.value) {
    showConfirmDialog({ title: '提示', message: '请先登录后再操作', confirmButtonText: '去登录', cancelButtonText: '返回' })
      .then(() => router.push({ name: 'Login', query: { redirect: '/merchant/apply' } }))
      .catch(() => {})
    return
  }
  router.push(merchantVerified.value ? '/merchant/dashboard' : '/merchant/apply')
}

// ── 搜索遮罩 ──
const showSearch = ref(false)
const searchKeyword = ref('')
const searchWrapRef = ref(null)

const HISTORY_KEY = 'search_history'
const historyList = ref(loadSearchHistory())

function loadSearchHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [] } catch { return [] }
}

function clearSearchHistory() {
  historyList.value = []
  localStorage.removeItem(HISTORY_KEY)
}

function openSearch() {
  showSearch.value = true
  // 实时同步 localStorage 历史
  historyList.value = loadSearchHistory()
  setTimeout(() => {
    searchInputRef.value?.focus()
  }, 50)
}

/** 点击搜索区域外部 → 关闭 */
function onClickOutside(e) {
  if (showSearch.value && searchWrapRef.value && !searchWrapRef.value.contains(e.target)) {
    showSearch.value = false
    searchKeyword.value = ''
  }
}

/** 提交搜索 → 保存历史 → 跳转搜索页 */
function onSearchSubmit() {
  const kw = searchKeyword.value.trim()
  if (!kw) return
  const list = loadSearchHistory().filter(h => h !== kw)
  list.unshift(kw)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 5)))
  showSearch.value = false
  searchKeyword.value = ''
  router.push({ name: 'Search', query: { keyword: kw } })
}

const cartCount = ref(0)

const CAT_ICONS = {
  '推荐': '⭐', '手机': '📱', '数码': '💻', '电脑': '🖥', '笔记本': '💻',
  '家电': '🏠', '电器': '🔌', '服饰': '👗', '衣服': '👕', '鞋': '👟',
  '鞋靴': '👟', '美妆': '💄', '护肤': '✨', '生鲜': '🍜', '食品': '🍜',
  '零食': '🍪', '饮料': '🥤', '运动': '🏀', '户外': '🏕', '图书': '📚',
  '游戏': '🎮', '母婴': '🍼', '医药': '💊', '家居': '🛋', '宠物': '🐾',
  '珠宝': '💎', '手表': '⌚', '汽车': '🚗', '办公': '🖨',
}

const quickCategories = ref([])
const quickActive = ref(0)

function buildQuickCats(tree) {
  const list = (tree || []).slice(0, 8)
  return list.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: matchIcon(cat.name),
  }))
}

function matchIcon(name) {
  for (const [key, icon] of Object.entries(CAT_ICONS)) {
    if (name.includes(key)) return icon
  }
  return '📦'
}

function onQuickCatClick(index) {
  quickActive.value = index
  const cat = quickCategories.value[index]
  const treeCat = categoryTree.value.find(c => c.id === cat?.id)
  const children = treeCat?.children
  activeSubId.value = children?.length ? children[0].id : null
  resetGoodsList()
}

const categoryTree = ref([])
const activeSubId = ref(null)

const subCategories = computed(() => {
  const cat = quickCategories.value[quickActive.value]
  const treeCat = categoryTree.value.find(c => c.id === cat?.id)
  return treeCat?.children || []
})

const currentCategoryId = computed(() => {
  return activeSubId.value || quickCategories.value[quickActive.value]?.id
})

const goodsList = ref([])
const loading = ref(false)
const finished = ref(false)
const pageNum = ref(1)
const pageSize = 12

onMounted(async () => {
  try {
    const tree = await getTree()
    categoryTree.value = tree || []
    quickCategories.value = buildQuickCats(categoryTree.value)
    if (quickCategories.value.length > 0) {
      const firstCat = categoryTree.value[0]
      const firstChildren = firstCat?.children
      if (firstChildren?.length) {
        activeSubId.value = firstChildren[0].id
      }
    }
  } catch {
    // 静默处理
  }
})

// keep-alive 重新激活时刷新商家状态
onActivated(async () => {
  if (!userStore.isLogin) { merchantVerified.value = null; return }
  try {
    await getShopInfo()
    merchantVerified.value = true
  } catch {
    merchantVerified.value = false
  }
})

// 全局点击 → 关闭搜索下拉
document.addEventListener('mousedown', onClickOutside)
onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
})

function onSubCategoryClick(sub) {
  if (activeSubId.value === sub.id) return
  activeSubId.value = sub.id
  resetGoodsList()
}

function resetGoodsList() {
  goodsList.value = []
  pageNum.value = 1
  finished.value = false
}

async function onLoad() {
  const catId = currentCategoryId.value
  if (!catId) {
    loading.value = false
    return
  }

  try {
    const res = await getSpuPage({
      categoryId: catId,
      pageNum: pageNum.value,
      pageSize,
    })
    const page = res || {}
    let records = page.records || []

    // 过滤已打烊商家的商品（shopStatus: 0=打烊, 其他值=营业中或无商家）
    records = records.filter(r => r.shopStatus === undefined || r.shopStatus === null || String(r.shopStatus) !== '0')

    // 批量获取每个 SPU 下 SKU 的最低价格
    if (records.length > 0) {
      const results = await Promise.allSettled(
        records.map(r => getSkuBySpuId(r.id))
      )
      records.forEach((record, i) => {
        const skus = results[i].value
        if (Array.isArray(skus) && skus.length > 0) {
          const minPrice = Math.min(...skus.map(s => Number(s.price || 0)))
          record.minPrice = minPrice.toFixed(2)
        } else {
          record.minPrice = '0.00'
        }
      })
    }

    goodsList.value.push(...records)
    pageNum.value++

    if (records.length < pageSize) {
      finished.value = true
    }
  } catch {
    finished.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-home {
  background: #fff;
  min-height: 100vh;
}

/* ── 顶部导航 ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}
.brand {
  font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.8px;
  background: var(--gradient-warm, linear-gradient(135deg, #e8573a 0%, #f39c12 100%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  flex-shrink: 0;
}

/* PC 导航 */
.pc-nav {
  display: none;
  gap: 32px;
}
.pc-nav-item {
  font-size: 14px;
  font-weight: 500;
  color: #5a5a6e;
  cursor: pointer;
  transition: color 0.2s;
  padding: 4px 0;
  border-bottom: 2px solid transparent;
}
.pc-nav-item:hover,
.pc-nav-item.active {
  color: #1a1a2e;
}
.pc-nav-item.active {
  border-bottom-color: #e8573a;
}

/* ── 商家中心下拉 ── */
.merchant-dropdown {
  position: relative;
}
.merchant-trigger {
  display: flex !important;
  align-items: center;
  gap: 2px;
}
.merchant-trigger .van-icon {
  transition: transform 0.2s;
}
.merchant-trigger .van-icon.rotated {
  transform: rotate(180deg);
}
.dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
  padding: 8px;
  z-index: 200;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.dropdown-item:hover:not(.disabled) {
  background: #faf8f6;
}
.dropdown-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.drop-icon {
  font-size: 28px;
  flex-shrink: 0;
}
.drop-text {
  flex: 1;
}
.drop-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}
.drop-desc {
  font-size: 12px;
  color: #9a9aae;
  margin-top: 2px;
}
.drop-fade-enter-active,
.drop-fade-leave-active {
  transition: all 0.2s ease;
}
.drop-fade-enter-from,
.drop-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* 移动端图标按钮 */
.top-actions {
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
  position: relative;
  transition: all 0.2s;
}
.icon-btn:hover {
  border-color: #e8573a;
  background: #fff;
}
.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--gradient-warm, linear-gradient(135deg, #e8573a 0%, #f39c12 100%));
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── 搜索栏 ── */
.search-wrap {
  padding: 6px 16px 14px;
  background: #fff;
  position: sticky;
  top: 62px;
  z-index: 99;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background: #f5f3f0;
  border-radius: 28px;
  cursor: pointer;
  transition: all 0.25s;
  border: 2px solid transparent;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.search-bar:hover {
  border-color: #fdd;
  box-shadow: 0 2px 12px rgba(232,87,58,0.08);
}
.search-bar span {
  color: #9a9aae;
  font-size: 14px;
  flex: 1;
}

/* 搜索激活态输入框 */
.search-bar.active {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background: #f5f3f0;
  border-radius: 28px;
  border: 2px solid var(--accent, #e8573a);
  box-shadow: 0 2px 12px rgba(232,87,58,0.12);
}
.search-input-field {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-h, #1a1a2e);
  font-family: var(--sans, 'Inter', sans-serif);
}
.search-input-field::placeholder {
  color: #9a9aae;
}
.search-cancel {
  font-size: 14px;
  color: var(--accent, #e8573a);
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
}
.search-btn-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--gradient-warm, linear-gradient(135deg, #e8573a 0%, #f39c12 100%));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

/* 搜索历史下拉面板 */
.search-dropdown {
  background: #fff;
  padding: 16px;
  margin-top: 2px;
}
.history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h, #1a1a2e);
}
.history-clear {
  font-size: 12px;
  color: #9a9aae;
  cursor: pointer;
  font-weight: 400;
}
.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.history-tag {
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  background: #f5f3f0;
  color: #5a5a6e;
  cursor: pointer;
  transition: background 0.2s;
}
.history-tag:active {
  background: #e8e4e0;
}

/* ── Banner ── */
.banner-wrap {
  padding: 0 16px 14px;
  background: #fff;
}
.banner {
  border-radius: 20px;
  padding: 20px 24px;
  background: var(--gradient-warm, linear-gradient(135deg, #e8573a 0%, #f39c12 100%));
  color: #fff;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}
.banner::after {
  content: '';
  position: absolute;
  right: -20px;
  top: -20px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
}
.banner-text h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #fff;
}
.banner-text p {
  font-size: 13px;
  opacity: 0.9;
  color: #fff;
}
.banner-emoji {
  font-size: 48px;
  position: relative;
  z-index: 1;
}

/* ── 品类快速入口 ── */
.quick-cats {
  padding: 0 16px 14px;
  background: #fff;
  position: sticky;
  top: 126px;
  z-index: 98;
}
.quick-cats-scroll {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.quick-cats-scroll::-webkit-scrollbar {
  display: none;
}
.quick-cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}
.quick-cat-item:active {
  transform: scale(0.93);
}
.quick-cat-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: #f5f3f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  transition: all 0.2s;
}
.quick-cat-item.active .quick-cat-icon {
  background: var(--gradient-warm, linear-gradient(135deg, #e8573a 0%, #f39c12 100%));
  box-shadow: 0 4px 14px rgba(232,87,58,0.25);
}
.quick-cat-label {
  font-size: 12px;
  color: #5a5a6e;
  font-weight: 500;
}
.quick-cat-item.active .quick-cat-label {
  color: #e8573a;
  font-weight: 700;
}

/* ── 分割 ── */
.section-gap {
  height: 10px;
  background: transparent;
}

/* ── 主体商品区 ── */
.main-section {
  display: flex;
}

.sidebar {
  width: 86px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 0 20px 0 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.02);
}
.sidebar-item {
  padding: 15px 6px;
  text-align: center;
  font-size: 13px;
  color: #5a5a6e;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  font-weight: 500;
  border-right: 3px solid transparent;
}
.sidebar-item.active {
  color: #e8573a;
  font-weight: 700;
  background: linear-gradient(90deg, #fff5f3 0%, #fff 100%);
  border-right-color: #e8573a;
}

.content-area {
  flex: 1;
  padding: 12px 10px;
  background: #fff;
}

/* 子分类标签 */
.sub-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 0 14px;
}
.sub-tag {
  padding: 7px 16px;
  border-radius: 18px;
  font-size: 12px;
  font-weight: 600;
  background: #f8f6f4;
  color: #5a5a6e;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid transparent;
  user-select: none;
}
.sub-tag.active {
  background: #e8573a;
  color: #fff;
  box-shadow: 0 2px 8px rgba(232,87,58,0.3);
}

/* 商品网格 — 响应式 */
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ── PC 端适配 ── */
@media (min-width: 640px) {
  .goods-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .sidebar {
    width: 120px;
  }
}

@media (min-width: 768px) {
  .top-bar {
    padding: 14px 32px 10px;
  }
  .brand {
    font-size: 26px;
  }
  .pc-nav {
    display: flex;
    align-items: center;
  }
  .top-actions {
    display: none;
  }
  .search-wrap {
    padding: 6px 32px 14px;
  }
  .banner-wrap {
    padding: 0 32px 14px;
  }
  .quick-cats {
    padding: 0 32px 14px;
  }
  .quick-cats-scroll {
    gap: 32px;
    overflow-x: visible;
  }
  .content-area {
    padding: 16px 20px;
  }
}

@media (min-width: 900px) {
  .goods-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .sidebar {
    width: 160px;
  }
}

@media (min-width: 1200px) {
  .goods-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 20px;
  }
}
</style>
