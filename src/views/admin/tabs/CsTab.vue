<template>
  <div class="sub-page">
    <!-- ═══ AI 接待开关卡片（总闸 + 平台AI） ═══ -->
    <div class="cs-switch-cards">
      <div class="cs-switch-card">
        <div class="cs-switch-info">
          <div class="cs-switch-title">AI自动接待总开关</div>
          <div class="cs-switch-desc">
            {{ config.aiEnabled === 1 ? '开启中：按商家/平台各自开关接待' : '已关闭：全部会话由人工接待，商家与平台开关被覆盖' }}
          </div>
        </div>
        <van-switch
          :model-value="config.aiEnabled === 1"
          :loading="toggling === 'ai'"
          size="22"
          @change="toggleAi"
        />
      </div>
      <div class="cs-switch-card" :class="{ 'is-disabled': config.aiEnabled !== 1 }">
        <div class="cs-switch-info">
          <div class="cs-switch-title">平台会话AI接待</div>
          <div class="cs-switch-desc">
            {{ config.aiEnabled !== 1
              ? '总开关已关闭，本开关暂不可用'
              : (config.platformAiEnabled === 1
                  ? '开启中：官方客服新会话由 AI 接待，单会话仍可手动转人工'
                  : '官方客服新会话默认人工，坐席可针对单个会话手动转 AI') }}
          </div>
        </div>
        <van-switch
          :model-value="config.platformAiEnabled === 1"
          :disabled="config.aiEnabled !== 1"
          :loading="toggling === 'platform'"
          size="22"
          @change="togglePlatformAi"
        />
      </div>
    </div>

    <!-- 平台客服坐席控制台 -->
    <CsConsole api-prefix="/admin/cs" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import CsConsole from '../../../components/CsConsole.vue'
import { getAdminCsConfig, setAdminAiEnabled, setAdminPlatformAiEnabled } from '../../../api/adminCs.js'

// ── AI 接待开关（总闸 + 平台AI） ──
const config = ref({})
const toggling = ref('')

async function loadConfig() {
  try { config.value = await getAdminCsConfig() || {} }
  catch { config.value = {} }
}

async function toggleAi(val) {
  const enable = val ? 1 : 0
  try {
    await showConfirmDialog({
      title: enable ? '开启AI自动接待' : '关闭AI自动接待',
      message: enable
        ? '开启后按商家/平台各自开关执行 AI 接待。确认开启？'
        : '关闭后所有会话（含已开启AI的商家）立即转为人工接待，商家与平台开关保留但暂不生效。确认关闭？',
      confirmButtonColor: '#e8573a',
    })
  } catch { return /* 取消 */ }
  toggling.value = 'ai'
  try {
    await setAdminAiEnabled(enable)
    config.value.aiEnabled = enable
    showToast(enable ? '已开启AI自动接待' : '已关闭，全部会话转人工接待')
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { toggling.value = '' }
}

async function togglePlatformAi(val) {
  const enable = val ? 1 : 0
  toggling.value = 'platform'
  try {
    await setAdminPlatformAiEnabled(enable)
    config.value.platformAiEnabled = enable
    showToast(enable ? '官方客服新会话将由 AI 接待' : '官方客服新会话恢复默认人工')
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { toggling.value = '' }
}

onMounted(loadConfig)
</script>

<style scoped>
.sub-page { font-size: 13px; }

/* ── 开关卡片 ── */
.cs-switch-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.cs-switch-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cs-switch-card.is-disabled {
  opacity: 0.6;
  background: #faf8f6;
}
.cs-switch-title { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 4px; }
.cs-switch-desc { font-size: 12px; color: #9a9aae; line-height: 1.5; }
</style>
