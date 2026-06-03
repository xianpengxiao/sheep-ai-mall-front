<template>
  <div class="page-cart">
    <!-- ═══════ 导航栏（粘性） ═══════ -->
    <div class="nav-bar-sticky">
      <NavBar title="购物车">
        <template v-if="goodsList.length > 0" #right>
          <span class="clear-btn" @click="handleClear">清空</span>
        </template>
      </NavBar>
    </div>

    <!-- ═══════ 购物车工具栏：搜索 + 全选 + 分类 ═══════ -->
    <div v-if="goodsList.length > 0" class="cart-toolbar">
      <div class="toolbar-row">
        <div class="toolbar-search">
          <van-icon name="search" size="15" color="#9a9aae" />
          <input v-model="searchKeyword" class="toolbar-search-input" placeholder="在购物车中搜索..." />
          <van-icon v-if="searchKeyword" name="cross" size="14" color="#9a9aae" class="search-clear" @click="searchKeyword = ''" />
        </div>
        <van-button size="small" round plain class="category-btn" @click="showCategoryPopup = !showCategoryPopup">
          <van-icon name="filter-o" size="14" /> 分类
        </van-button>
      </div>
      <div class="toolbar-row select-row">
        <van-checkbox v-model="allSelected" shape="square" size="16">全选</van-checkbox>
        <span v-if="selectedList.length > 0" class="batch-del-btn" @click="handleBatchRemove">
          删除选中 ({{ selectedList.length }})
        </span>
      </div>
    </div>

    <!-- ═══════ 分类下拉 ═══════ -->
    <transition name="dropdown">
      <div v-if="showCategoryPopup && categories.length > 0" class="category-dropdown">
        <div class="category-inner">
          <span
            v-for="cat in categories"
            :key="cat.id"
            class="category-tag"
            :class="{ active: activeCategoryId === cat.id }"
            @click="onCategorySelect(cat)"
          >{{ cat.name }}</span>
        </div>
      </div>
    </transition>

    <!-- ═══════ 加载中 ═══════ -->
    <div v-if="loading && goodsList.length === 0" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <!-- ═══════ 空状态 ═══════ -->
    <div v-else-if="goodsList.length === 0" class="state-wrap">
      <van-empty description="购物车是空的">
        <span class="empty-hint">快去挑选心仪的商品吧</span>
        <van-button
          type="primary"
          round
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          class="empty-btn"
          @click="goHome"
        >去逛逛</van-button>
      </van-empty>
    </div>

    <!-- ═══════ 购物车列表 ═══════ -->
    <template v-else>

      <!-- 商品列表 -->
      <TransitionGroup name="list" tag="div" class="cart-list">
        <div v-for="item in displayList" :key="item.skuId" class="cart-item">
          <van-checkbox v-model="item.checked" shape="square" @change="onItemCheckChange(item)" />
          <van-image
            :src="item.skuImage || item.spuImage"
            width="80"
            height="80"
            fit="cover"
            class="item-img"
            @click="goGoods(item.spuId)"
          />
          <div class="item-body">
            <div class="item-top">
              <div class="item-name van-multi-ellipsis--l2" @click="goGoods(item.spuId)">
                <span v-html="highlightText(item.spuName, searchKeyword)"></span>
              </div>
              <span class="item-del" @click="handleRemove(item)">删除</span>
            </div>
            <div class="item-specs" v-if="item.specInfo">{{ formatSpecs(item.specInfo) }}</div>
            <div class="item-bottom">
              <span class="item-price">&yen;{{ formatPrice(item.price) }}</span>
              <van-stepper
                v-model="item.quantity"
                :min="1"
                :max="item.stock || 999"
                integer
                button-size="22"
                input-width="32"
                @change="onQuantityChange(item)"
              />
            </div>
          </div>
        </div>

        <!-- 搜索无结果 -->
        <div v-if="displayList.length === 0 && (searchKeyword || activeCategoryId)" key="no-result" class="search-no-result">
          <van-icon name="search" size="44" color="#e0dcd8" />
          <span>未找到匹配的商品</span>
          <span class="search-no-hint" @click="clearFilters">清空筛选条件</span>
        </div>
      </TransitionGroup>

      <!-- 底部固定栏 -->
      <van-submit-bar
        :price="totalPrice"
        button-text="去结算"
        @submit="handleCheckout"
        :disabled="selectedList.length === 0"
        button-color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
        :safe-area-inset-bottom="true"
        background="#fff"
      >
        <template #tip>
          <div class="submit-tip-row" v-if="selectedList.length > 0">
            <span class="selected-tip">已选 {{ selectedList.length }} 件</span>
            <span class="detail-link" @click="showSettlement = true">查看明细 <van-icon name="arrow" /></span>
          </div>
        </template>
      </van-submit-bar>

      <!-- 结算明细弹窗 -->
      <van-action-sheet v-model:show="showSettlement" title="结算明细" close-icon-position="top-left">
        <div class="settlement-body">
          <div class="settlement-items">
            <div v-for="item in selectedList" :key="item.skuId" class="settlement-item">
              <van-image
                :src="item.skuImage || item.spuImage"
                width="48"
                height="48"
                fit="cover"
                class="settlement-img"
              />
              <div class="settlement-item-info">
                <div class="settlement-item-name van-multi-ellipsis--l2">{{ item.spuName }}</div>
                <div class="settlement-item-spec" v-if="item.specInfo">{{ formatSpecs(item.specInfo) }}</div>
              </div>
              <div class="settlement-item-amount">
                <div class="settlement-item-price">&yen;{{ formatPrice(item.price) }}</div>
                <div class="settlement-item-qty">&times; {{ item.quantity }}</div>
              </div>
            </div>
          </div>
          <div class="settlement-summary">
            <div class="summary-row">
              <span>商品合计</span>
              <span class="summary-value">&yen;{{ formatPrice(selectedSubtotal) }}</span>
            </div>
            <div class="summary-row">
              <span>运费</span>
              <span class="summary-free">免运费</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row summary-total">
              <span>应付总额</span>
              <span class="summary-total-value">&yen;{{ formatPrice(selectedSubtotal) }}</span>
            </div>
          </div>
        </div>
      </van-action-sheet>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getCartList, updateCartQuantity, updateSelected, updateSelectAll, removeCartItem, batchRemoveCart, clearCart } from '../../api/cart.js'
import { getTree } from '../../api/category.js'
import { useUserStore } from '../../stores/user.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()
const userStore = useUserStore()

// ── 状态 ──
const goodsList = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const showCategoryPopup = ref(false)
const categories = ref([])
const activeCategoryId = ref(null)
const showSettlement = ref(false)

// ── 数量防抖定时器 ──
const quantityTimers = {}

// ── 搜索过滤（本地按名称 + 分类筛选） ──
const displayList = computed(() => {
  let list = goodsList.value
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(item => item.spuName?.toLowerCase().includes(kw))
  }
  if (activeCategoryId.value) {
    const cat = categories.value.find(c => c.id === activeCategoryId.value)
    if (cat) {
      const catKw = cat.name.toLowerCase()
      list = list.filter(item => item.spuName?.toLowerCase().includes(catKw))
    }
  }
  return list
})

// ── 全选 ──
const allSelected = computed({
  get: () => goodsList.value.length > 0 && goodsList.value.every(item => item.checked),
  set: (val) => {
    const userId = userStore.memberInfo?.userId
    if (!userId) return
    goodsList.value.forEach(item => { item.checked = val })
    updateSelectAll(userId, val ? 1 : 0).catch(() => {})
  },
})

// ── 选中列表 ──
const selectedList = computed(() => goodsList.value.filter(item => item.checked))

// ── 选中商品总金额（分） ──
const totalPrice = computed(() => {
  return selectedList.value.reduce((sum, item) => {
    return sum + Math.round(Number(item.price) * item.quantity * 100)
  }, 0)
})

// ── 选中商品合计（元） ──
const selectedSubtotal = computed(() => {
  return selectedList.value.reduce((sum, item) => {
    return sum + Number(item.price) * item.quantity
  }, 0)
})

// ── 工具 ──
function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

function formatSpecs(specInfo) {
  if (!specInfo) return ''
  if (typeof specInfo === 'string') return specInfo
  return Object.values(specInfo).join(' / ')
}

// ── 搜索关键词高亮 ──
function highlightText(text, keyword) {
  if (!text || !keyword) return text || ''
  const kw = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!kw) return text
  return text.replace(new RegExp(`(${kw})`, 'gi'), '<em class="hl">$1</em>')
}

// ── 分类筛选 ──
async function fetchCategories() {
  try {
    const tree = await getTree()
    categories.value = (tree || []).map(c => ({ id: c.id, name: c.name }))
  } catch {
    // 静默
  }
}
function onCategorySelect(cat) {
  activeCategoryId.value = activeCategoryId.value === cat.id ? null : cat.id
  showCategoryPopup.value = false
}
function clearFilters() {
  searchKeyword.value = ''
  activeCategoryId.value = null
}

// ── 加载购物车列表 ──
async function fetchCart() {
  loading.value = true
  try {
    const userId = userStore.memberInfo?.userId
    if (!userId) {
      loading.value = false
      goodsList.value = []
      return
    }
    const list = await getCartList(userId)
    goodsList.value = (list || []).map(item => ({
      ...item,
      checked: item.selected === 1,
    }))
  } catch (e) {
    console.error('[Cart] 加载失败:', e)
    goodsList.value = []
  } finally {
    loading.value = false
  }
}

// ── 数量修改（防抖） ──
function onQuantityChange(item) {
  const id = item.id
  if (quantityTimers[id]) clearTimeout(quantityTimers[id])
  quantityTimers[id] = setTimeout(async () => {
    try {
      await updateCartQuantity(id, item.quantity)
    } catch (e) {
      console.error('[Cart] 数量更新失败:', e)
      fetchCart()
    }
  }, 500)
}

// ── 单个选中同步 ──
function onItemCheckChange(item) {
  const userId = userStore.memberInfo?.userId
  if (!userId) return
  updateSelected(item.id, item.checked ? 1 : 0).catch(() => {})
}

// ── 删除单个 ──
async function handleRemove(item) {
  try {
    await showConfirmDialog({
      title: '提示',
      message: `确认删除「${item.spuName}」吗？`,
      confirmButtonColor: '#e8573a',
    })
    await removeCartItem(item.id)
    showToast('已删除')
    fetchCart()
  } catch (e) {
    if (e?.toString().includes('cancel')) return
    console.error('[Cart] 删除失败:', e)
    showToast('删除失败，请重试')
  }
}

// ── 清空 ──
async function handleClear() {
  const userId = userStore.memberInfo?.userId
  if (!userId) return
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确认清空购物车吗？',
      confirmButtonColor: '#e8573a',
    })
    await clearCart(userId)
    showToast('已清空')
    fetchCart()
  } catch {
    // 取消
  }
}

// ── 批量删除 ──
async function handleBatchRemove() {
  const ids = selectedList.value.map(item => item.id)
  if (ids.length === 0) return
  try {
    await showConfirmDialog({
      title: '提示',
      message: `确认删除选中的 ${ids.length} 件商品吗？`,
      confirmButtonColor: '#e8573a',
    })
    await batchRemoveCart(ids)
    showToast('已删除')
    fetchCart()
  } catch (e) {
    if (e?.toString().includes('cancel')) return
    console.error('[Cart] 批量删除失败:', e)
  }
}

// ── 去结算 ──
function handleCheckout() {
  const ids = selectedList.value.map(item => item.skuId).join(',')
  router.push({
    name: 'Order',
    query: { skuIds: ids },
  })
}

// ── 导航 ──
function goHome() { router.replace('/') }
function goGoods(spuId) { if (spuId) router.push(`/goods/${spuId}`) }

// ── 生命周期 ──
onMounted(() => {
  fetchCart()
  fetchCategories()
})
onActivated(() => fetchCart())
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   购物车页 — 方案A 极简列表式（迭代2：精修）
   ══════════════════════════════════════════════════════════════ */

.page-cart {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 120px;
}

/* ── 状态容器 ── */
.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  animation: fadeIn 0.35s ease-out;
}
.cart-empty {
  width: 100%;
}
.cart-empty :deep(.van-empty__image) {
  margin-bottom: 8px;
}
.cart-empty :deep(.van-empty__description) {
  font-size: 16px;
  color: #5a5a6e;
  margin-bottom: 4px;
}
.cart-empty :deep(.van-empty__bottom) {
  text-align: center;
}
.empty-hint {
  display: block;
  font-size: 15px;
  text-align: center;
  color: #9a9aae;
  margin: 8px 0 24px;
}
.empty-btn {
  width: 200px;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
}

/* ── 导航栏（粘性） ── */
.nav-bar-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}

/* ── 购物车工具栏（粘性） ── */
.cart-toolbar {
  position: sticky;
  top: 46px;
  z-index: 99;
  background: #fff;
  padding: 8px 16px 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.toolbar-row + .toolbar-row {
  margin-top: 8px;
}
.toolbar-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #f5f3f0;
  border-radius: 20px;
  border: 1.5px solid transparent;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.toolbar-search:focus-within {
  border-color: #e8573a;
  box-shadow: 0 2px 10px rgba(232,87,58,0.10);
}
.toolbar-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #1a1a2e;
}
.toolbar-search-input::placeholder {
  color: #c8c4c0;
}
.search-clear {
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.2s;
}
.search-clear:active {
  transform: scale(0.85);
}
.category-btn {
  flex-shrink: 0;
  font-size: 12px;
  color: #5a5a6e;
  border-color: #e8e4e0;
}
.category-btn:active {
  border-color: #e8573a;
  color: #e8573a;
}
.select-row {
  justify-content: space-between;
}
.select-row :deep(.van-checkbox) {
  font-size: 13px;
  color: #5a5a6e;
}
.batch-del-btn {
  font-size: 12px;
  color: #e8573a;
  cursor: pointer;
  padding: 5px 12px;
  border-radius: 8px;
  background: rgba(232,87,58,0.08);
  transition: background 0.2s, transform 0.15s;
}
.batch-del-btn:active {
  background: rgba(232,87,58,0.18);
  transform: scale(0.96);
}

/* ── 分类下拉 ── */
.category-dropdown {
  background: #fff;
  border-top: 1px solid #f0ece8;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  position: sticky;
  top: 130px;
  z-index: 98;
  overflow: hidden;
}
.category-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
}
.category-tag {
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  background: #f5f3f0;
  color: #5a5a6e;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid transparent;
  user-select: none;
}
.category-tag:active {
  transform: scale(0.95);
}
.category-tag.active {
  background: #e8573a;
  color: #fff;
  box-shadow: 0 2px 8px rgba(232,87,58,0.3);
}
.dropdown-enter-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}
.dropdown-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── 购物车列表 ── */
.cart-list {
  padding: 4px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── 商品项 ── */
.cart-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: #fff;
  border-radius: 12px;
  border: 1.5px solid transparent;
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s;
  animation: slideUp 0.3s ease-out both;
}
.cart-item:nth-child(1) { animation-delay: 0.02s; }
.cart-item:nth-child(2) { animation-delay: 0.05s; }
.cart-item:nth-child(3) { animation-delay: 0.08s; }
.cart-item:nth-child(4) { animation-delay: 0.11s; }
.cart-item:nth-child(5) { animation-delay: 0.14s; }
.cart-item:nth-child(6) { animation-delay: 0.17s; }
.cart-item:nth-child(7) { animation-delay: 0.20s; }

.cart-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.cart-item:has(.van-checkbox--checked) {
  border-color: rgba(232,87,58,0.20);
  background: rgba(232,87,58,0.02);
}

.item-img {
  flex-shrink: 0;
  border-radius: 8px;
  background: #f0ece8;
  cursor: pointer;
  transition: transform 0.2s;
}
.item-img:active {
  transform: scale(0.96);
}

/* ── 右侧信息 ── */
.item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.item-top {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.item-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.35;
  cursor: pointer;
  transition: color 0.2s;
}
.item-name:active {
  color: #e8573a;
}
.item-del {
  font-size: 12px;
  color: #c8c4c0;
  cursor: pointer;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  transition: color 0.25s, background 0.25s, transform 0.15s;
}
.item-del:hover {
  color: #e8573a;
  background: rgba(232,87,58,0.06);
}
.item-del:active {
  transform: scale(0.92);
  background: rgba(232,87,58,0.12);
}
.item-specs {
  font-size: 12px;
  color: #bababa;
}
.item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.item-price {
  font-size: 17px;
  font-weight: 700;
  color: #d63031;
  font-family: 'DM Sans', 'Inter', sans-serif;
  letter-spacing: -0.3px;
}

/* ── 数量选择器 ── */
.item-bottom :deep(.van-stepper) {
  transition: transform 0.15s;
}
.item-bottom :deep(.van-stepper:active) {
  transform: scale(0.97);
}
.item-bottom :deep(.van-stepper__minus),
.item-bottom :deep(.van-stepper__plus) {
  border-color: #e8e4e0;
  color: #1a1a2e;
  background: #faf8f6;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.item-bottom :deep(.van-stepper__minus:active),
.item-bottom :deep(.van-stepper__plus:active) {
  background: #f0ece8;
  border-color: #e8573a;
  color: #e8573a;
}
.item-bottom :deep(.van-stepper__input) {
  font-size: 13px;
  color: #1a1a2e;
  background: #faf8f6;
}

/* ── 搜索高亮 ── */
:deep(.hl) {
  font-style: normal;
  color: #e8573a;
  background: rgba(232,87,58,0.08);
  border-radius: 2px;
  padding: 0 2px;
}

/* ── TransitionGroup 列表动画 ── */
.list-enter-active {
  transition: all 0.35s ease-out;
}
.list-leave-active {
  transition: all 0.25s ease-in;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-move {
  transition: transform 0.3s ease-out;
}

/* ── 搜索无结果 ── */
.search-no-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: #bababa;
  font-size: 13px;
  animation: fadeIn 0.3s ease-out;
}
.search-no-hint {
  font-size: 12px;
  color: #e8573a;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 6px;
  transition: background 0.2s;
}
.search-no-hint:active {
  background: rgba(232,87,58,0.08);
}

/* ── 底部提交栏 ── */
.clear-btn {
  font-size: 13px;
  color: #e8573a;
  cursor: pointer;
}
:deep(.van-submit-bar) {
  box-shadow: 0 -1px 8px rgba(0,0,0,0.05);
}
:deep(.van-submit-bar__tip) {
  background: #fff;
}
:deep(.van-submit-bar__bar) {
  background: #fff;
}
:deep(.van-submit-bar__safe-area) {
  background: #fff;
}
:deep(.van-submit-bar__price) {
  color: #d63031;
}
:deep(.van-submit-bar__price-integer) {
  font-size: 22px;
}
.submit-tip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.selected-tip {
  font-size: 12px;
  color: #9a9aae;
}
.detail-link {
  font-size: 12px;
  color: #e8573a;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
}
.detail-link:active {
  opacity: 0.7;
}

/* ── 结算明细弹窗 ── */
.settlement-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 16px 20px;
}
.settlement-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0 16px;
}
.settlement-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.settlement-img {
  flex-shrink: 0;
  border-radius: 6px;
  background: #f0ece8;
}
.settlement-item-info {
  flex: 1;
  min-width: 0;
}
.settlement-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.35;
}
.settlement-item-spec {
  font-size: 11px;
  color: #bababa;
  margin-top: 3px;
}
.settlement-item-amount {
  flex-shrink: 0;
  text-align: right;
}
.settlement-item-price {
  font-size: 14px;
  font-weight: 700;
  color: #d63031;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
.settlement-item-qty {
  font-size: 11px;
  color: #9a9aae;
  margin-top: 2px;
}
.settlement-summary {
  border-top: 1px solid #f0ece8;
  padding-top: 14px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
  color: #5a5a6e;
}
.summary-value {
  font-weight: 500;
  color: #1a1a2e;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
.summary-free {
  color: #2ecc71;
  font-size: 12px;
}
.summary-divider {
  height: 1px;
  background: #f0ece8;
  margin: 6px 0;
}
.summary-total {
  padding-top: 8px;
}
.summary-total-value {
  font-size: 18px;
  font-weight: 700;
  color: #d63031;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
/* ── keyframes ── */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══════════════════════════════════════════════════════════════
   响应式
   ══════════════════════════════════════════════════════════════ */
@media (min-width: 640px) {
  .cart-toolbar {
    padding: 8px 24px 6px;
  }
  .category-inner {
    padding: 12px 24px;
  }
  .cart-list {
    padding: 4px 24px 16px;
  }
}
</style>
