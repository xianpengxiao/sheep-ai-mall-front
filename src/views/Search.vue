<template>
  <div class="page-search">
    <!-- ═══════ 搜索栏 + 筛选栏（整体 sticky） ═══════ -->
    <div ref="searchWrapRef" class="search-header-wrap">
      <div class="search-top-bar">
        <van-icon name="arrow-left" size="20" class="back-icon" @click="goBack" />
        <form class="search-field" :class="{ focused: isFocused }" @submit.prevent="doSearch">
          <div class="search-type-wrap">
            <span class="search-type-select" @click.stop="toggleTypeDropdown">
              <span class="search-type-text">{{ searchType === 'goods' ? '商品' : '商家' }}</span>
              <van-icon name="arrow-down" size="10" color="#5a5a6e" :class="{ rotated: showTypeDropdown }" />
            </span>
            <transition name="drop-fade">
              <div v-if="showTypeDropdown" class="search-type-dropdown">
                <div class="drop-item" :class="{ active: searchType === 'goods' }" @click="selectType('goods')">商品</div>
                <div class="drop-item" :class="{ active: searchType === 'merchant' }" @click="selectType('merchant')">商家</div>
              </div>
            </transition>
          </div>
          <span class="search-type-divider"></span>
          <van-icon name="search" size="17" color="#9a9aae" />
          <input
            v-model="keyword"
            class="search-field-input"
            :placeholder="searchType === 'goods' ? '搜索商品、品牌...' : '搜索店铺...'"
            @focus="onInputFocus"
            @blur="onInputBlur"
            @input="onKeywordChange"
          />
        </form>
        <span class="search-btn-icon" @click="doSearch">
          <van-icon name="search" size="16" color="#fff" />
        </span>
      </div>

      <!-- 搜索历史下拉（聚焦且关键词为空时显示） -->
      <div v-if="isFocused && !keyword && historyList.length > 0" class="history-dropdown">
        <div class="history-head">
          <span class="history-title">搜索历史</span>
          <span class="history-clear" @click="clearHistory">清除</span>
        </div>
        <div class="history-tags">
          <span
            v-for="(item, i) in historyList"
            :key="i"
            class="history-tag"
            @click="keyword = item; doSearch()"
          >{{ item }}</span>
        </div>
      </div>

      <!-- 筛选栏（仅商品搜索显示） -->
      <div v-if="searchType === 'goods'" class="filter-bar">
        <van-dropdown-menu active-color="#e8573a">
          <van-dropdown-item v-model="categoryFilter" :options="categoryOptions" title="分类" />
          <van-dropdown-item v-model="priceFilter" :options="priceOptions" title="价格" />
          <van-dropdown-item v-model="sortFilter" :options="sortOptions" title="排序" />
        </van-dropdown-menu>
      </div>
    </div>

    <!-- ═══════ 空搜索提示 ═══════ -->
    <div v-if="!hasSearched && !isFocused && !keyword" class="state-wrap">
      <van-empty :description="searchType === 'goods' ? '输入关键词搜索商品' : '输入关键词搜索店铺'" />
    </div>

    <!-- ═══════ 加载中 ═══════ -->
    <div v-else-if="loading && goodsList.length === 0" class="state-wrap">
      <van-loading size="32" color="#e8573a">搜索中...</van-loading>
    </div>

    <!-- ═══════ 无结果 ═══════ -->
    <div v-else-if="!loading && goodsList.length === 0" class="state-wrap">
      <van-empty :description="searchType === 'goods' ? '未找到相关商品' : '未找到相关商家'">
        <span class="empty-hint">试试其他关键词吧</span>
      </van-empty>
    </div>

    <!-- ═══════ 商品搜索结果 ═══════ -->
    <div v-else-if="searchType === 'goods'" class="results-section">
      <div class="results-header">
        <span class="results-count">找到 {{ total }} 件商品</span>
      </div>
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
        offset="80"
      >
        <div class="goods-grid">
          <GoodsCard
            v-for="item in goodsList"
            :key="item.id"
            :id="item.id"
            :title="item.name"
            :title-html="item.nameHighlight || ''"
            :price="item.minPrice"
            :sales="item.salesCount"
            :image="item.mainImage"
          />
        </div>
      </van-list>
    </div>

    <!-- ═══════ 商家搜索结果 ═══════ -->
    <div v-else class="results-section">
      <div class="results-header">
        <span class="results-count">找到 {{ total }} 家店铺</span>
      </div>
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
        offset="80"
      >
        <div class="merchant-list">
          <div
            v-for="item in goodsList"
            :key="item.id"
            class="merchant-card"
            @click="goShop(item.id)"
          >
            <van-image
              class="merchant-logo"
              :src="item.shopLogo"
              fit="cover"
              round
              width="56"
              height="56"
            />
            <div class="merchant-info">
              <div class="merchant-name" v-html="item.shopNameHighlight || item.shopName"></div>
              <div class="merchant-desc" v-html="item.shopDescHighlight || item.shopDesc"></div>
              <div class="merchant-scores">
                <span class="score-item score-main">
                  <van-icon name="star" color="#f39c12" size="12" />
                  {{ item.compositeScore }}
                </span>
                <span class="score-label">描述 {{ item.describeScore }}</span>
                <span class="score-label">服务 {{ item.serviceScore }}</span>
                <span class="score-label">物流 {{ item.logisticsScore }}</span>
              </div>
            </div>
            <van-icon name="arrow" color="#c0b8b0" class="merchant-arrow" />
          </div>
        </div>
      </van-list>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { searchProducts, searchMerchant } from '../api/search.js'
import { getTree } from '../api/category.js'
import GoodsCard from '../components/GoodsCard.vue'

const router = useRouter()
const route = useRoute()
const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 5
const DEBOUNCE_MS = 500

// ── 搜索状态 ──
const keyword = ref('')
const hasSearched = ref(false)
const isFocused = ref(false)
const searchWrapRef = ref(null)
const historyList = ref(loadHistory())
const searchType = ref('goods')   // 'goods' | 'merchant'
const showTypeDropdown = ref(false)

// ── 筛选状态 ──
const categoryFilter = ref(0)
const priceFilter = ref(0)
const sortFilter = ref('relevance')
const categoryOptions = ref([{ text: '全部分类', value: 0 }])
const priceOptions = [
  { text: '全部价格', value: 0 },
  { text: '¥0 ~ 50', value: '0-50' },
  { text: '¥50 ~ 200', value: '50-200' },
  { text: '¥200 ~ 500', value: '200-500' },
  { text: '¥500 以上', value: '500-' },
]
const sortOptions = [
  { text: '综合排序', value: 'relevance' },
  { text: '销量降序', value: 'salesDesc' },
  { text: '价格升序', value: 'priceAsc' },
  { text: '价格降序', value: 'priceDesc' },
  { text: '最新商品', value: 'newest' },
]

// ── 列表状态 ──
const goodsList = ref([])
const loading = ref(false)
const finished = ref(false)
const total = ref(0)
let pageNum = 1
const pageSize = 12
let debounceTimer = null

// ── 工具 ──
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch { return [] }
}

function saveHistory(keyword) {
  const kw = keyword.trim()
  if (!kw) return
  const list = loadHistory().filter(h => h !== kw)
  list.unshift(kw)
  historyList.value = list.slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList.value))
}

function clearHistory() {
  historyList.value = []
  localStorage.removeItem(HISTORY_KEY)
}

/** 解析价格筛选值 */
function parsePriceRange(val) {
  if (!val || val === 0) return {}
  const parts = String(val).split('-')
  return {
    minPrice: parts[0] || undefined,
    maxPrice: parts[1] || undefined,
  }
}

/** 切换类型下拉 */
function toggleTypeDropdown() {
  showTypeDropdown.value = !showTypeDropdown.value
}

/** 选择搜索类型 */
function selectType(type) {
  if (type === searchType.value) {
    showTypeDropdown.value = false
    return
  }
  searchType.value = type
  showTypeDropdown.value = false
  hasSearched.value = false
  goodsList.value = []
  pageNum = 1
  finished.value = false
  total.value = 0
  const kw = keyword.value.trim()
  if (kw) doSearch()
}

function goShop(id) {
  router.push(`/shop/${id}`)
}

// ── 搜索 ──
async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) {
    showToast('请输入搜索关键词')
    return
  }
  if (debounceTimer) clearTimeout(debounceTimer)
  saveHistory(kw)
  hasSearched.value = true
  goodsList.value = []
  pageNum = 1
  finished.value = false
  loading.value = true
  await fetchResults()
}

/** 防抖触发搜索 */
function onKeywordChange() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const kw = keyword.value.trim()
    if (kw) doSearch()
  }, DEBOUNCE_MS)
}

async function fetchResults() {
  const kw = keyword.value.trim()
  try {
    let page
    if (searchType.value === 'merchant') {
      page = await searchMerchant({
        keyword: kw,
        pageNum,
        pageSize,
      })
    } else {
      const priceRange = parsePriceRange(priceFilter.value)
      const params = {
        keyword: kw,
        pageNum,
        pageSize,
        ...(categoryFilter.value ? { categoryId: categoryFilter.value } : {}),
        ...(priceRange.minPrice !== undefined ? { minPrice: priceRange.minPrice } : {}),
        ...(priceRange.maxPrice !== undefined ? { maxPrice: priceRange.maxPrice } : {}),
        sortBy: sortFilter.value,
      }
      page = await searchProducts(params)
    }
    const records = page?.records || []
    goodsList.value.push(...records)
    total.value = page?.total || records.length
    pageNum++
    if (records.length < pageSize) finished.value = true
  } catch (e) {
    console.error('[Search] 请求失败:', e)
    finished.value = true
  } finally {
    loading.value = false
  }
}

let blurTimer = null

function onInputFocus() {
  if (blurTimer) clearTimeout(blurTimer)
  // 实时同步 localStorage 历史
  historyList.value = loadHistory()
  isFocused.value = true
}

function onInputBlur() {
  // 延迟关闭，让历史标签点击事件有时间触发
  blurTimer = setTimeout(() => {
    isFocused.value = false
  }, 150)
}

/** 取消搜索 → 清空关键词回到历史 */
function cancelKeyword() {
  keyword.value = ''
  hasSearched.value = false
  isFocused.value = false
  goodsList.value = []
  finished.value = false
  total.value = 0
}

/** 上拉加载（van-list 触发） */
function onLoad() {
  if (!loading.value) {
    fetchResults()
  }
}

// ── 监听筛选变化重新搜索（仅商品模式） ──
watch([categoryFilter, priceFilter, sortFilter], () => {
  if (searchType.value !== 'goods') return
  const kw = keyword.value.trim()
  if (!kw) return
  if (hasSearched.value) doSearch()
})

// ── 初始化 ──
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
}

// ── 点击外部关闭类型下拉 ──
function onDocumentClick(e) {
  if (showTypeDropdown.value) {
    const wrap = document.querySelector('.search-type-wrap')
    if (wrap && !wrap.contains(e.target)) {
      showTypeDropdown.value = false
    }
  }
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

// ── 生命周期 ──
onMounted(async () => {
  // 首次加载时搜索
  const queryKw = route.query.keyword
  if (queryKw) {
    keyword.value = String(queryKw)
    doSearch()
  }
  // 加载分类树
  loadCategoryTree()
})

// keep-alive 下路由参数变化时重新搜索
watch(() => route.query.keyword, (newKw) => {
  if (newKw) {
    keyword.value = String(newKw)
    doSearch()
  }
})

async function loadCategoryTree() {
  try {
    const tree = await getTree()
    const options = [{ text: '全部分类', value: 0 }]
    /** 只收集叶子分类（无子类的节点） */
    function collectLeaves(cats, parents = []) {
      for (const cat of cats || []) {
        if (cat.children && cat.children.length > 0) {
          collectLeaves(cat.children, [...parents, cat.name])
        } else {
          const label = [...parents, cat.name].join(' / ')
          options.push({ text: label, value: cat.id })
        }
      }
    }
    collectLeaves(tree)
    categoryOptions.value = options
  } catch {
    // 静默处理
  }
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   搜索页 — 暖色调复古全宽风格
   ══════════════════════════════════════════════════════════════ */

.page-search {
  min-height: 100vh;
  background: #fff;
}

/* ── 搜索 + 筛选整体 sticky 容器 ── */
.search-header-wrap {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}

/* ── 顶部搜索栏 ── */
.search-top-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
}
.back-icon {
  cursor: pointer;
  color: var(--text-h, #1a1a2e);
  flex-shrink: 0;
}
.search-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background: #f5f3f0;
  border-radius: 28px;
  border: 2px solid transparent;
  transition: border-color 0.25s;
}
.search-field:focus-within {
  border-color: var(--accent, #e8573a);
  box-shadow: 0 2px 12px rgba(232,87,58,0.12);
}
.search-field-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-h, #1a1a2e);
  font-family: var(--sans, 'Inter', sans-serif);
}
.search-field-input::placeholder {
  color: #9a9aae;
}
.cancel-btn {
  font-size: 14px;
  color: var(--accent, #e8573a);
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── 搜索框内类型选择器 + 下拉 ── */
.search-type-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-type-select {
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}
.search-type-select:active {
  background: #eae6e2;
}
.search-type-select .van-icon.rotated {
  transform: rotate(180deg);
}
.search-type-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent, #e8573a);
}
.search-type-divider {
  width: 1px;
  height: 20px;
  background: #e0dcd8;
  flex-shrink: 0;
  margin-right: 6px;
}
/* 类型下拉面板 */
.search-type-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  min-width: 100px;
  padding: 6px;
  z-index: 200;
  overflow: hidden;
}
.search-type-dropdown .drop-item {
  padding: 10px 16px;
  font-size: 14px;
  color: #1a1a2e;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  text-align: center;
}
.search-type-dropdown .drop-item:hover {
  background: #f5f3f0;
}
.search-type-dropdown .drop-item:active {
  background: #f0ece8;
}
.search-type-dropdown .drop-item.active {
  color: var(--accent, #e8573a);
  font-weight: 600;
  background: #fdf0ed;
}

/* ── 筛选栏 ── */
.filter-bar {
  border-top: 1px solid #f0ece8;
}
.filter-bar :deep(.van-dropdown-menu__bar) {
  box-shadow: none;
  height: 44px;
}
.filter-bar :deep(.van-dropdown-menu__title) {
  font-size: 13px;
  color: #5a5a6e;
}

/* 搜索按钮 */
.search-btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--gradient-warm, linear-gradient(135deg, #e8573a 0%, #f39c12 100%));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

/* 搜索框聚焦态 */
.search-field.focused {
  border-color: var(--accent, #e8573a);
  box-shadow: 0 2px 12px rgba(232,87,58,0.12);
}

/* ── 历史下拉 ── */
.history-dropdown {
  padding: 16px;
  background: #fff;
  border-top: 1px solid #f0ece8;
}
.history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.history-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h, #1a1a2e);
}
.history-clear {
  font-size: 12px;
  color: #9a9aae;
  cursor: pointer;
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
  background: #f0ece8;
}

/* ── 状态容器 ── */
.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}
.empty-hint {
  font-size: 13px;
  color: #9a9aae;
}

/* ── 搜索结果 ── */
.results-section {
  background: #fff;
  margin-top: 2px;
  padding: 16px 10px 20px;
  min-height: 60vh;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.results-header {
  padding: 0 6px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.results-count {
  font-size: 14px;
  color: var(--text-h, #1a1a2e);
  font-weight: 600;
}
.results-count::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--accent, #e8573a);
  margin-right: 8px;
  vertical-align: -2px;
}

/* 商品网格 — 固定 6 列 260px，超出横向滚动 */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(6, 260px);
  gap: 12px;
}

/* 高亮样式 */
:deep(.goods-title em) {
  font-style: normal;
  color: var(--accent, #e8573a);
}

/* ── 商家搜索结果 ── */
.merchant-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.merchant-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 6px;
  border-bottom: 1px solid #f0ece8;
  cursor: pointer;
  transition: background 0.15s;
}
.merchant-card:active {
  background: #faf8f6;
}
.merchant-logo {
  flex-shrink: 0;
  border: 2px solid #f0ece8;
}
.merchant-info {
  flex: 1;
  min-width: 0;
}
.merchant-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.merchant-name em {
  font-style: normal;
  color: var(--accent, #e8573a);
}
.merchant-desc {
  font-size: 12px;
  color: #8a8a9e;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.merchant-desc em {
  font-style: normal;
  color: var(--accent, #e8573a);
}
.merchant-scores {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.score-item {
  font-size: 13px;
  color: #5a5a6e;
  display: flex;
  align-items: center;
  gap: 2px;
}
.score-main {
  font-weight: 600;
  color: #e8573a;
}
.score-label {
  font-size: 11px;
  color: #9a9aae;
}
.merchant-arrow {
  flex-shrink: 0;
}

/* ── 下拉动画 ── */
.drop-fade-enter-active, .drop-fade-leave-active {
  transition: all 0.2s ease;
}
.drop-fade-enter-from, .drop-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ══════════════════════════════════════════════════════════════
   响应式
   ══════════════════════════════════════════════════════════════ */
@media (min-width: 640px) {
  .search-top-bar {
    padding: 12px 20px;
  }
  .results-section {
    padding: 20px 16px 24px;
  }
  .merchant-card {
    padding: 20px 12px;
  }
}

@media (min-width: 900px) {
  .search-top-bar {
    padding: 12px 32px;
  }
  .results-section {
    padding: 24px 24px 28px;
  }
}

@media (min-width: 1200px) {
  .results-section {
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
    padding: 28px 32px 32px;
  }
}
</style>
