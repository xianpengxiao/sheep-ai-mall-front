<template>
  <div class="goods-card" @click="goDetail">
    <van-image
      :src="firstImage"
      width="100%"
      height="auto"
      fit="cover"
      radius="0"
      class="goods-img"
    />
    <div class="goods-info">
      <h3 class="goods-title" v-if="titleHtml" v-html="titleHtml"></h3>
      <h3 class="goods-title" v-else>{{ title }}</h3>
      <div class="goods-footer">
        <span class="goods-price">&yen;{{ price }}</span>
        <span class="goods-sales" v-if="sales">月销 {{ sales }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  id: { type: [Number, String], required: true },
  title: { type: String, default: '' },
  titleHtml: { type: String, default: '' },
  price: { type: [Number, String], default: 0 },
  sales: { type: [Number, String], default: 0 },
  image: { type: String, default: 'https://img.yzcdn.cn/vant/cat.jpeg' },
})

const router = useRouter()

const firstImage = computed(() => {
  const img = props.image
  if (!img) return 'https://img.yzcdn.cn/vant/cat.jpeg'
  if (Array.isArray(img)) return img[0]
  if (img.includes(',')) return img.split(',')[0]
  return img
})

function goDetail() {
  router.push(`/goods/${props.id}`)
}
</script>

<style scoped>
.goods-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}
.goods-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10);
}
.goods-card:active {
  transform: scale(0.97);
}

.goods-img {
  width: 100%;
  aspect-ratio: 1;
  display: block;
  background: #f0ece8;
}

.goods-info {
  padding: 10px 12px 12px;
}

.goods-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.goods-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.goods-price {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #d63031;
}

.goods-sales {
  font-size: 11px;
  color: #9a9aae;
  background: #f5f3f0;
  padding: 2px 8px;
  border-radius: 10px;
}
</style>
