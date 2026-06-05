<template>
  <div class="page-merchant-goods">
    <NavBar title="出售中的宝贝" />

    <div class="toolbar">
      <van-button round size="small" class="toolbar-btn" @click="showAddDialog = true">
        <van-icon name="plus" size="14" /> 上架商品
      </van-button>
    </div>

    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="fetchGoods">
      <div class="goods-list">
        <div v-for="item in goodsList" :key="item.id" class="goods-item">
          <van-image width="72" height="72" fit="cover" :src="item.mainImage || placeholderImg" class="goods-img" />
          <div class="goods-info">
            <div class="goods-name">{{ item.name }}</div>
            <div class="goods-price">¥{{ item.minPrice || '0.00' }}</div>
          </div>
        </div>
      </div>
      <van-empty v-if="!loading && goodsList.length === 0" description="暂无出售中的商品" />
    </van-list>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'
import NavBar from '../../components/NavBar.vue'
import { getSpuPage } from '../../api/goods.js'

const loading = ref(false)
const finished = ref(false)
const goodsList = ref([])
const pageNum = ref(1)
const placeholderImg = 'https://img.yzcdn.cn/vant/ipad.jpeg'

async function fetchGoods() {
  try {
    const res = await getSpuPage({ pageNum: pageNum.value, pageSize: 10 })
    const records = res?.records || []
    goodsList.value.push(...records)
    pageNum.value++
    if (records.length < 10) finished.value = true
  } catch {
    finished.value = true
  } finally {
    loading.value = false
  }
}

const showAddDialog = ref(false)
</script>

<style scoped>
.page-merchant-goods {
  min-height: 100vh;
  background: #fff;
}
.toolbar {
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
}
.toolbar-btn {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 600;
  padding: 0 16px;
}
.goods-list {
  padding: 0 16px;
}
.goods-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0ece8;
}
.goods-img {
  border-radius: 8px;
  flex-shrink: 0;
}
.goods-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}
.goods-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.goods-price {
  font-size: 16px;
  font-weight: 700;
  color: #e8573a;
}
</style>
