<template>
  <div class="cs-console">
    <!-- ═══ 额度卡片（仅商家端，数据由父页传入，组件只管展示） ═══ -->
    <div v-if="showQuota" class="quota-card">
      <template v-if="quota && quota.monthlyTokenQuota != null">
        <div class="quota-head">
          <span class="quota-name">{{ quota.planName || '当前套餐' }}</span>
          <span class="quota-remain">本月剩余 {{ formatNum(quota.monthlyTokenRemain) }} Token</span>
        </div>
        <van-progress
          :percentage="monthlyPercent"
          :pivot-text="`${monthlyPercent}%`"
          pivot-color="#e8573a"
          color="linear-gradient(135deg,#e8573a 0%,#f39c12 100%)"
          stroke-width="10"
          class="quota-progress"
        />
        <div class="quota-nums">
          本月已用 {{ formatNum(quota.monthlyTokenUsed) }} / {{ formatNum(quota.monthlyTokenQuota) }}
        </div>
        <div class="quota-grid">
          <div class="quota-grid-item">
            <div class="quota-grid-num">{{ quota.todayRequestCount ?? 0 }}</div>
            <div class="quota-grid-label">今日请求</div>
          </div>
          <div class="quota-grid-item">
            <div class="quota-grid-num">{{ formatNum(quota.todayTokenUsed) }}</div>
            <div class="quota-grid-label">今日 Token</div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="quota-none">
          <van-icon name="info-o" size="16" color="#9a9aae" />
          <span>尚未开通智能客服服务，当前买家咨询由人工接待；开通后可手动开启 AI 自动接待</span>
          <span class="quota-none-link" @click="$router.push('/merchant/ai')">去开通</span>
        </div>
      </template>
    </div>

    <!-- ═══ 视图一：会话列表 ═══ -->
    <div v-if="!activeSession" class="cs-session-view">
      <van-loading v-if="sessionsLoading && sessions.length === 0" class="loading-center" size="24" color="#e8573a" />
      <van-empty v-else-if="sessions.length === 0" description="暂无客服会话" />
      <div v-else class="cs-session-list">
        <div v-for="g in groupedSessions" :key="g.userId" class="cs-user-group">
          <!-- 用户入口：一个用户一条（最近活跃会话），点击直接进入 -->
          <div class="cs-session-item" @click="openSession(g.latestSession)">
            <div class="cs-session-avatar">
              <van-icon name="user-o" size="18" color="#fff" />
            </div>
            <div class="cs-session-main">
              <div class="cs-session-title-row">
                <span class="cs-session-title">用户 {{ g.userId }}</span>
                <span class="cs-mode-tag" :class="g.latestSession.serviceMode === 1 ? 'is-human' : 'is-ai'">
                  {{ g.latestSession.serviceMode === 1 ? '人工' : 'AI' }}
                </span>
              </div>
              <div class="cs-session-preview">{{ truncate(g.lastMessage) }}</div>
            </div>
            <div class="cs-session-side">
              <span class="cs-session-time">{{ formatTime(g.lastMessageAt) }}</span>
              <van-badge v-if="g.unreadCount > 0" :content="g.unreadCount" max="99" class="cs-session-badge" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ 视图二：对话（同页切换） ═══ -->
    <div v-else class="cs-chat-view">
      <!-- 顶部操作栏 -->
      <div class="cs-chat-header">
        <span class="cs-back" @click="backToList">
          <van-icon name="arrow-left" size="16" /> 会话列表
        </span>
        <span class="cs-chat-title">{{ activeSession.title || `用户 ${activeSession.userId}` }}</span>
        <span class="cs-chat-actions">
          <van-button
            v-if="showTakeover"
            size="mini"
            round
            class="cs-takeover-btn"
            :loading="acting === 'takeover'"
            @click="handleTakeover"
          >接入</van-button>
          <van-button
            v-if="activeSession.serviceMode !== 1"
            size="mini"
            round
            plain
            class="cs-tohuman-btn"
            :loading="acting === 'to-human'"
            @click="handleToHuman"
          >转人工</van-button>
          <van-button
            size="mini"
            round
            plain
            class="cs-toai-btn"
            :loading="acting === 'to-ai'"
            @click="handleToAi"
          >转回AI</van-button>
        </span>
      </div>

      <!-- 消息列表 -->
      <div ref="msgListRef" class="cs-msg-list">
        <van-empty v-if="messages.length === 0" description="暂无消息" />
        <div
          v-for="(msg, idx) in messages"
          :key="msg.id ?? idx"
          class="cs-msg-wrap"
          :class="{ 'is-user': msg.role === 0 }"
        >
          <!-- 左侧头像（AI / 店铺客服 / 官方客服） -->
          <div v-if="msg.role !== 0" class="cs-msg-avatar" :class="avatarClass(msg.role)">
            <van-icon :name="msg.role === 1 ? 'service-o' : 'manager-o'" size="16" color="#fff" />
          </div>
          <div class="cs-msg-body">
            <div v-if="msg.role !== 0" class="cs-msg-label">{{ roleLabel(msg.role) }}</div>
            <div class="cs-msg-bubble" :class="bubbleClass(msg.role)">
              <div class="cs-bubble-text">{{ msg.content }}</div>
            </div>
          </div>
          <!-- 右侧头像（用户） -->
          <div v-if="msg.role === 0" class="cs-msg-avatar cs-avatar-user">
            <van-icon name="user-o" size="16" color="#fff" />
          </div>
        </div>
      </div>

      <!-- 底部输入栏 -->
      <div class="cs-input-bar">
        <div class="cs-input-field-wrap">
          <input
            v-model="replyText"
            class="cs-input-field"
            placeholder="输入回复内容..."
            @keydown.enter="handleReply"
          />
        </div>
        <div
          class="cs-send-btn"
          :class="{ disabled: !replyText.trim() || replying }"
          @click="handleReply"
        >
          <van-icon v-if="!replying" name="guide-o" size="18" color="#fff" />
          <van-loading v-else size="14" color="#fff" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import request from '../utils/request.js'

const props = defineProps({
  /** 坐席接口前缀：'/merchant/cs' 或 '/admin/cs' */
  apiPrefix: { type: String, required: true },
  /** 是否展示额度卡片（仅商家端） */
  showQuota: { type: Boolean, default: false },
  /** 额度数据（父页请求后传入；未开通为 null 或额度字段为 null） */
  quota: { type: Object, default: null },
})

// ── 会话列表 ──
const sessions = ref([])
const sessionsLoading = ref(false)
const activeSession = ref(null)

// ── 按用户聚合（设计 D5 修订：一个用户只露最近活跃的一条会话，未读聚合求和；存储保留多会话） ──
const groupedSessions = computed(() => {
  const map = new Map()
  for (const s of sessions.value) {
    if (!map.has(s.userId)) {
      map.set(s.userId, { userId: s.userId, sessions: [], unreadCount: 0, lastMessage: '', lastMessageAt: '', latestSession: s })
    }
    const g = map.get(s.userId)
    g.sessions.push(s)
    g.unreadCount += s.unreadCount || 0
    if (s.lastMessageAt && s.lastMessageAt > g.lastMessageAt) {
      g.lastMessageAt = s.lastMessageAt
      g.lastMessage = s.lastMessage
      g.latestSession = s
    }
  }
  const groups = Array.from(map.values())
  groups.sort((a, b) => String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || '')))
  return groups
})

// ── 消息 ──
const messages = ref([])
const msgListRef = ref(null)

// ── 输入 ──
const replyText = ref('')
const replying = ref(false)
const acting = ref('') // 'takeover' | 'to-ai'

// ── 月额度进度百分比 ──
const monthlyPercent = computed(() => {
  const q = props.quota
  if (!q || !q.monthlyTokenQuota) return 0
  return Math.min(100, Math.round(((q.monthlyTokenUsed || 0) / q.monthlyTokenQuota) * 100))
})

// ── 待接入判定：人工模式下还有未读，说明尚未被坐席接管 ──
const showTakeover = computed(() => {
  return activeSession.value && activeSession.value.serviceMode === 1 && activeSession.value.unreadCount > 0
})

/** role 中文标签：1=AI 2=店铺客服（admin 端同样显示商家客服）3=官方客服 */
function roleLabel(role) {
  if (role === 1) return 'AI'
  if (role === 2) return '店铺客服'
  if (role === 3) return '官方客服'
  return ''
}

function avatarClass(role) {
  if (role === 1) return 'cs-avatar-ai'
  if (role === 2) return 'cs-avatar-merchant'
  return 'cs-avatar-admin'
}

function bubbleClass(role) {
  if (role === 0) return 'cs-bubble-user'
  if (role === 1) return 'cs-bubble-ai'
  return 'cs-bubble-human'
}

function truncate(text) {
  if (!text) return '暂无消息'
  return text.length > 30 ? text.slice(0, 30) + '…' : text
}

function formatNum(n) {
  if (n == null) return '--'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ── 接口（基于 apiPrefix 拼接，商家/平台端同构） ──
function fetchSessionsApi() {
  return request.get(`${props.apiPrefix}/sessions`, { silent: true })
}
function fetchMessagesApi(sessionId) {
  return request.get(`${props.apiPrefix}/sessions/${sessionId}/messages`, { silent: true })
}

async function loadSessions() {
  try {
    const data = await fetchSessionsApi()
    sessions.value = data || []
    // 对话视图中同步会话最新状态（serviceMode 等），避免轮询后操作按钮状态过期；
    // 未读数保留本地值（接入后本地清零，新未读也不回弹"接入"按钮，维持原交互语义）
    if (activeSession.value) {
      const fresh = sessions.value.find(s => s.sessionId === activeSession.value.sessionId)
      if (fresh) {
        const localUnread = activeSession.value.unreadCount
        activeSession.value = { ...activeSession.value, ...fresh, unreadCount: Math.min(localUnread ?? fresh.unreadCount, fresh.unreadCount) }
      }
    }
  } catch { /* 静默轮询失败 */ }
  finally { sessionsLoading.value = false }
}

// ── 轮询 ──
let listTimer = null
let msgTimer = null
let pageVisible = true

function startPolling() {
  stopPolling()
  // 会话列表 5s 轮询
  listTimer = setInterval(loadSessions, 5000)
  // 对话中消息 3s 增量轮询
  if (activeSession.value) {
    msgTimer = setInterval(pollMessages, 3000)
  }
}

function stopPolling() {
  if (listTimer) { clearInterval(listTimer); listTimer = null }
  if (msgTimer) { clearInterval(msgTimer); msgTimer = null }
}

function onVisibilityChange() {
  pageVisible = document.visibilityState === 'visible'
  if (pageVisible) {
    loadSessions()
    if (activeSession.value) loadMessages(true)
    startPolling()
  } else {
    stopPolling()
  }
}

/** 进入会话对话视图 */
async function openSession(s) {
  activeSession.value = s
  messages.value = []
  replyText.value = ''
  await loadMessages(true)
  // 切换会话后重启轮询（消息轮询依赖 activeSession）
  if (pageVisible) startPolling()
}

/** 返回会话列表 */
function backToList() {
  activeSession.value = null
  messages.value = []
  loadSessions()
  if (pageVisible) startPolling()
}

/** 加载消息：first=true 全量替换；否则按消息 id 去重增量追加 */
async function loadMessages(first = false) {
  const sid = activeSession.value?.sessionId
  if (!sid) return
  try {
    const data = await fetchMessagesApi(sid)
    const fetched = (data || []).map(m => ({ id: m.id, role: m.role, content: m.content || '' }))
    if (first) {
      messages.value = fetched
      scrollToBottom(false)
      return
    }
    mergeMessages(fetched)
  } catch { /* 静默轮询失败 */ }
}

/** 增量合并：按消息 id 去重追加；无 id 时按 角色+内容 匹配本地消息，防重复 */
function mergeMessages(fetched) {
  const existIds = new Set(messages.value.filter(m => m.id != null).map(m => String(m.id)))
  let appended = false
  for (const m of fetched) {
    if (m.id != null && existIds.has(String(m.id))) continue
    const local = m.id != null && messages.value.find(l => l.id == null && l.role === m.role && l.content === m.content)
    if (local) { local.id = m.id; continue }
    messages.value.push(m)
    appended = true
  }
  if (appended) scrollToBottom()
}

/** 轮询入口：先尝试增量合并，接口异常时静默 */
async function pollMessages() {
  if (!activeSession.value) return
  await loadMessages(false)
}

// ── 发送人工回复 ──
async function handleReply() {
  const text = replyText.value.trim()
  const sid = activeSession.value?.sessionId
  if (!text || !sid || replying.value) return
  replying.value = true
  try {
    await request.post(`${props.apiPrefix}/sessions/${sid}/reply`, { content: text })
    replyText.value = ''
    // 本地立即上屏（坐席消息 role 由端决定：商家=2 平台=3），随后轮询会按内容匹配去重
    messages.value.push({ id: null, role: props.apiPrefix.startsWith('/admin') ? 3 : 2, content: text })
    scrollToBottom()
    loadSessions()
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { replying.value = false }
}

// ── 接入会话 ──
async function handleTakeover() {
  const sid = activeSession.value?.sessionId
  if (!sid || acting.value) return
  acting.value = 'takeover'
  try {
    await request.put(`${props.apiPrefix}/sessions/${sid}/takeover`)
    showToast('已接入，现在由你人工回复')
    activeSession.value.unreadCount = 0
    loadSessions()
  } catch { /* toast by interceptor */ }
  finally { acting.value = '' }
}

// ── 转人工（AI 态会话经坐席确认切入人工态，随后可人工回复） ──
async function handleToHuman() {
  const sid = activeSession.value?.sessionId
  if (!sid || acting.value) return
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确认将该会话转为人工接待？转接后买家消息将不再由 AI 自动回复。',
      confirmButtonColor: '#1989fa',
    })
  } catch { return /* 取消 */ }
  acting.value = 'to-human'
  try {
    await request.put(`${props.apiPrefix}/sessions/${sid}/to-human`)
    showToast('已转为人工接待，可直接回复')
    activeSession.value.serviceMode = 1
    loadSessions()
  } catch { /* toast by interceptor */ }
  finally { acting.value = '' }
}

// ── 转回 AI ──
async function handleToAi() {
  const sid = activeSession.value?.sessionId
  if (!sid || acting.value) return
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确认将会话转回 AI 接待？后续买家消息将由 AI 自动回复。',
      confirmButtonColor: '#e8573a',
    })
  } catch { return /* 取消 */ }
  acting.value = 'to-ai'
  try {
    await request.put(`${props.apiPrefix}/sessions/${sid}/to-ai`)
    showToast('已转回 AI 接待')
    activeSession.value.serviceMode = 0
    loadSessions()
  } catch { /* toast by interceptor */ }
  finally { acting.value = '' }
}

async function scrollToBottom(smooth = true) {
  await nextTick()
  msgListRef.value?.scrollTo({ top: msgListRef.value.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
}

onMounted(() => {
  sessionsLoading.value = true
  loadSessions()
  startPolling()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.cs-console {
  font-size: 13px;
}

/* ── 额度卡片 ── */
.quota-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  padding: 14px 16px;
  margin-bottom: 12px;
}
.quota-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.quota-name { font-size: 15px; font-weight: 700; color: #1a1a2e; }
.quota-remain { font-size: 12px; color: #e8573a; font-weight: 500; }
.quota-progress { margin-bottom: 6px; }
.quota-nums { font-size: 12px; color: #9a9aae; margin-bottom: 10px; }
.quota-grid {
  display: flex;
  gap: 12px;
  border-top: 1px solid #f5f3f0;
  padding-top: 10px;
}
.quota-grid-item { flex: 1; text-align: center; }
.quota-grid-num { font-size: 15px; font-weight: 700; color: #1a1a2e; }
.quota-grid-unit { font-size: 11px; font-weight: 400; color: #9a9aae; }
.quota-grid-label { font-size: 11px; color: #9a9aae; margin-top: 2px; }
.quota-none {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9a9aae;
}
.quota-none-link {
  margin-left: auto;
  color: #e8573a;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(232,87,58,0.08);
}

/* ── 会话列表 ── */
.loading-center { padding: 40px 0; }
.cs-session-list {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}
.cs-session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #f5f3f0;
  cursor: pointer;
  transition: background 0.15s;
}
.cs-session-item:last-child { border-bottom: none; }
.cs-session-item:active { background: #faf8f6; }
/* ── 按用户聚合（一个用户一条入口） ── */
.cs-user-group { border-bottom: 1px solid #f5f3f0; }
.cs-user-group:last-child { border-bottom: none; }
.cs-user-group .cs-session-item { border-bottom: none; }
.cs-session-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cs-session-main { flex: 1; min-width: 0; }
.cs-session-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cs-session-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-mode-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 8px;
  flex-shrink: 0;
}
.cs-mode-tag.is-ai { background: #e8f8ee; color: #07c160; }
.cs-mode-tag.is-human { background: #fef0e8; color: #e8573a; }
.cs-session-preview {
  font-size: 12px;
  color: #9a9aae;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-session-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.cs-session-time { font-size: 11px; color: #c8c4c0; }

/* ── 对话视图 ── */
.cs-chat-view {
  display: flex;
  flex-direction: column;
  background: #f5f3f0;
  border-radius: 12px;
  overflow: hidden;
  height: 560px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.cs-chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #f0ece8;
  flex-shrink: 0;
}
.cs-back {
  font-size: 13px;
  color: #5a5a6e;
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  user-select: none;
}
.cs-chat-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.cs-chat-actions { display: flex; gap: 6px; flex-shrink: 0; }
.cs-takeover-btn {
  background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  font-size: 11px;
  padding: 0 10px;
  height: 24px;
}
.cs-tohuman-btn {
  border-color: #1989fa !important;
  color: #1989fa !important;
  font-size: 11px;
  padding: 0 10px;
  height: 24px;
}
.cs-toai-btn {
  border-color: #e8573a !important;
  color: #e8573a !important;
  font-size: 11px;
  padding: 0 10px;
  height: 24px;
}

/* ── 消息气泡 ── */
.cs-msg-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cs-msg-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 85%;
  align-self: flex-start;
}
.cs-msg-wrap.is-user {
  align-self: flex-end;
}
.cs-msg-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cs-avatar-ai { background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%); }
.cs-avatar-merchant { background: linear-gradient(135deg, #1989fa 0%, #576b95 100%); }
.cs-avatar-admin { background: linear-gradient(135deg, #07c160 0%, #3eaf7c 100%); }
.cs-avatar-user { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.cs-msg-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.cs-msg-label { font-size: 11px; color: #9a9aae; padding-left: 4px; }
.cs-msg-bubble {
  padding: 9px 12px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}
.cs-bubble-user {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
  border-bottom-right-radius: 5px;
}
.cs-bubble-ai {
  background: #fff;
  color: #1a1a2e;
  border-bottom-left-radius: 5px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.cs-bubble-human {
  background: #eef3ff;
  color: #1a1a2e;
  border-bottom-left-radius: 5px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.cs-bubble-text { margin: 0; }

/* ── 输入栏 ── */
.cs-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 10px;
  background: #fff;
  border-top: 1px solid #f0ece8;
  flex-shrink: 0;
}
.cs-input-field-wrap {
  flex: 1;
  background: #f5f3f0;
  border-radius: 18px;
  padding: 7px 14px;
  border: 1.5px solid transparent;
  transition: border-color 0.25s;
}
.cs-input-field-wrap:focus-within { border-color: #e8573a; }
.cs-input-field {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #1a1a2e;
  font-family: inherit;
}
.cs-input-field::placeholder { color: #c8c4c0; }
.cs-send-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.2s, transform 0.15s;
}
.cs-send-btn:active { transform: scale(0.92); }
.cs-send-btn.disabled { opacity: 0.4; cursor: not-allowed; }
</style>
