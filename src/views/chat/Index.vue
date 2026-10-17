<template>
  <div class="page-chat">
    <!-- ═══ 导航栏 ═══ -->
    <div class="nav-bar-sticky">
      <NavBar :title="shopName ? `${shopName}客服` : '官方客服'" />
    </div>

    <!-- 商家客服入口提示（从店铺页跳转时展示） -->
    <div v-if="shopName" class="shop-service-bar">
      <van-icon name="shop-o" size="14" color="#e8573a" />
      <span class="shop-service-text">正在咨询「{{ shopName }}」专属客服</span>
    </div>

    <!-- 人工客服服务中横幅（会话进入人工态后展示） -->
    <div v-if="humanMode" class="human-service-bar">
      <van-icon name="manager-o" size="14" color="#1989fa" />
      <span class="human-service-text">人工客服服务中</span>
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
          :class="{ 'is-user': msg.role === 0, 'is-ai': msg.role !== 0 }"
        >
          <!-- AI 头像 -->
          <div v-if="msg.role === 1" class="msg-avatar ai-avatar">
            <van-icon name="service-o" size="18" color="#fff" />
          </div>
          <!-- 人工客服头像（2=商家人工 3=平台人工） -->
          <div v-else-if="msg.role === 2 || msg.role === 3" class="msg-avatar human-avatar">
            <van-icon name="manager-o" size="18" color="#fff" />
          </div>

          <div class="msg-body">
            <!-- 人工消息来源小标签 -->
            <div v-if="msg.role === 2 || msg.role === 3" class="sender-label">{{ msg.role === 2 ? '店铺客服' : '官方客服' }}</div>
            <div class="msg-bubble" :class="{ 'bubble-user': msg.role === 0, 'bubble-ai': msg.role === 1, 'bubble-human': msg.role === 2 || msg.role === 3 }">
              <div class="bubble-text">{{ msg.content }}</div>
              <!-- 流式输出时的光标动画 -->
              <span v-if="streaming && idx === messages.length - 1 && msg.role === 1" class="typing-cursor">|</span>
            </div>

            <!-- AI 待执行操作确认卡片（改地址/取消订单/加购物车） -->
            <div v-if="msg.pendingOps && msg.pendingOps.length" class="pending-ops">
              <div v-for="op in msg.pendingOps" :key="op.operationId" class="pending-op-card">
                <div class="op-head">
                  <span class="op-type-tag">{{ opTypeText(op.opType) }}</span>
                  <span class="op-title">待确认操作</span>
                </div>
                <div class="op-display">{{ op.displayText }}</div>
                <div v-if="!op.state" class="op-actions">
                  <button class="op-btn op-btn-confirm" :disabled="op.loading" @click="handleConfirmOp(op, true)">
                    {{ op.loading ? '处理中...' : '确认执行' }}
                  </button>
                  <button class="op-btn op-btn-cancel" :disabled="op.loading" @click="handleConfirmOp(op, false)">取消</button>
                </div>
                <div v-else class="op-result" :class="op.state === 'done' ? 'is-done' : 'is-cancelled'">
                  {{ op.state === 'done' ? '✓ 已执行' : '已取消' }}
                </div>
              </div>
            </div>

            <!-- 商品卡片（AI 商品搜索结果，最多 2 张） -->
            <div v-if="msg.goodsCards && msg.goodsCards.length" class="goods-cards">
              <div v-for="(g, gi) in msg.goodsCards" :key="'g' + gi" class="goods-card">
                <div class="goods-card-img-wrap" @click="goGoods(g.spuId)">
                  <img v-if="g.image" :src="g.image" class="goods-card-img" alt="" />
                  <div v-else class="goods-card-img-ph"><van-icon name="photo-o" size="22" color="#c8c4c0" /></div>
                </div>
                <div class="goods-card-info">
                  <div class="goods-card-name" @click="goGoods(g.spuId)">{{ g.name }}</div>
                  <div class="goods-card-meta">
                    <span v-if="g.price" class="goods-card-price">¥{{ g.price }}</span>
                    <span v-if="g.salesCount != null" class="goods-card-sales">已售 {{ g.salesCount }}</span>
                  </div>
                  <div class="goods-card-actions">
                    <span class="goods-act detail" @click="goGoods(g.spuId)">查看详情</span>
                    <span v-if="g.skuId" class="goods-act cart" :class="{ disabled: g._adding }" @click="addCartFromCard(msg, g)">
                      {{ g._adding ? '处理中...' : '加入购物车' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 订单卡片（AI 订单查询结果，最多 2 张） -->
            <div v-if="msg.orderCards && msg.orderCards.length" class="order-cards">
              <div v-for="(o, oi) in msg.orderCards" :key="'o' + oi" class="order-card" @click="goOrder(o.orderId)">
                <div class="order-card-row">
                  <span class="order-card-no">{{ o.orderNo }}</span>
                  <span class="order-card-status">{{ o.statusText }}</span>
                </div>
                <div class="order-card-row sub">
                  <span>金额 ¥{{ o.totalAmount }}</span>
                  <span>{{ formatTime(o.createTime) }}</span>
                </div>
                <div class="order-card-foot">查看详情 <van-icon name="arrow" size="12" /></div>
              </div>
            </div>
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

      <!-- 工具行：转人工（会话中常驻） -->
      <div v-if="currentSessionId && !humanMode" class="chat-tools">
        <span class="tool-chip" @click="handleTransfer">
          <van-icon name="service-o" size="13" /> 转人工
        </span>
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
          <span v-if="!merchantId" class="sessions-new-btn" @click="handleNewChat">
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
              <div class="session-item-title">{{ s.shopName || s.title }}</div>
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
import { ref, computed, watch, nextTick, onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import NavBar from '../../components/NavBar.vue'
import { getSessions, getMessages, deleteSession, sendMessageStream, confirmOperation, transferToHuman, createAddCartOp } from '../../api/chat.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

// ── 商家客服入口（从店铺页跳转携带 ?merchantId=xx&shopName=xx） ──
// 商家入口语义：会话列表只含该商家会话（后端按对象隔离），单会话模型自动续接，不提供"新建"
// fallbackMerchant：该商家未开通/已过期被后端回落平台会话后，本次停留期间不再切回商家入口
let fallbackMerchant = null
const merchantId = ref(null)
const shopName = ref('')

function syncShopQuery() {
  const q = route.query.merchantId || null
  if (q && String(q) === String(fallbackMerchant)) {
    merchantId.value = null
    shopName.value = ''
    return
  }
  if (q !== merchantId.value) fallbackMerchant = null
  merchantId.value = q
  shopName.value = route.query.shopName || ''
}

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

// ── 人工态 ──
// 仅由"用户主动转人工成功"或"当前会话服务模式为人工"驱动；
// 不能用历史消息推断——人工消息会永久留在记录里，坐席转回 AI 后会导致人工态无法退出
const manualHuman = ref(false)
const currentSession = computed(() => sessions.value.find(s => String(s.id) === String(currentSessionId.value)))
const humanMode = computed(() =>
  manualHuman.value
  || (currentSession.value && currentSession.value.serviceMode === 1)
)

// ── 人工态轮询 ──
let humanPollTimer = null
let pageVisible = true

function stopHumanPoll() {
  if (humanPollTimer) { clearInterval(humanPollTimer); humanPollTimer = null }
}

/** 人工态下 3s 轮询会话消息并增量合并（AI 态走 SSE，不轮询） */
function refreshHumanPoll() {
  stopHumanPoll()
  if (humanMode.value && currentSessionId.value && pageVisible && !streaming.value) {
    humanPollTimer = setInterval(pollHumanMessages, 3000)
  }
}

async function pollHumanMessages() {
  if (!currentSessionId.value || !humanMode.value) return
  try {
    const data = await getMessages(currentSessionId.value, { silent: true })
    mergeMessages(data || [])
  } catch { /* 静默轮询失败 */ }
  // 同步会话服务模式：坐席转回 AI / 超时自动转回后，退出人工态并停止轮询
  try {
    const data = await getSessions(sessionListParams({ silent: true }))
    applySessions(data)
    const cur = sessions.value.find(s => String(s.id) === String(currentSessionId.value))
    if (cur && cur.serviceMode !== 1) manualHuman.value = false
  } catch { /* 静默轮询失败 */ }
}

/** 增量合并轮询结果：按消息 id 去重追加；本地无 id 消息（SSE 占位/刚发送）按 角色+内容 匹配补 id */
function mergeMessages(fetched) {
  const existIds = new Set(messages.value.filter(m => m.id != null).map(m => String(m.id)))
  let appended = false
  let hasAgentReply = false
  for (const raw of fetched) {
    const msg = { id: raw.id ?? null, role: raw.role, content: raw.content || '' }
    // 轮询拉到的 AI 消息同样解析剔除 PENDING_OP 标记
    if (msg.role === 1) extractPendingOps(msg)
    if (msg.id != null && existIds.has(String(msg.id))) continue
    const local = msg.id != null && messages.value.find(l => l.id == null && l.role === msg.role && l.content === msg.content)
    if (local) { local.id = msg.id; continue }
    messages.value.push(msg)
    appended = true
    // 坐席人工回复（商家坐席=2 / 平台坐席=3）
    if (msg.role === 2 || msg.role === 3) hasAgentReply = true
  }
  if (appended) {
    scrollToBottom()
    // 新消息标题提示：离开客服页期间收到坐席回复 → 标签页标题闪烁
    if (hasAgentReply && !chatActive) startTitleFlash()
  }
}

// ── 新消息标题闪烁：用户在其他页面时坐席回复送达，标签页标题提示（返回客服页自动停止） ──
let chatActive = true
let titleFlashTimer = null
let baseTitle = ''

function startTitleFlash() {
  if (titleFlashTimer) return
  baseTitle = document.title
  let flagged = false
  titleFlashTimer = setInterval(() => {
    flagged = !flagged
    document.title = flagged ? `【新消息】${baseTitle}` : baseTitle
  }, 1000)
}

function stopTitleFlash() {
  if (!titleFlashTimer) return
  clearInterval(titleFlashTimer)
  titleFlashTimer = null
  if (baseTitle) document.title = baseTitle
}

// 人工态 / 当前会话变化时重启轮询
watch([humanMode, currentSessionId], refreshHumanPoll)

function onVisibilityChange() {
  pageVisible = document.visibilityState === 'visible'
  if (pageVisible) {
    refreshHumanPoll()
    // 回到前台立即拉一次，避免 3s 空窗
    if (humanMode.value && currentSessionId.value) pollHumanMessages()
  } else {
    stopHumanPoll()
  }
}

// ── 中止控制器（用于取消流式请求） ──
let abortController = null

// ── 用户切换检测 ──
let lastUserId = null

function resetChat() {
  currentSessionId.value = null
  messages.value = []
  inputText.value = ''
  sessions.value = []
  manualHuman.value = false
  stopHumanPoll()
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
  syncShopQuery()
  window.addEventListener('auth:logout', onLogout)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('auth:logout', onLogout)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopHumanPoll()
  stopTitleFlash()
})

// 离开客服页面（keep-alive 路由切换）：标记页面失活，期间收到的坐席回复触发标题闪烁
onDeactivated(() => { chatActive = false })

onActivated(() => {
  chatActive = true
  stopTitleFlash()
  syncShopQuery()
  const currentUserId = userStore.memberInfo?.userId || null
  // 用户切换或首次访问：重置状态
  if (lastUserId !== null && lastUserId !== currentUserId) {
    resetChat()
  }
  lastUserId = currentUserId
  fetchSessions()
})

// ── 获取会话列表 ──
/** 列表请求参数：商家入口只拉该商家会话，平台入口只拉平台会话（后端按聊天对象隔离） */
function sessionListParams(extra = {}) {
  return { ...extra, params: merchantId.value ? { merchantId: merchantId.value } : {} }
}

/**
 * 应用会话列表（设计 D4 按对象聚合 + 商家入口自动续接）：
 * 商家入口下当前选中会话不在列表（归属切换/被删除）时，自动切到该商家最近会话；
 * 一条会话都没有则清空进入待创建态
 */
function applySessions(data) {
  sessions.value = data || []
  if (!merchantId.value) return
  const cur = sessions.value.find(s => String(s.id) === String(currentSessionId.value))
  if (cur) return
  if (sessions.value.length > 0) {
    handleSelectSession(sessions.value[0])
  } else if (currentSessionId.value) {
    currentSessionId.value = null
    messages.value = []
    manualHuman.value = false
  }
}

async function fetchSessions() {
  sessionsLoading.value = true
  try {
    const data = await getSessions(sessionListParams())
    applySessions(data)
  } catch { sessions.value = [] }
  finally { sessionsLoading.value = false }
}

// ── 选择会话，加载消息历史 ──
async function handleSelectSession(session) {
  currentSessionId.value = session.id
  showSessions.value = false
  pageLoading.value = true
  messages.value = []
  manualHuman.value = false
  try {
    const data = await getMessages(session.id)
    messages.value = (data || []).map(m => {
      const msg = { id: m.id ?? null, role: m.role, content: m.content || '' }
      // 历史消息也可能带 PENDING_OP 标记，统一解析剔除
      if (msg.role === 1) extractPendingOps(msg)
      return msg
    })
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
  manualHuman.value = false
}

// ── 转人工 ──
async function handleTransfer() {
  if (!currentSessionId.value || streaming.value) return
  try {
    await showConfirmDialog({ title: '转人工客服', message: '将为您转接人工客服，智能客服暂停应答。是否继续？' })
  } catch { return } // 用户取消
  try {
    await transferToHuman(currentSessionId.value)
    manualHuman.value = true
    // 本地追加转接提示（/transfer 接口不改消息历史，提示仅前端展示）
    messages.value.push({ role: 1, content: '已为您转接人工客服，人工客服将尽快接入，请稍候。' })
    await scrollToBottom()
    fetchSessions() // 刷新会话列表，同步 serviceMode
    refreshHumanPoll() // 立即启动人工态轮询
  } catch { /* 错误已由拦截器 toast */ }
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
    // 已有会话时沿用会话归属，merchantId 不生效
    const merId = currentSessionId.value ? null : merchantId.value
    const response = await sendMessageStream(currentSessionId.value, text, merId)

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
    // 商家回落识别：实际会话归属与入口商家不一致 = 商家未开通/已过期，后端已回落平台会话。
    // 此时若停留在商家视图，会话不在商家列表内会被 applySessions 清空，需主动切到平台视图
    const respMerchant = response.headers.get('X-Session-Merchant')
    if (merchantId.value && respMerchant !== String(merchantId.value)) {
      fallbackMerchant = merchantId.value
      merchantId.value = null
      shopName.value = ''
      showToast('该商家未开通智能客服，已为您接入平台客服')
    }
    if (sid) {
      currentSessionId.value = sid
    }

    // 解析流末尾追加的 PENDING_OP 操作单标记（0~N 个）
    extractPendingOps(messages.value[aiMsgIdx])

    // 解析流末尾追加的商品/订单卡片标记（仅服务端流末尾标记生效，防伪造）
    extractCards(messages.value[aiMsgIdx])

    // 人工服务中后端返回空流（坐席接管后不再自动回话术），清掉空占位气泡；
    // 有卡片/操作单时保留气泡容器（卡片挂在该消息上）
    const finalMsg = messages.value[aiMsgIdx]
    if (finalMsg && !finalMsg.content
        && !(finalMsg.pendingOps && finalMsg.pendingOps.length)
        && !(finalMsg.goodsCards && finalMsg.goodsCards.length)
        && !(finalMsg.orderCards && finalMsg.orderCards.length)) {
      messages.value.splice(aiMsgIdx, 1)
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

// ── PENDING_OP 操作单解析 ──
// 流末尾可能追加 \n[[PENDING_OP:{"operationId":"...","displayText":"...","opType":"..."}]] 标记（0~N 个）
const PENDING_OP_RE = /\n?\[\[PENDING_OP:(\{.*?\})\]\]/g

/** 从 AI 消息文本中提取所有操作单：剔除标记本身，其余回复保留，操作单挂到 msg.pendingOps */
function extractPendingOps(msg) {
  if (!msg || msg.role !== 1 || !msg.content || !msg.content.includes('[[PENDING_OP:')) return
  const ops = []
  let m
  PENDING_OP_RE.lastIndex = 0
  while ((m = PENDING_OP_RE.exec(msg.content)) !== null) {
    try {
      const json = JSON.parse(m[1])
      ops.push({
        operationId: json.operationId,
        displayText: json.displayText || '',
        opType: json.opType || '',
        state: '', // '' 待确认 | 'done' 已执行 | 'cancelled' 已取消
        loading: false,
      })
    } catch { /* 非法 JSON 标记忽略 */ }
  }
  if (!ops.length) return
  // 只剔除标记本身，保留其余回复文本
  msg.content = msg.content.replace(PENDING_OP_RE, '').trimEnd()
  msg.pendingOps = ops
}

// ── 商品/订单卡片标记解析 ──
// 流末尾可能追加 \n[[GOODS_CARDS:[{...}]]] / [[ORDER_CARDS:[{...}]]] 标记（各最多 2 条）。
// 仅解析 SSE 流末尾的服务端标记（handleSend 调用），历史消息与轮询路径不解析——卡片是一次性交互，不入历史。
const GOODS_CARDS_RE = /\n?\[\[GOODS_CARDS:(\[.*?\])\]\]/g
const ORDER_CARDS_RE = /\n?\[\[ORDER_CARDS:(\[.*?\])\]\]/g

/** 从 AI 消息文本提取商品/订单卡片：剔除标记，卡片数据挂到 msg.goodsCards / msg.orderCards */
function extractCards(msg) {
  if (!msg || msg.role !== 1 || !msg.content) return
  if (msg.content.includes('[[GOODS_CARDS:')) {
    const cards = parseCardMarker(msg.content, GOODS_CARDS_RE)
    if (cards) { msg.content = cards.text; msg.goodsCards = cards.list }
  }
  if (msg.content.includes('[[ORDER_CARDS:')) {
    const cards = parseCardMarker(msg.content, ORDER_CARDS_RE)
    if (cards) { msg.content = cards.text; msg.orderCards = cards.list }
  }
}

/** 解析单个卡片标记：返回剔除后的文本与卡片数组（非法 JSON 忽略） */
function parseCardMarker(content, re) {
  re.lastIndex = 0
  const m = re.exec(content)
  if (!m) return null
  let list = []
  try { list = JSON.parse(m[1]) } catch { return null }
  if (!Array.isArray(list) || !list.length) return null
  return { text: content.replace(re, '').trimEnd(), list: list.slice(0, 2) }
}

/** 商品卡片跳转详情页 */
function goGoods(spuId) {
  if (spuId) router.push(`/goods/${spuId}`)
}

/** 订单卡片跳转订单详情 */
function goOrder(orderId) {
  if (orderId) router.push(`/order/detail/${orderId}`)
}

/** 商品卡片"加入购物车"：生成待确认操作单，复用确认卡片 UI（走确认闸，确认后才真正加购） */
async function addCartFromCard(msg, g) {
  if (g._adding || !g.skuId) return
  g._adding = true
  try {
    const marker = await createAddCartOp({
      skuId: g.skuId,
      quantity: 1,
      sessionId: currentSessionId.value,
    })
    if (!msg.pendingOps) msg.pendingOps = []
    msg.pendingOps.push({
      operationId: marker.operationId,
      displayText: marker.displayText || `加入购物车：${g.name}`,
      opType: marker.opType || 'ADD_CART',
      state: '',
      loading: false,
    })
    await scrollToBottom()
  } catch { /* 业务失败由 request.js 统一 toast（如下架、无权限） */ }
  finally { g._adding = false }
}

/** 操作类型中文标签 */
function opTypeText(opType) {
  const map = {
    UPDATE_ADDRESS: '修改地址',
    CANCEL_ORDER: '取消订单',
    ADD_CART: '加入购物车',
  }
  return map[opType] || opType || '其他操作'
}

/** 确认执行 / 取消待执行操作 */
async function handleConfirmOp(op, approve) {
  if (op.loading || op.state) return
  op.loading = true
  try {
    await confirmOperation(op.operationId, approve)
    op.state = approve ? 'done' : 'cancelled'
    if (approve) showToast('操作已执行')
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { op.loading = false }
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

/* ── 商家客服入口提示条 ── */
.shop-service-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #fef6f0;
  border-bottom: 1px solid #f5e6dc;
}
.shop-service-text {
  font-size: 12px;
  color: #e8573a;
  font-weight: 500;
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

/* 气泡 + 操作单卡片的纵向容器 */
.msg-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
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

/* ── 人工客服消息强区分（蓝系，与 AI 橙 / 用户紫三色体系） ── */
.human-avatar {
  background: #1989fa;
  border: 2px solid #fff;
  outline: 1px solid #0b6fd6;
  box-shadow: 0 1px 4px rgba(25, 137, 250, 0.35);
}
.bubble-human {
  background: #e8f2fe;
  color: #12325a;
  border: 1px solid #bcd9fb;
  border-left: 3px solid #1989fa;
  border-bottom-left-radius: 6px;
}
.sender-label {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  color: #0b6fd6;
  background: #d3e7fd;
  border: 1px solid #a9cffb;
  border-radius: 8px;
  padding: 1px 8px;
  width: fit-content;
}

/* ── 商品卡片 ── */
.goods-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.goods-card {
  display: flex;
  gap: 10px;
  background: #fff;
  border: 1px solid #f0e2d8;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.goods-card-img-wrap {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  background: #f5f3f0;
}
.goods-card-img { width: 100%; height: 100%; object-fit: cover; }
.goods-card-img-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.goods-card-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.goods-card-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  cursor: pointer;
}
.goods-card-meta { display: flex; align-items: baseline; gap: 8px; }
.goods-card-price { font-size: 15px; font-weight: 700; color: #e8573a; }
.goods-card-sales { font-size: 11px; color: #9a9aae; }
.goods-card-actions { display: flex; gap: 8px; margin-top: 2px; }
.goods-act {
  font-size: 12px;
  padding: 3px 12px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
}
.goods-act.detail { border: 1px solid #d0ccc8; color: #5a5a6e; }
.goods-act.cart { background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%); color: #fff; }
.goods-act.cart.disabled { opacity: 0.6; }

/* ── 订单卡片 ── */
.order-cards { display: flex; flex-direction: column; gap: 8px; }
.order-card {
  background: #fff;
  border: 1px solid #f0e2d8;
  border-left: 3px solid #667eea;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  cursor: pointer;
}
.order-card-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.order-card-no { font-size: 13px; font-weight: 600; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-card-status { font-size: 12px; color: #f39c12; font-weight: 600; flex-shrink: 0; }
.order-card-row.sub { margin-top: 4px; font-size: 12px; color: #5a5a6e; }
.order-card-foot {
  margin-top: 6px;
  font-size: 11px;
  color: #9a9aae;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

/* ── AI 待执行操作确认卡片 ── */
.pending-ops {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pending-op-card {
  background: #fff;
  border: 1px solid #f0e2d8;
  border-left: 3px solid #e8573a;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.op-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.op-type-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 8px;
  background: rgba(232,87,58,0.1);
  color: #e8573a;
  flex-shrink: 0;
}
.op-title {
  font-size: 11px;
  color: #9a9aae;
}
.op-display {
  font-size: 13px;
  color: #1a1a2e;
  line-height: 1.5;
  word-break: break-word;
  margin-bottom: 8px;
}
.op-actions {
  display: flex;
  gap: 8px;
}
.op-btn {
  flex: 1;
  height: 32px;
  border: none;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}
.op-btn:active {
  transform: scale(0.96);
}
.op-btn:disabled {
  opacity: 0.5;
}
.op-btn-confirm {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
}
.op-btn-cancel {
  background: #f5f3f0;
  color: #5a5a6e;
}
.op-result {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  padding: 6px 0 2px;
}
.op-result.is-done {
  color: #07c160;
}
.op-result.is-cancelled {
  color: #9a9aae;
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
