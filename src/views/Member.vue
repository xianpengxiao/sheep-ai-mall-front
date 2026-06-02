<template>
  <div class="page-placeholder">
    <NavBar title="会员中心" :show-back="false" />
    <van-empty description="会员功能开发中" />
  </div>
</template>

<script setup>
import NavBar from '../components/NavBar.vue'
</script>

<style scoped>
.page-placeholder {
  min-height: 100vh;
  background: linear-gradient(180deg, #faf8f6 0%, #f5f3f0 100%);
}
</style>
