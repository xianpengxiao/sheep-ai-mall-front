<template>
  <!-- 客服悬浮机器人入口：仅商城主 tab 页显示，可拖动，位置不持久化 -->
  <div
    v-if="visible"
    class="chat-float-btn"
    :style="{ transform: `translate(${pos.x}px, ${pos.y}px)` }"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  >
    <van-icon name="service-o" size="26" color="#fff" />
    <span class="chat-float-tip">智能客服</span>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 仅商城主 tab 页显示（客服页本身、店铺页、商家端/管理端等不显示）
const WHITE_LIST = ['/', '/cart', '/profile']
const visible = computed(() => WHITE_LIST.includes(route.path))

// 拖动位置（仅内存保存，刷新/重进复位到默认右下角）
const pos = reactive({ x: 0, y: 0 })
let dragging = false
let moved = false
let startX = 0
let startY = 0
let baseX = 0
let baseY = 0

function onDown(e) {
  dragging = true
  moved = false
  startX = e.clientX
  startY = e.clientY
  baseX = pos.x
  baseY = pos.y
  e.currentTarget.setPointerCapture(e.pointerId)
}

function onMove(e) {
  if (!dragging) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!moved && Math.abs(dx) < 6 && Math.abs(dy) < 6) return
  moved = true
  pos.x = baseX + dx
  pos.y = baseY + dy
}

function onUp() {
  if (!dragging) return
  dragging = false
  // 位移阈值区分点击与拖动：未拖动则进入客服
  if (!moved) router.push('/chat')
}
</script>

<style scoped>
.chat-float-btn {
  position: fixed;
  right: 16px;
  bottom: 96px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  box-shadow: 0 4px 14px rgba(232, 87, 58, 0.4);
  cursor: pointer;
  user-select: none;
  touch-action: none;
  transition: box-shadow 0.15s;
}
.chat-float-btn:active { box-shadow: 0 2px 8px rgba(232, 87, 58, 0.5); }
.chat-float-tip {
  font-size: 9px;
  color: #fff;
  transform: scale(0.9);
  line-height: 1;
}
</style>
