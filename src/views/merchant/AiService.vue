<template>
  <div class="page-ai-service">
    <NavBar title="智能客服服务" />

    <!-- ═══ 上半区：智能客服服务卡片 ═══ -->
    <div class="ai-card">
      <div class="ai-card-header">
        <div class="ai-card-icon">
          <van-icon name="service-o" size="24" color="#fff" />
        </div>
        <div class="ai-card-title-wrap">
          <div class="ai-card-title">店铺智能客服</div>
          <div class="ai-card-sub">买家咨询默认人工接待，可手动开启 AI 自动回复</div>
        </div>
        <span class="ai-status-tag" :class="statusInfo.tagClass">{{ statusInfo.text }}</span>
      </div>

      <van-loading v-if="statusLoading" class="loading-center" size="24" />
      <template v-else>
        <div v-if="aiStatus?.subscribed" class="ai-card-body">
          <div class="ai-info-row">
            <span class="ai-info-label">开通时间</span>
            <span class="ai-info-val">{{ aiStatus.startTime || '--' }}</span>
          </div>
          <div class="ai-info-row">
            <span class="ai-info-label">有效期至</span>
            <span class="ai-info-val highlight">{{ aiStatus.expireTime || '--' }}</span>
          </div>
          <div class="ai-info-row">
            <span class="ai-info-label">AI自动接待</span>
            <van-switch
              :model-value="aiStatus.aiEnabled === 1"
              :disabled="aiStatus.globalAiEnabled !== 1"
              :loading="togglingAi"
              size="22"
              @change="handleToggleAi"
            />
          </div>
          <div class="ai-switch-hint">
            {{ aiStatus.globalAiEnabled !== 1
                ? '平台已关闭 AI 自动接待，开关暂不可用（设置保留，平台开启后自动恢复）'
                : (aiStatus.aiEnabled === 1 ? '买家咨询将由 AI 自动回复' : '当前为人工接待，买家咨询由店铺客服手动回复') }}
          </div>
          <van-button round block class="ai-action-btn" :loading="subscribing" @click="handleSubscribe">
            {{ aiStatus.isTrial === 1 ? '开通正式版 ¥299/年' : '续费一年 ¥299' }}
          </van-button>
        </div>
        <div v-else class="ai-card-body">
          <div class="ai-expire-hint" v-if="aiStatus?.isTrial === 1 || aiStatus?.status === 2">
            {{ aiStatus?.isTrial === 1 ? '试用期已结束，开通正式版立即恢复智能客服接待' : '服务已过期，续费后立即恢复智能客服接待' }}
          </div>
          <div class="ai-info-row">
            <span class="ai-info-label">服务价格</span>
            <span class="ai-info-val">¥299 / 年</span>
          </div>
          <div class="ai-info-row">
            <span class="ai-info-label">服务内容</span>
            <span class="ai-info-val">默认人工接待，可开启 AI 自动回复 + 店铺专属知识库</span>
          </div>
          <van-button
            v-if="aiStatus?.canTrial"
            round block class="ai-action-btn trial" :loading="claimingTrial" @click="handleClaimTrial"
          >
            免费体验 30 天（20w Token/月）
          </van-button>
          <van-button round block class="ai-action-btn" :loading="subscribing" @click="handleSubscribe">
            立即开通 ¥299/年
          </van-button>
        </div>
      </template>
    </div>

    <!-- ═══ 下半区：本店知识库管理（AI 功能，仅开通/试用有效期内可见） ═══ -->
    <div v-if="aiStatus?.subscribed" class="knowledge-section">
      <div class="section-title">店铺知识库</div>
      <div class="section-desc">维护常见问题等知识文档，AI 客服将基于这些内容回复买家</div>
      <KnowledgeManage :admin-mode="false" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import NavBar from '../../components/NavBar.vue'
import KnowledgeManage from '../../components/KnowledgeManage.vue'
import { getMerchantAiStatus, subscribeMerchantAi, setMerchantAiEnabled, claimMerchantAiTrial } from '../../api/merchant.js'

// ── 服务状态 ──
const aiStatus = ref(null)
const statusLoading = ref(false)
const subscribing = ref(false)
const togglingAi = ref(false)
const claimingTrial = ref(false)

// ── 领取免费试用（30 天 / 20w Token，每商家限一次） ──
async function handleClaimTrial() {
  try {
    await showConfirmDialog({
      title: '领取免费试用',
      message: '领取后 30 天内可免费使用智能客服（月度 20w Token 额度），到期自动转回人工接待。确认领取？',
      confirmButtonText: '立即领取',
      confirmButtonColor: '#e8573a',
    })
  } catch { return }
  claimingTrial.value = true
  try {
    aiStatus.value = await claimMerchantAiTrial()
    showToast('试用领取成功，有效期 30 天')
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { claimingTrial.value = false }
}

const statusInfo = computed(() => {
  if (aiStatus.value?.subscribed && aiStatus.value?.isTrial === 1) return { text: '试用中', tagClass: 'tag-trial' }
  if (aiStatus.value?.subscribed) return { text: '服务有效', tagClass: 'tag-on' }
  if (aiStatus.value?.status === 2 || aiStatus.value?.isTrial === 1) return { text: '已过期', tagClass: 'tag-expired' }
  return { text: '未开通', tagClass: 'tag-off' }
})

async function fetchStatus() {
  statusLoading.value = true
  try { aiStatus.value = await getMerchantAiStatus() }
  catch { aiStatus.value = null }
  finally { statusLoading.value = false }
}

// ── 开通/续费（假支付） ──
async function handleSubscribe() {
  const renewing = !!aiStatus.value?.subscribed
  try {
    await showConfirmDialog({
      title: renewing ? '续费确认' : '开通确认',
      message: renewing
        ? '确认续费智能客服服务一年？费用 ¥299（模拟支付，立即生效）'
        : '确认开通智能客服服务一年？费用 ¥299（模拟支付，立即生效）',
      confirmButtonText: '确认支付 ¥299',
      confirmButtonColor: '#e8573a',
    })
  } catch { return /* 取消支付 */ }

  subscribing.value = true
  try {
    aiStatus.value = await subscribeMerchantAi()
    showToast(renewing ? '续费成功' : '开通成功')
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { subscribing.value = false }
}

// ── AI自动接待开关（默认人工策略） ──
async function handleToggleAi(val) {
  const enable = val ? 1 : 0
  try {
    await showConfirmDialog({
      title: enable ? '开启AI接待' : '关闭AI接待',
      message: enable
        ? '开启后买家咨询将由 AI 自动回复，关闭后恢复人工接待。确认开启？'
        : '关闭后买家咨询将由店铺客服手动回复，AI 不再自动应答。确认关闭？',
      confirmButtonColor: '#e8573a',
    })
  } catch { return /* 取消 */ }
  togglingAi.value = true
  try {
    aiStatus.value = await setMerchantAiEnabled(enable)
    showToast(enable ? '已开启AI自动接待' : '已切换为人工接待')
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { togglingAi.value = false }
}

onMounted(fetchStatus)
</script>

<style scoped>
.page-ai-service {
  min-height: 100vh;
  background: #f5f3f0;
  padding-bottom: 24px;
}

/* ── 服务卡片 ── */
.ai-card {
  margin: 12px 14px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}
.ai-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
}
.ai-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-card-title-wrap { flex: 1; min-width: 0; }
.ai-card-title { font-size: 16px; font-weight: 700; color: #fff; }
.ai-card-sub { font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 2px; }
.ai-status-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 10px;
  flex-shrink: 0;
}
.ai-status-tag.tag-on { background: rgba(105,240,174,0.25); color: #69f0ae; }
.ai-status-tag.tag-trial { background: rgba(255,255,255,0.25); color: #fff; border: 1px solid rgba(255,255,255,0.5); }
.ai-status-tag.tag-expired { background: rgba(255,255,255,0.2); color: #ffd54f; }
.ai-status-tag.tag-off { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.85); }

.ai-card-body { padding: 16px; }
.ai-info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f5f3f0;
  font-size: 13px;
}
.ai-info-row:last-of-type { border-bottom: none; }
.ai-info-label { color: #9a9aae; }
.ai-info-val { color: #1a1a2e; font-weight: 500; }
.ai-info-val.highlight { color: #e8573a; }
.ai-switch-hint {
  font-size: 12px;
  color: #9a9aae;
  margin: -6px 0 10px 0;
  padding-left: 2px;
}
.ai-expire-hint {
  font-size: 12px;
  color: #c62828;
  background: #fdeeee;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
}
.ai-action-btn {
  margin-top: 14px;
  height: 42px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
}

.loading-center { padding: 30px 0; }

/* ── 知识库区块 ── */
.knowledge-section {
  margin: 12px 14px;
}
.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 4px;
}
.section-desc {
  font-size: 12px;
  color: #9a9aae;
  margin-bottom: 12px;
}
</style>
