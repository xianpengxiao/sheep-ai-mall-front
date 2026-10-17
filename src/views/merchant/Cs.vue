<template>
  <div class="page-merchant-cs">
    <NavBar title="客服坐席" />

    <div class="cs-page-body">
      <!-- 坐席控制台：会话列表 + 对话 + 额度卡片 -->
      <CsConsole api-prefix="/merchant/cs" show-quota :quota="quota" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import CsConsole from '../../components/CsConsole.vue'
import { getCsQuota } from '../../api/merchantCs.js'

// ── AI 服务额度（未开通时后端返回额度字段 null，组件展示"未开通"） ──
const quota = ref(null)

async function fetchQuota() {
  try { quota.value = await getCsQuota() }
  catch { quota.value = null }
}

onMounted(fetchQuota)
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
