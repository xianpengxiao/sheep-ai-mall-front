<template>
  <van-nav-bar
    :title="title"
    :left-arrow="showBack"
    @click-left="handleBack"
  >
    <template #right>
      <van-icon name="home-o" size="20" class="nav-home-btn" @click="goHome" style="cursor:pointer" />
      <slot name="right" />
    </template>
    <template v-if="$slots.left" #left>
      <slot name="left" />
    </template>
  </van-nav-bar>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: true },
})

const emit = defineEmits(['back'])
const router = useRouter()

function handleBack() {
  emit('back')
  if (window.history.length > 1) router.back()
  else router.replace('/')
}
function goHome() {
  router.push('/')
}
</script>
