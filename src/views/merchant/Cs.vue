<template>
  <div class="page-merchant-cs">
    <NavBar title="客服坐席" />

    <div class="cs-page-body">
      <!-- 坐席控制台：会话列表 + 对话 + 额度卡片；未开通/过期时隐藏「转回AI」 -->
      <CsConsole api-prefix="/merchant/cs" show-quota :quota="quota" :ai-available="aiAvailable" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import CsConsole from '../../components/CsConsole.vue'
import { getCsQuota } from '../../api/merchantCs.js'
import { getMerchantAiStatus } from '../../api/merchant.js'

// ── AI 服务额度（未开通时后端返回额度字段 null，组件展示"未开通"） ──
const quota = ref(null)
// AI 功能可用（已开通或试用有效期内）；默认 true，拉取失败不隐藏按钮
const aiAvailable = ref(true)

async function fetchQuota() {
  try { quota.value = await getCsQuota() }
  catch { quota.value = null }
}

async function fetchAiStatus() {
  try {
    const st = await getMerchantAiStatus()
    aiAvailable.value = !!st?.subscribed
  } catch { /* 失败保持默认 true */ }
}

onMounted(() => {
  fetchQuota()
  fetchAiStatus()
})
</script>

<style scoped>
.page-merchant-cs {
  min-height: 100vh;
  background: #f5f3f0;
  padding-bottom: 24px;
}
.cs-page-body {
  margin: 12px 14px;
}
</style>
