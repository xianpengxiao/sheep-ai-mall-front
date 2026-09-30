<template>
  <div class="page-chat">
    <!-- ═══ 导航栏 ═══ -->
    <div class="nav-bar-sticky">
      <NavBar title="智能客服" />
    </div>

    <!-- ═══ 加载中 ═══ -->
    <div v-if="pageLoading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <!-- ═══ 主体：消息区域 + 底部输入 ═══ -->
    <template v-else>
      <!-- 消息列表 -->
      <div ref="msgListRef" class="msg-list" @scroll="onScroll">
        <!-- 空状态 -->
        <div v-if="messages.length === 0 && !streaming" class="msg-empty">
          <van-icon name="service-o" size="48" color="#e0dcd8" />
          <span class="empty-title">有什么可以帮你的？</span>
          <span class="empty-hint">输入你的问题，AI 助手将为你解答</span>
          <div class="quick-questions">
            <span class="quick-chip" v-for="q in quickQuestions" :key="q" @click="handleQuickSend(q)">{{ q }}</span>
          </div>
        </div>

        <!-- 消息气泡 -->
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="msg-bubble-wrap"
          :class="{ 'is-user': msg.role === 0, 'is-ai': msg.role === 1 }"
        >
          <!-- AI 头像 -->
          <div v-if="msg.role === 1" class="msg-avatar ai-avatar">
            <van-icon name="service-o" size="18" color="#fff" />
          </div>

          <div class="msg-bubble" :class="{ 'bubble-user': msg.role === 0, 'bubble-ai': msg.role === 1 }">
            <div class="bubble-text">{{ msg.content }}</div>
            <!-- 流式输出时的光标动画 -->
            <span v-if="streaming && idx === messages.length - 1 && msg.role === 1" class="typing-cursor">|</span>
          </div>

          <!-- 用户头像 -->
          <div v-if="msg.role === 0" class="msg-avatar user-avatar">
            <van-icon name="user-o" size="18" color="#fff" />
          </div>
        </div>

        <!-- 流式输出中的占位（首次还没有 AI 消息时） -->
        <div v-if="streaming && messages.length === 0" class="msg-bubble-wrap is-ai">
          <div class="msg-avatar ai-avatar">
            <van-icon name="service-o" size="18" color="#fff" />
          </div>
          <div class="msg-bubble bubble-ai typing-bubble">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
        </div>

        <!-- 底部锚点：自动滚动 -->
        <div ref="scrollAnchorRef" class="scroll-anchor"></div>
      </div>

      <!-- 底部输入栏 -->
      <div class="input-bar">
        <!-- 会话选择按钮 -->
        <div class="input-sessions-btn" @click="showSessions = true">
          <van-icon name="chat-o" size="20" color="#5a5a6e" />
          <van-badge v-if="sessions.length > 0" :content="sessions.length" max="9" class="session-badge" />
        </div>

        <div class="input-field-wrap">
          <input
            v-model="inputText"
            class="input-field"
            placeholder="输入你的问题..."
            :disabled="streaming"
            @keydown.enter="handleSend"
          />
        </div>

        <div
          class="input-send-btn"
          :class="{ disabled: !inputText.trim() || streaming }"
          @click="handleSend"
        >
          <van-icon v-if="!streaming" name="guide-o" size="20" color="#fff" />
          <van-loading v-else size="16" color="#fff" />
        </div>
      </div>
    </template>

    <!-- ═══ 会话列表侧边抽屉 ═══ -->
    <van-popup v-model:show="showSessions" position="left" :style="{ width: '80%', height: '100%' }" round safe-area-inset-bottom>
      <div class="sessions-panel">
        <div class="sessions-header">
          <span class="sessions-title">对话历史</span>
          <span class="sessions-new-btn" @click="handleNewChat">
            <van-icon name="add-o" size="16" /> 新建
          </span>
        </div>

        <div v-if="sessionsLoading" class="sessions-loading">
          <van-loading size="24" color="#e8573a" />
        </div>

        <div v-else-if="sessions.length === 0" class="sessions-empty">
          <van-icon name="chat-o" size="36" color="#e0dcd8" />
          <span>暂无对话记录</span>
        </div>

        <div v-else class="sessions-list">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="session-item"
            :class="{ active: currentSessionId === s.id }"
            @click="handleSelectSession(s)"
          >
            <div class="session-item-main">
              <div class="session-item-title">{{ s.title }}</div>
              <div class="session-item-preview">{{ s.lastMessage }}</div>
              <div class="session-item-meta">
                <span>{{ s.messageCount }} 条消息</span>
                <span>{{ formatTime(s.lastMessageAt) }}</span>
              </div>
            </div>
            <div class="session-item-del" @click.stop="handleDeleteSession(s)">
              <van-icon name="delete-o" size="16" color="#c8c4c0" />
            </div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, nextTick, onActivated, onMounted, onUnmounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import NavBar from '../../components/NavBar.vue'
import { getSessions, getMessages, deleteSession, sendMessageStream } from '../../api/chat.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()

// ── 页面状态 ──
const pageLoading = ref(false)
const showSessions = ref(false)
const inputText = ref('')
const streaming = ref(false)
const msgListRef = ref(null)
const scrollAnchorRef = ref(null)

// ── 会话 ──
const sessions = ref([])
const sessionsLoading = ref(false)
const currentSessionId = ref(null)
const messages = ref([])

// ── 快捷问题 ──
const quickQuestions = ['如何退货？', '发货时效是多久？', '如何联系客服？', '如何修改收货地址？']

// ── 中止控制器（用于取消流式请求） ──
let abortController = null

// ── 用户切换检测 ──
let lastUserId = null

function resetChat() {
  currentSessionId.value = null
  messages.value = []
  inputText.value = ''
  sessions.value = []
  // 停止正在进行的流式请求
  if (abortController) {
    abortController.abort()
    abortController = null
    streaming.value = false
  }
}

function onLogout() {
  resetChat()
  lastUserId = null
}

// ── 初始化 ──
onMounted(() => {
  window.addEventListener('auth:logout', onLogout)
})

onUnmounted(() => {
  window.removeEventListener('auth:logout', onLogout)
})

onActivated(() => {
  const currentUserId = userStore.memberInfo?.userId || null
  // 用户切换或首次访问：重置状态
  if (lastUserId !== null && lastUserId !== currentUserId) {
    resetChat()
  }
  lastUserId = currentUserId
  fetchSessions()
})

// ── 获取会话列表 ──
async function fetchSessions() {
  sessionsLoading.value = true
  try {
    const data = await getSessions()
    sessions.value = data || []
  } catch { sessions.value = [] }
  finally { sessionsLoading.value = false }
}

// ── 选择会话，加载消息历史 ──
async function handleSelectSession(session) {
  currentSessionId.value = session.id
  showSessions.value = false
  pageLoading.value = true
  messages.value = []
  try {
    const data = await getMessages(session.id)
    messages.value = (data || []).map(m => ({
      role: m.role,
      content: m.content || '',
    }))
    await scrollToBottom(false)
  } catch {
    showToast('加载消息失败')
  } finally {
    pageLoading.value = false
  }
}

// ── 新建会话 ──
function handleNewChat() {
  currentSessionId.value = null
  messages.value = []
  showSessions.value = false
  inputText.value = ''
}

// ── 发送消息 ──
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || streaming.value) return

  // 添加用户消息到列表
  messages.value.push({ role: 0, content: text })
  inputText.value = ''
  await scrollToBottom()

  // 开始 SSE 流式接收
  streaming.value = true
  abortController = new AbortController()

  // 先添加一个空的 AI 消息占位
  const aiMsgIdx = messages.value.length
  messages.value.push({ role: 1, content: '' })
  await scrollToBottom()

  try {
    const response = await sendMessageStream(currentSessionId.value, text)

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(errText || `HTTP ${response.status}`)
    }

    // 浏览器可能缓存或代理可能缓冲；先检查 response.body 是否可用
    if (!response.body) {
      // 兜底：无法流式读取时，直接按纯文本处理
      const fullText = await response.text()
      if (fullText) {
        messages.value[aiMsgIdx].content = fullText
        await scrollToBottom()
      }
    } else {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        // 逐行处理（兼容 \n / \r\n），每个 chunk 独立解析不依赖跨 chunk 缓冲
        for (let line of chunk.split('\n')) {
          line = line.trim()
          if (!line) continue
          // 跳过 SSE 注释行、event 类型行
          if (line.startsWith(':') || line.startsWith('event:')) continue

          // 去除 "data:" 前缀（兼容 SSE 标准格式）
          if (line.startsWith('data:')) {
            line = line.slice(5).trim()
          }
          if (!line || line === '[DONE]') continue

          // 尝试解析 Claude JSON 事件，提取 delta.text
          try {
            const json = JSON.parse(line)
            if (json.type === 'content_block_delta' && json.delta?.text) {
              line = json.delta.text
            } else if (json.type === 'content_block_start' && json.content_block?.text) {
              line = json.content_block.text
            } else if (
              json.type === 'message_start' ||
              json.type === 'content_block_stop' ||
              json.type === 'message_delta' ||
              json.type === 'message_stop' ||
              json.type === 'ping'
            ) {
              continue // 非文本事件，跳过
            }
            // 未知 JSON 类型保留原文本（兼容未来扩展）
          } catch {
            // 纯文本，直接使用
          }

          if (line) {
            messages.value[aiMsgIdx].content += line
            await scrollToBottom()
          }
        }
      }
    }

    // 从响应头读取 sessionId（后端每次请求都返回）
    const sid = response.headers.get('X-Session-Id')
    if (sid) {
      currentSessionId.value = sid
    }

    // 流结束后刷新会话列表
    fetchSessions()
  } catch (e) {
    if (e?.name === 'AbortError') return
    console.error('[Chat] SSE error:', e)
    // 如果 AI 消息为空，移除占位
    if (messages.value[aiMsgIdx] && !messages.value[aiMsgIdx].content) {
      messages.value.pop()
    }
    const msg = e?.message || '请求失败'
    if (!msg.includes('abort')) showToast(msg)
  } finally {
    streaming.value = false
    abortController = null
  }
}

// ── 快捷发送 ──
function handleQuickSend(q) {
  inputText.value = q
  handleSend()
}

// ── 删除会话 ──
async function handleDeleteSession(session) {
  try {
    await showConfirmDialog({
      title: '提示',
      message: `确认删除「${session.title}」吗？`,
      confirmButtonColor: '#e8573a',
    })
    await deleteSession(session.id)
    showToast('已删除')
    if (currentSessionId.value === session.id) {
      handleNewChat()
    }
    await fetchSessions()
  } catch (e) {
    if (e?.toString().includes('cancel')) return
    showToast('删除失败')
  }
}

// ── 滚动到底部 ──
async function scrollToBottom(smooth = true) {
  await nextTick()
  scrollAnchorRef.value?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'end' })
}

// ── 用户手动滚动时暂停自动滚动（简化：不中断用户操作） ──
function onScroll() { /* 保留用于未来扩展 */ }

// ── 时间格式化 ──
function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.page-chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f3f0;
}

.nav-bar-sticky {
  flex-shrink: 0;
}

/* ── 状态容器 ── */
.state-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ══════════════════════════════════════════════
   消息列表
   ══════════════════════════════════════════════ */
.msg-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  -webkit-overflow-scrolling: touch;
}

/* 空状态 */
.msg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px;
  gap: 8px;
}
.empty-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a2e;
  margin-top: 8px;
}
.empty-hint {
  font-size: 13px;
  color: #9a9aae;
}
.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}
.quick-chip {
  padding: 8px 16px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 500;
  color: #e8573a;
  background: #fff;
  border: 1.5px solid rgba(232,87,58,0.25);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.quick-chip:active {
  background: #e8573a;
  color: #fff;
  transform: scale(0.95);
}

/* ── 消息气泡行 ── */
.msg-bubble-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 90%;
}
.msg-bubble-wrap.is-user {
  align-self: flex-end;
  flex-direction: row;
}
.msg-bubble-wrap.is-ai {
  align-self: flex-start;
  flex-direction: row;
}

/* 头像 */
.msg-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-avatar {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
}
.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 气泡 */
.msg-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
  position: relative;
}
.bubble-user {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
  border-bottom-right-radius: 6px;
}
.bubble-ai {
  background: #fff;
  color: #1a1a2e;
  border-bottom-left-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* 流式光标 */
.typing-cursor {
  display: inline;
  animation: blink 0.8s infinite;
  color: #e8573a;
  font-weight: 700;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 打字中占位气泡 */
.typing-bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 18px;
}
.typing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c8c4c0;
  animation: typingBounce 1.2s infinite ease-in-out;
}
.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* 底部锚点 */
.scroll-anchor {
  height: 1px;
}

/* ══════════════════════════════════════════════
   底部输入栏
   ══════════════════════════════════════════════ */
.input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #f0ece8;
  flex-shrink: 0;
}

.input-sessions-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f5f3f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  transition: background 0.2s, transform 0.15s;
}
.input-sessions-btn:active {
  background: #e0dcd8;
  transform: scale(0.92);
}
.session-badge {
  position: absolute;
  top: -4px;
  right: -6px;
}
.session-badge :deep(.van-badge) {
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
}

.input-field-wrap {
  flex: 1;
  background: #f5f3f0;
  border-radius: 20px;
  padding: 8px 16px;
  border: 1.5px solid transparent;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.input-field-wrap:focus-within {
  border-color: #e8573a;
  box-shadow: 0 2px 10px rgba(232,87,58,0.10);
}
.input-field {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1a1a2e;
  line-height: 1.4;
  font-family: inherit;
  resize: none;
}
.input-field::placeholder {
  color: #c8c4c0;
}
.input-field:disabled {
  color: #9a9aae;
}

.input-send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.2s, transform 0.15s;
  box-shadow: 0 2px 8px rgba(232,87,58,0.3);
}
.input-send-btn:active {
  transform: scale(0.92);
}
.input-send-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

/* ══════════════════════════════════════════════
   会话侧边面板
   ══════════════════════════════════════════════ */
.sessions-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f3f0;
}

.sessions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  flex-shrink: 0;
}
.sessions-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
}
.sessions-new-btn {
  font-size: 13px;
  font-weight: 600;
  color: #e8573a;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 16px;
  background: rgba(232,87,58,0.08);
  transition: background 0.2s, transform 0.15s;
}
.sessions-new-btn:active {
  background: rgba(232,87,58,0.16);
  transform: scale(0.95);
}

.sessions-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sessions-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #bababa;
  font-size: 14px;
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #fff;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.session-item:active {
  background: #faf8f6;
}
.session-item.active {
  box-shadow: 0 0 0 2px rgba(232,87,58,0.3);
}

.session-item-main {
  flex: 1;
  min-width: 0;
}
.session-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-item-preview {
  font-size: 12px;
  color: #9a9aae;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-item-meta {
  font-size: 11px;
  color: #c8c4c0;
  margin-top: 4px;
  display: flex;
  gap: 12px;
}

.session-item-del {
  padding: 6px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;
}
.session-item-del:active {
  background: rgba(232,87,58,0.1);
}
.session-item-del:active :deep(.van-icon) {
  color: #e8573a !important;
}

/* ══════════════════════════════════════════════
   响应式
   ══════════════════════════════════════════════ */
@media (min-width: 640px) {
  .msg-list {
    padding: 16px 24px 8px;
  }
  .input-bar {
    padding: 10px 24px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
  }
  .msg-bubble-wrap {
    max-width: 70%;
  }
}
</style>
