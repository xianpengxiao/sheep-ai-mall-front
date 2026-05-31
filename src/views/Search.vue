<template>
  <div class="page-search">
    <van-nav-bar title="搜索" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-search v-model="keyword" placeholder="请输入商品名称" shape="round" autofocus />
    <van-empty description="搜索功能开发中" />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const keyword = ref('')
</script>

<style scoped>
.page-search {
  min-height: 100vh;
  background: linear-gradient(180deg, #faf8f6 0%, #f5f3f0 100%);
}
</style>
