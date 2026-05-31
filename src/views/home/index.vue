<template>
  <div class="page-home">
    <!-- 1. 顶部导航 -->
    <div class="top-bar">
      <div class="brand">SheepAI Mall</div>
      <nav class="pc-nav">
        <span class="pc-nav-item active">首页</span>
        <span class="pc-nav-item" @click="$router.push('/cart')">购物车</span>
        <span class="pc-nav-item" @click="$router.push('/profile')">个人中心</span>
      </nav>
      <div class="top-actions">
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
    <div class="search-wrap">
      <div class="search-bar" @click="goSearch">
        <van-icon name="search" size="17" color="#9a9aae" />
        <span>搜索商品、品牌...</span>
      </div>
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
              :price="item.price"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getTree } from '../../api/category.js'
import { getSpuPage } from '../../api/goods.js'
import GoodsCard from '../../components/GoodsCard.vue'

const router = useRouter()

function goSearch() {
  router.push('/search')
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
    const records = page.records || []
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
  background: linear-gradient(180deg, #faf8f6 0%, #f5f3f0 100%);
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
