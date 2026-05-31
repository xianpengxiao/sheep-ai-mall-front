<template>
  <div class="page-goods-detail">
    <van-nav-bar title="商品详情" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-empty description="商品详情页开发中" />
  </div>
</template>

<style scoped>
.page-goods-detail {
  min-height: 100vh;
  background: linear-gradient(180deg, #faf8f6 0%, #f5f3f0 100%);
}
</style>
