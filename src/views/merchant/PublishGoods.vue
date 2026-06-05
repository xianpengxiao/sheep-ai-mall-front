<template>
  <div class="page-publish">
    <NavBar title="发布商品" />
    <GoodsForm ref="goodsFormRef" :init-form="{}" submit-text="提交商品" @submit="handleSubmit" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import NavBar from '../../components/NavBar.vue'
import GoodsForm from '../../components/goods/GoodsForm.vue'
import { publishGoods } from '../../api/merchant.js'

const router = useRouter()
const goodsFormRef = ref(null)

async function handleSubmit(payload) {
  await publishGoods(payload)
  showToast('发布成功')
  router.back()
}
</script>

<style scoped>
.page-publish {
  min-height: 100vh;
  background: #f5f3f0;
}
</style>
