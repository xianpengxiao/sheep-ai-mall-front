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
        <!-- 上拉加载更早 -->
        <div v-if="timelineLoading && messages.length > 0" class="timeline-loading">
          <van-loading size="16" color="#c8c4c0" /> <span>加载更早的消息...</span>
        </div>
        <div v-else-if="!timelineHasMore && messages.length > 0" class="timeline-top-hint">没有更早的消息了</div>

        <!-- 空状态 -->
        <div v-if="messages.length === 0 && !streaming" class="msg-empty">
          <van-icon name="service-o" size="48" color="#e0dcd8" />
          <span class="empty-title">有什么可以帮你的？</span>
          <span class="empty-hint">输入你的问题，AI 助手将为你解答</span>
          <div class="quick-questions">
            <span class="quick-chip" v-for="q in quickQuestions" :key="q" @click="handleQuickSend(q)">{{ q }}</span>
          </div>
        </div>

        <!-- 消息气泡（微信样式：按需插入时间分隔条） -->
        <template v-for="(msg, idx) in messages" :key="msg.id ?? idx">
          <div v-if="showTimeDivider(idx)" class="time-divider">{{ formatDividerTime(msg.createTime) }}</div>
        <div
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
            <div class="msg-bubble" v-if="!msg.hideText" :class="{ 'bubble-user': msg.role === 0, 'bubble-ai': msg.role === 1, 'bubble-human': msg.role === 2 || msg.role === 3 }">
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
                <div v-else class="op-result" :class="op.state === 'done' ? 'is-done' : (op.state === 'expired' ? 'is-expired' : 'is-cancelled')">
                  {{ op.state === 'done' ? '✓ 已执行' : op.state === 'expired' ? '已过期' : '已取消' }}
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
                    <span class="goods-act buy" :class="{ disabled: g._acting }" @click="buyFromCard(msg, g)">
                      {{ g._acting ? '处理中...' : '购买' }}
                    </span>
                    <span class="goods-act cart" :class="{ disabled: g._acting }" @click="addCartFromCard(msg, g)">
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
                <!-- 商品明细行（最多 2 条 + 等N件），点击直达商品详情 -->
                <div v-if="o.items && o.items.length" class="order-card-items">
                  <div v-for="(it, ii) in o.items" :key="'i' + ii" class="order-item-row" @click.stop="goGoods(it.spuId)">
                    <img v-if="it.image" :src="it.image" class="order-item-img" alt="" />
                    <div v-else class="order-item-img-ph"><van-icon name="photo-o" size="14" color="#c8c4c0" /></div>
                    <div class="order-item-info">
                      <div class="order-item-name">{{ it.name }}</div>
                      <div class="order-item-spec">{{ it.skuName || '' }} x{{ it.quantity }}</div>
                    </div>
                  </div>
                  <div v-if="o.itemCount > o.items.length" class="order-item-more">等 {{ o.itemCount }} 件商品</div>
                </div>
                <div class="order-card-row sub">
                  <span>金额 ¥{{ o.totalAmount }}</span>
                  <span>{{ formatTime(o.createTime) }}</span>
                </div>
                <div class="order-card-foot">
                  <span>查看详情 <van-icon name="arrow" size="12" /></span>
                  <span v-if="canAfterSale(o)" class="order-card-act" @click.stop="openAfterSalePicker(msg, o)">申请售后</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 用户头像 -->
          <div v-if="msg.role === 0" class="msg-avatar user-avatar">
            <van-icon name="user-o" size="18" color="#fff" />
          </div>
        </div>
        </template>

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

      <!-- 咨询商品悬浮条（淘宝同款：进入展示不发送，滚动让位，点发送才成消息） -->
      <div v-if="consultGoods && !consultHidden" class="consult-goods-bar">
        <img v-if="consultGoods.image" :src="consultGoods.image" class="consult-goods-img" alt="" />
        <div v-else class="consult-goods-img consult-goods-img-ph"><van-icon name="photo-o" size="16" color="#c8c4c0" /></div>
        <div class="consult-goods-info" @click="goGoods(consultGoods.spuId)">
          <div class="consult-goods-name">{{ consultGoods.name }}</div>
          <div v-if="consultGoods.price" class="consult-goods-price">¥{{ consultGoods.price }}</div>
        </div>
        <span class="consult-goods-send" @click="sendConsultGoods">发送</span>
        <van-icon name="cross" size="14" color="#9a9aae" class="consult-goods-close" @click="closeConsultGoods" />
      </div>

      <!-- 工具执行状态条（查询中提示，仅流式期间展示，不入消息内容） -->
      <div v-if="streaming && toolStatus" class="tool-status-bar">
        <van-loading size="13" color="#e8573a" />
        <span>{{ toolStatus }}</span>
      </div>

      <!-- 底部输入栏 -->
      <div class="input-bar">
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

    <!-- ═══ 商品卡片加购：规格/数量选择弹层 ═══ -->
    <van-popup v-model:show="skuPicker.show" position="bottom" round safe-area-inset-bottom>
      <div class="sku-picker">
        <div class="sku-picker-title">选择规格</div>
        <div class="sku-picker-list">
          <div
            v-for="s in skuPicker.skus"
            :key="s.skuId"
            class="sku-option"
            :class="{ active: String(skuPicker.selected) === String(s.skuId) }"
            @click="skuPicker.selected = s.skuId"
          >
            <div class="sku-option-main">
              <span class="sku-option-name">{{ s.skuName || '默认规格' }}</span>
              <span class="sku-option-price">¥{{ s.price ?? '?' }}</span>
            </div>
            <span class="sku-option-stock">库存 {{ s.stock ?? '-' }}</span>
          </div>
        </div>
        <div class="sku-picker-qty">
          <span class="sku-picker-qty-label">数量</span>
          <van-stepper v-model="skuPicker.quantity" min="1" :max="Math.max(1, Math.min((skuPicker.skus.find(x => String(x.skuId) === String(skuPicker.selected)) || {}).stock ?? 99, 99))" integer />
        </div>
        <button class="sku-picker-confirm" @click="confirmSkuPicker">{{ skuPicker.mode === 'buy' ? '下一步：选地址' : '加入购物车' }}</button>
      </div>
    </van-popup>

    <!-- ═══ 商品卡片购买：收货地址选择弹层 ═══ -->
    <van-popup v-model:show="addressPicker.show" position="bottom" round safe-area-inset-bottom>
      <div class="sku-picker">
        <div class="sku-picker-title">选择收货地址</div>
        <div class="sku-picker-list">
          <div
            v-for="a in addressPicker.list"
            :key="a.id"
            class="sku-option"
            :class="{ active: String(addressPicker.selected) === String(a.id) }"
            @click="addressPicker.selected = a.id"
          >
            <div class="sku-option-main">
              <span class="sku-option-name">{{ a.receiverName }} {{ a.receiverPhone }}</span>
            </div>
            <span class="sku-option-stock">{{ a.province }}{{ a.city }}{{ a.district }} {{ a.detailAddress }}</span>
          </div>
        </div>
        <button class="sku-picker-confirm" @click="confirmAddressPicker">生成订单（确认后待支付）</button>
      </div>
    </van-popup>

    <!-- ═══ 订单卡片申请售后：类型（按订单状态收敛）+ 原因弹层 ═══ -->
    <van-popup v-model:show="afterSalePicker.show" position="bottom" round safe-area-inset-bottom>
      <div class="sku-picker">
        <div class="sku-picker-title">申请售后 · 订单 {{ afterSalePicker.order?.orderNo }}</div>
        <div class="sku-picker-list">
          <div
            v-for="opt in afterSaleTypeOptions"
            :key="opt.value"
            class="sku-option"
            :class="{ active: afterSalePicker.type === opt.value }"
            @click="afterSalePicker.type = opt.value"
          >
            <div class="sku-option-main">
              <span class="sku-option-name">{{ opt.label }}</span>
              <span class="sku-option-stock">{{ opt.desc }}</span>
            </div>
          </div>
        </div>
        <van-field
          v-model="afterSalePicker.reason"
          type="textarea"
          rows="2"
          maxlength="200"
          placeholder="请描述售后原因，如商品质量问题、七天无理由等"
          class="as-reason-field"
        />
        <button class="sku-picker-confirm" @click="confirmAfterSalePicker">提交售后申请</button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import NavBar from '../../components/NavBar.vue'
import { getMessages, sendMessageStream, confirmOperation, transferToHuman, createAddCartOp, createOrderOp, createAfterSaleOp, getPendingOpStates, getGoodsSkus, getTimeline, getSessions, reportViewing } from '../../api/chat.js'
import { getAddressList } from '../../api/address.js'
import { getSpuDetail } from '../../api/goods.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

// ── 商家客服入口（从店铺页跳转携带 ?merchantId=xx&shopName=xx） ──
// 商家入口语义：会话列表只含该商家会话（后端按对象隔离），单会话模型自动续接，不提供"新建"
// 未开通/已过期的商家由后端直接按商家人工接待（会话归属不回落平台），前端无需回落处理
const merchantId = ref(null)
const shopName = ref('')

function syncShopQuery() {
  merchantId.value = route.query.merchantId || null
  shopName.value = route.query.shopName || ''
}

// ── 页面状态 ──
const pageLoading = ref(false)
const inputText = ref('')
const streaming = ref(false)
// 工具执行状态（SSE TOOL_STATUS 帧驱动，仅流式期间展示，不入消息）
const toolStatus = ref('')
const msgListRef = ref(null)
const scrollAnchorRef = ref(null)

// ── 聊天对象（单时间线：平台或某商家的全部消息一条连续时间线） ──
const currentSessionId = ref(null)
const sessionServiceMode = ref(null)
const messages = ref([])
const timelineHasMore = ref(false)
const timelineLoading = ref(false)

// ── 快捷问题 ──
const quickQuestions = ['如何退货？', '发货时效是多久？', '如何联系客服？', '如何修改收货地址？']

// ── 人工态 ──
// 仅由"用户主动转人工成功"或"当前会话服务模式为人工"驱动；
// 不能用历史消息推断——人工消息会永久留在记录里，坐席转回 AI 后会导致人工态无法退出
const manualHuman = ref(false)
const humanMode = computed(() =>
  manualHuman.value
  || (currentSessionId.value && sessionServiceMode.value === 1)
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
  // （会话列表接口仅用于轻量同步 serviceMode；单时间线下不再展示会话列表）
  try {
    const data = await getSessions({ silent: true, params: merchantId.value ? { merchantId: merchantId.value } : {} })
    const cur = (data || []).find(s => String(s.id) === String(currentSessionId.value))
    if (cur) sessionServiceMode.value = cur.serviceMode
    if (cur && cur.serviceMode !== 1) manualHuman.value = false
  } catch { /* 静默轮询失败 */ }
}

/** 增量合并轮询结果：按消息 id 去重追加；本地无 id 消息（SSE 占位/刚发送）按 角色+内容 匹配补 id */
function mergeMessages(fetched) {
  const existIds = new Set(messages.value.filter(m => m.id != null).map(m => String(m.id)))
  let appended = false
  let hasAgentReply = false
  for (const raw of fetched) {
    const msg = { id: raw.id ?? null, role: raw.role, content: raw.content || '', createTime: raw.createTime || null }
    // 轮询拉到的 AI 消息同样解析剔除 PENDING_OP 标记
    if (msg.role === 1) extractPendingOps(msg)
    // toolCalls 结构化数据（卡片/操作单随消息持久化）优先恢复
    applyToolCalls(msg, raw.toolCalls)
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
    // 新拉到带操作单的历史消息时回查状态，恢复确认卡
    restorePendingOpStates()
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
  sessionServiceMode.value = null
  messages.value = []
  timelineHasMore.value = false
  inputText.value = ''
  manualHuman.value = false
  consultLoadedSpuId = null
  consultGoods.value = null
  consultClosed = false
  consultHidden.value = false
  clearViewingReport()  // 切换聊天对象：清除旧对象的浏览状态
  stopHumanPoll()
  // 停止正在进行的流式请求
  if (abortController) {
    abortController.abort()
    abortController = null
    streaming.value = false
    toolStatus.value = ''
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
onDeactivated(() => {
  chatActive = false
  clearViewingReport()  // 离开页面：清除"正在浏览"状态
})

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
  loadTimeline().then(loadConsultGoods)
})

// 聊天对象切换（平台/商家入口 query 变化，keep-alive 下实例复用）：重载时间线
watch(() => route.query.merchantId, () => {
  if (lastUserId === null) return
  resetChat()
  syncShopQuery()
  loadTimeline().then(loadConsultGoods)
})

// ── 咨询商品悬浮条（淘宝同款：进入展示不发送；点「发送」才成为消息；滚动让位；打字时隐式带给 AI） ──
// consultGoods: 当前悬浮商品；consultHidden: 滚动让位/关闭隐藏；consultClosed: 用户主动关闭（本次进入不再现）
const consultGoods = ref(null)
const consultHidden = ref(false)
let consultClosed = false
let consultLoadedSpuId = null

/** 加载悬浮商品条（仅商家入口且未发送过同商品卡片时） */
async function loadConsultGoods() {
  const spuId = route.query.spuId ? String(route.query.spuId) : null
  if (!spuId || !merchantId.value || consultLoadedSpuId === spuId) return
  consultLoadedSpuId = spuId
  // 时间线已有同商品咨询卡片（之前已点过发送）→ 不再展示商品条
  const exists = messages.value.some(m =>
    m.role === 0 && (m.goodsCards || []).some(g => String(g.spuId) === spuId))
  if (exists) return
  try {
    const spu = await getSpuDetail(spuId)
    if (spu && spu.id) {
      consultGoods.value = {
        spuId: String(spu.id),
        name: spu.name || route.query.spuName || '该商品',
        // 商品详情接口价格字段为 price（minPrice 是列表口径，兜底兼容）
        price: spu.price ?? spu.minPrice ?? null,
        image: spu.mainImage || '',
      }
      consultHidden.value = false
      consultClosed = false
      // 上报"正在浏览"：商家坐席工作台横幅展示（失败静默）
      reportViewing(merchantId.value, spuId)
    }
  } catch { /* 商品加载失败则不展示商品条 */ }
}

/** 清除浏览状态上报（关闭/发送/离开/切换对象时调用；无浏览状态时为无害空操作） */
function clearViewingReport() {
  if (merchantId.value) reportViewing(merchantId.value, null)
}

/** 点「发送」：商品卡片作为用户消息发出（走正常对话管线，AI 据此应答，坐席可见） */
function sendConsultGoods() {
  if (!consultGoods.value || streaming.value) return
  const g = consultGoods.value
  consultGoods.value = null
  clearViewingReport()
  handleSend(`我正在咨询商品：${g.name}`, g.spuId,
    { spuId: g.spuId, name: g.name, price: g.price, image: g.image })
}

/** 关闭商品条（本次进入不再展示） */
function closeConsultGoods() {
  consultGoods.value = null
  consultClosed = true
  clearViewingReport()
}

// ── 单时间线加载（首屏/上拉分页；beforeId 游标） ──
/** 消息统一恢复：解析操作单标记 + toolCalls 结构化数据（卡片/操作单）；createTime 用于微信样式时间分隔条 */
function toViewMessage(raw) {
  const msg = { id: raw.id ?? null, role: raw.role, content: raw.content || '', createTime: raw.createTime || null }
  if (msg.role === 1) extractPendingOps(msg)
  applyToolCalls(msg, raw.toolCalls)
  return msg
}

async function loadTimeline(beforeId = null) {
  if (timelineLoading.value) return
  timelineLoading.value = true
  if (!beforeId) pageLoading.value = true
  try {
    const data = await getTimeline({
      merchantId: merchantId.value || undefined,
      beforeId: beforeId || undefined,
      size: 20,
    })
    const list = (data?.messages || []).map(toViewMessage)
    if (!beforeId) {
      // 首屏/切换对象：整体替换
      messages.value = list
      currentSessionId.value = data?.currentSessionId ?? null
      sessionServiceMode.value = data?.currentSessionServiceMode ?? null
      await restorePendingOpStates()
      // 先结束加载态让消息区渲染（v-else 分支挂载 scroll anchor），再滚到底部；
      // 原实现滚动时 pageLoading 仍为 true，锚点不在 DOM 中导致滚动无效、停留在顶部
      pageLoading.value = false
      await nextTick()
      await scrollToBottom(false)
      // 卡片/图片渲染可能引起二次布局，再兜底滚一次
      setTimeout(() => scrollToBottom(false), 150)
    } else {
      // 上拉：前插更早一页（保持滚动位置）
      const el = msgListRef.value
      const prevHeight = el ? el.scrollHeight : 0
      const existIds = new Set(messages.value.filter(m => m.id != null).map(m => String(m.id)))
      const older = list.filter(m => m.id == null || !existIds.has(String(m.id)))
      messages.value = [...older, ...messages.value]
      await nextTick()
      if (el) el.scrollTop = el.scrollHeight - prevHeight
    }
    timelineHasMore.value = !!data?.hasMore
  } catch {
    if (!beforeId) showToast('加载消息失败')
  } finally {
    timelineLoading.value = false
    pageLoading.value = false
  }
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
    messages.value.push({ role: 1, content: '已为您转接人工客服，人工客服将尽快接入，请稍候。', createTime: new Date().toISOString() })
    await scrollToBottom()
    refreshHumanPoll() // 立即启动人工态轮询
  } catch { /* 错误已由拦截器 toast */ }
}

// ── 发送消息 ──
// overrideText/contextSpuId：商品条「发送」用（卡片消息）；consultCard：本地即时渲染的卡片数据
async function handleSend(overrideText = null, contextSpuId = null, consultCard = null) {
  // 模板事件直绑（@click/@keydown.enter）会把事件对象传进来，仅接受字符串覆盖
  const text = (typeof overrideText === 'string' && overrideText.trim()) ? overrideText.trim() : inputText.value.trim()
  if (!text || streaming.value) return

  // 添加用户消息到列表（咨询卡片消息：本地即挂卡片 + 隐藏文字气泡，与服务端 hideText 持久化口径一致）
  messages.value.push({
    role: 0, content: text, createTime: new Date().toISOString(),
    hideText: !!consultCard,
    goodsCards: consultCard ? [consultCard] : undefined,
  })
  inputText.value = ''
  await scrollToBottom()

  // 开始 SSE 流式接收
  streaming.value = true
  abortController = new AbortController()

  // 先添加一个空的 AI 消息占位
  const aiMsgIdx = messages.value.length
  messages.value.push({ role: 1, content: '', createTime: new Date().toISOString() })
  await scrollToBottom()

  try {
    // 已有会话时沿用会话归属，merchantId 不生效
    const merId = currentSessionId.value ? null : merchantId.value
    // 商品条展示中的手动输入（非点「发送」）：隐式携带当前商品给 AI，不落卡片
    const implicitSpuId = (!contextSpuId && consultGoods.value) ? consultGoods.value.spuId : null
    const response = await sendMessageStream(currentSessionId.value, text, merId, contextSpuId, implicitSpuId)

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

          // 工具状态帧（[[TOOL_STATUS:…]]）：只更新打字区状态文本，不进入消息内容/历史
          if (line.startsWith('[[TOOL_STATUS:') && line.endsWith(']]')) {
            toolStatus.value = line.slice('[[TOOL_STATUS:'.length, -2)
            continue
          }

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
            // 首个真实文本帧到达：清除工具状态提示
            toolStatus.value = ''
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

    // 新会话首帧建立了会话：更新 currentSessionId（SSE 头已在上文处理）
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
    toolStatus.value = ''
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

// ── toolCalls 结构化恢复：卡片/操作单随消息持久化（chat_message.tool_calls），刷新后恢复 ──
function applyToolCalls(msg, rawToolCalls) {
  if (!rawToolCalls) return
  let tc = null
  try { tc = typeof rawToolCalls === 'string' ? JSON.parse(rawToolCalls) : rawToolCalls } catch { return }
  if (!tc || typeof tc !== 'object') return
  // 商品/订单卡片所有角色通用（用户消息也可挂咨询商品卡片）；待确认操作单仅 AI 消息
  if (Array.isArray(tc.goodsCards) && tc.goodsCards.length) msg.goodsCards = tc.goodsCards.slice(0, 2)
  if (Array.isArray(tc.orderCards) && tc.orderCards.length) msg.orderCards = tc.orderCards.slice(0, 2)
  // 咨询商品消息：只展示卡片，隐藏文字气泡（文本仅作 LLM 上下文与坐席端阅读）
  if (tc.hideText) msg.hideText = true
  if (msg.role !== 1) return
  if (Array.isArray(tc.pendingOps) && tc.pendingOps.length) {
    msg.pendingOps = tc.pendingOps.map(op => ({
      operationId: op.operationId,
      displayText: op.displayText || '',
      opType: op.opType || '',
      state: '', // 状态由 restorePendingOpStates 回查后回填
      loading: false,
    }))
  }
}

const OP_STATE_MAP = { DONE: 'done', CANCELLED: 'cancelled', EXPIRED: 'expired' }

/** 回查所有待确认操作单的最新状态并回填（刷新/轮询后恢复确认卡状态；失败静默，确认时服务端有最终校验） */
async function restorePendingOpStates() {
  const ids = []
  for (const msg of messages.value) {
    if (msg.pendingOps) {
      for (const op of msg.pendingOps) {
        if (op.operationId && !op.state) ids.push(op.operationId)
      }
    }
  }
  if (!ids.length) return
  try {
    const states = await getPendingOpStates([...new Set(ids)])
    for (const msg of messages.value) {
      if (!msg.pendingOps) continue
      for (const op of msg.pendingOps) {
        if (!op.state && states && states[op.operationId]) {
          op.state = OP_STATE_MAP[states[op.operationId]] || ''
        }
      }
    }
  } catch { /* 静默 */ }
}

/** 商品卡片跳转详情页 */
function goGoods(spuId) {
  if (spuId) router.push(`/goods/${spuId}`)
}

/** 订单卡片跳转订单详情 */
function goOrder(orderId) {
  if (orderId) router.push(`/order/detail/${orderId}`)
}

// ── 商品卡片"加入购物车"：规格/数量选择 ──
// 单在售规格直接生成操作单；多在售规格弹规格选择层（规格名/价格/库存，缺货禁选）+ 数量步进器。
const skuPicker = ref({ show: false, skus: [], selected: null, quantity: 1, mode: 'cart', target: null })

async function addCartFromCard(msg, g) {
  if (g._acting) return
  g._acting = true
  g._adding = true
  try {
    const list = await getGoodsSkus(g.spuId)
    const skus = (list || []).filter(s => s.stock == null || s.stock > 0)
    if (!skus.length) { showToast('该商品暂无在售规格'); return }
    if (skus.length === 1) {
      await createCartOpFromCard(msg, g, skus[0], 1)
      return
    }
    skuPicker.value = { show: true, skus, selected: skus[0].skuId, quantity: 1, mode: 'cart', target: { msg, g } }
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { g._acting = false; g._adding = false }
}

// ── 商品卡片"购买"：规格/数量 → 收货地址 → 生成 CREATE_ORDER 待确认操作单 ──
const addressPicker = ref({ show: false, list: [], selected: null, pending: null })

async function buyFromCard(msg, g) {
  if (g._acting) return
  g._acting = true
  try {
    const list = await getGoodsSkus(g.spuId)
    const skus = (list || []).filter(s => s.stock == null || s.stock > 0)
    if (!skus.length) { showToast('该商品暂无在售规格'); return }
    if (skus.length === 1) {
      await openAddressPicker({ msg, g, sku: skus[0], qty: 1 })
      return
    }
    skuPicker.value = { show: true, skus, selected: skus[0].skuId, quantity: 1, mode: 'buy', target: { msg, g } }
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { g._acting = false }
}

/** 规格选择弹层确认：加购直接建单；购买继续选收货地址 */
async function confirmSkuPicker() {
  const picker = skuPicker.value
  const sku = picker.skus.find(s => String(s.skuId) === String(picker.selected))
  if (!sku) return
  const maxQty = Math.max(1, Math.min(sku.stock ?? 99, 99))
  const qty = Math.min(Math.max(1, picker.quantity || 1), maxQty)
  picker.show = false
  if (picker.mode === 'buy') {
    await openAddressPicker({ msg: picker.target.msg, g: picker.target.g, sku, qty })
  } else {
    await createCartOpFromCard(picker.target.msg, picker.target.g, sku, qty)
  }
}

/** 打开收货地址选择层（默认选中默认地址） */
async function openAddressPicker(pending) {
  let addresses = []
  try {
    addresses = await getAddressList() || []
  } catch { /* 统一 toast */ }
  if (!addresses.length) {
    showToast('请先添加收货地址')
    router.push('/address/edit')
    return
  }
  const def = addresses.find(a => a.isDefault === 1) || addresses[0]
  addressPicker.value = { show: true, list: addresses, selected: def.id, pending }
}

/** 地址确认：生成 CREATE_ORDER 待确认操作单并挂到所属消息 */
async function confirmAddressPicker() {
  const picker = addressPicker.value
  const { msg, g, sku, qty } = picker.pending || {}
  if (!sku) return
  picker.show = false
  g._acting = true
  try {
    const marker = await createOrderOp({
      spuId: g.spuId,
      skuId: sku.skuId,
      quantity: qty,
      addressId: picker.selected,
      sessionId: currentSessionId.value,
    })
    if (!msg.pendingOps) msg.pendingOps = []
    msg.pendingOps.push({
      operationId: marker.operationId,
      displayText: marker.displayText || `创建待支付订单：${g.name}`,
      opType: marker.opType || 'CREATE_ORDER',
      state: '',
      loading: false,
    })
    await scrollToBottom()
  } catch { /* 业务失败由 request.js 统一 toast */ }
  finally { g._acting = false }
}

// ── 订单卡片"申请售后"：弹层选类型（按订单状态收敛）+ 原因 → AFTER_SALE 待确认操作单 ──
const AS_TYPE_OPTIONS = {
  REFUND_ONLY: { value: 'REFUND_ONLY', label: '仅退款', desc: '未发货，直接退款' },
  RETURN_REFUND: { value: 'RETURN_REFUND', label: '退货退款', desc: '退回商品，商家确认后退款' },
  EXCHANGE: { value: 'EXCHANGE', label: '换货', desc: '商家寄出新商品' },
}
const afterSalePicker = ref({ show: false, order: null, msg: null, type: '', reason: '' })

/** 仅待发货/待收货/已完成订单可申请售后；本卡片已提交过（内存标记 + localStorage 持久化）则不再显示 */
function canAfterSale(o) {
  if (!o || o._afterSaleSubmitted) return false
  if (Number(o.status) !== 1 && Number(o.status) !== 2 && Number(o.status) !== 3) return false
  // 已退款 / 售后中的订单禁止重复申请（服务端 validate 为准，前端仅隐藏入口）
  if (Number(o.refundStatus) === 2) return false
  if (o.afterSalePending) return false
  try {
    if (localStorage.getItem('cs:as:submitted:' + o.orderId)) return false
  } catch { /* localStorage 不可用时仅靠内存标记 */ }
  return true
}

const afterSaleTypeOptions = computed(() => {
  const status = Number(afterSalePicker.value.order?.status)
  if (status === 1) return [AS_TYPE_OPTIONS.REFUND_ONLY]
  if (status === 2 || status === 3) return [AS_TYPE_OPTIONS.RETURN_REFUND, AS_TYPE_OPTIONS.EXCHANGE]
  return []
})

function openAfterSalePicker(msg, order) {
  const opts = Number(order.status) === 1
    ? [AS_TYPE_OPTIONS.REFUND_ONLY]
    : [AS_TYPE_OPTIONS.RETURN_REFUND, AS_TYPE_OPTIONS.EXCHANGE]
  afterSalePicker.value = { show: true, order, msg, type: opts[0]?.value || '', reason: '' }
}

/** 提交售后操作单：生成 AFTER_SALE 待确认操作单并挂到所属消息 */
async function confirmAfterSalePicker() {
  const picker = afterSalePicker.value
  if (!picker.order || !picker.type) return
  if (!picker.reason?.trim()) { showToast('请填写申请原因'); return }
  picker.show = false
  const msg = picker.msg
  try {
    const marker = await createAfterSaleOp({
      orderId: picker.order.orderId,
      type: picker.type,
      reason: picker.reason.trim(),
      sessionId: currentSessionId.value,
    })
    if (!msg.pendingOps) msg.pendingOps = []
    msg.pendingOps.push({
      operationId: marker.operationId,
      displayText: marker.displayText || '申请售后',
      opType: marker.opType || 'AFTER_SALE',
      state: '',
      loading: false,
    })
    showToast('已生成售后申请，请在下方确认卡中确认')
    picker.order._afterSaleSubmitted = true
    try { localStorage.setItem('cs:as:submitted:' + picker.order.orderId, '1') } catch { /* 忽略 */ }
    await scrollToBottom()
  } catch { /* 业务失败由 request.js 统一 toast（如状态不允许/已有售后单） */ }
}

/** 创建加购待确认操作单并挂到所属消息（复用确认卡 UI，走确认闸） */
async function createCartOpFromCard(msg, g, sku, quantity) {
  g._adding = true
  try {
    const marker = await createAddCartOp({
      skuId: sku.skuId,
      quantity,
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
    CREATE_ORDER: '创建订单',
    AFTER_SALE: '申请售后',
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

// ── 滚动到底部 ──
async function scrollToBottom(smooth = true) {
  await nextTick()
  scrollAnchorRef.value?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'end' })
}

// ── 上拉分页：滚动到顶部附近时加载更早消息 ──
let scrollThrottleTimer = null
function onScroll() {
  const el = msgListRef.value
  if (!el) return
  // 商品悬浮条滚动让位：离开底部（翻历史）隐藏，回到底部重现（未关闭时）
  if (consultGoods.value && !consultClosed) {
    const distToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    consultHidden.value = distToBottom > 80
  }
  if (timelineLoading.value) return
  if (el.scrollTop > 60) return
  if (!timelineHasMore.value || messages.value.length === 0) return
  if (scrollThrottleTimer) return
  scrollThrottleTimer = setTimeout(() => { scrollThrottleTimer = null }, 400)
  const oldest = messages.value.find(m => m.id != null)
  if (oldest) loadTimeline(oldest.id)
}

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

// ── 微信样式时间分隔条：首条必显；与上一条间隔超 3 分钟才显示新时间条 ──
const TIME_DIVIDER_GAP = 3 * 60 * 1000

function showTimeDivider(idx) {
  const cur = messages.value[idx]
  if (!cur || !cur.createTime) return false
  if (idx === 0) return true
  const prev = messages.value[idx - 1]
  if (!prev || !prev.createTime) return true
  return new Date(cur.createTime) - new Date(prev.createTime) > TIME_DIVIDER_GAP
}

function pad2(n) { return String(n).padStart(2, '0') }

/** 分隔条格式：今天 HH:mm；昨天 昨天 HH:mm；当年 MM-dd HH:mm；跨年 yyyy-MM-dd HH:mm */
function formatDividerTime(isoStr) {
  const d = new Date(isoStr)
  if (isNaN(d)) return ''
  const now = new Date()
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMsgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayDiff = Math.round((startOfToday - startOfMsgDay) / 86400000)
  if (dayDiff === 0) return hm
  if (dayDiff === 1) return `昨天 ${hm}`
  if (d.getFullYear() === now.getFullYear()) return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${hm}`
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${hm}`
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
/* 工具执行状态条：流式期间显示在输入栏上方 */
.tool-status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 12px;
  color: #999;
  background: #faf8f5;
  border-top: 1px solid #f0ece8;
}

/* 咨询商品悬浮条（淘宝同款） */
.consult-goods-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 12px 0;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #f0ece8;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.consult-goods-img { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }

.consult-goods-img-ph {
  background: #f5f3f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.consult-goods-info { flex: 1; min-width: 0; }

.consult-goods-name {
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.consult-goods-price { font-size: 13px; color: #e8573a; font-weight: 600; margin-top: 2px; }

.consult-goods-send {
  flex-shrink: 0;
  padding: 5px 14px;
  border-radius: 14px;
  background: #e8573a;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.consult-goods-close { flex-shrink: 0; padding: 4px; cursor: pointer; }

/* 微信样式时间分隔条：居中灰字 */
.time-divider {
  text-align: center;
  font-size: 12px;
  color: #b5b1ac;
  margin: 10px 0 6px;
  user-select: none;
}

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
.timeline-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0 2px;
  font-size: 12px;
  color: #9a9aae;
}
.timeline-top-hint {
  text-align: center;
  padding: 10px 0 2px;
  font-size: 11px;
  color: #c8c4c0;
}
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
.goods-act.buy { border: 1px solid #e8573a; color: #e8573a; }
.goods-act.buy.disabled { opacity: 0.6; }
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
/* 订单卡片商品明细行 */
.order-card-items { margin-top: 6px; border-top: 1px solid #f2f0ec; padding-top: 6px; }
.order-item-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.order-item-img { width: 34px; height: 34px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
.order-item-img-ph {
  width: 34px; height: 34px; border-radius: 4px; background: #f5f3f0;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.order-item-info { flex: 1; min-width: 0; }
.order-item-name {
  font-size: 12px; color: #333; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.order-item-spec {
  font-size: 11px; color: #999; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.order-item-more { font-size: 11px; color: #9a9aae; padding: 2px 0 0 42px; }
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
.op-result.is-expired {
  color: #c8a04a;
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
   规格/数量选择弹层（商品卡片加购）
   ══════════════════════════════════════════════ */
.sku-picker {
  padding: 18px 16px calc(14px + env(safe-area-inset-bottom));
}
.sku-picker-title {
  font-size: 15px;
  font-weight: 600;
  color: #3a3a4a;
  text-align: center;
  margin-bottom: 12px;
}
.sku-picker-list {
  max-height: 40vh;
  overflow-y: auto;
  margin-bottom: 12px;
}
.sku-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 12px;
  border: 1px solid #e8e4e0;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
}
.sku-option.active {
  border-color: #e8573a;
  background: #fdf1ee;
}
.sku-option-main {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.sku-option-name {
  font-size: 14px;
  color: #3a3a4a;
}
.sku-option-price {
  font-size: 14px;
  font-weight: 600;
  color: #e8573a;
}
.sku-option-stock {
  font-size: 12px;
  color: #9a9aae;
}
.sku-picker-qty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px 14px;
}
.sku-picker-qty-label {
  font-size: 14px;
  color: #3a3a4a;
}
.sku-picker-confirm {
  width: 100%;
  border: none;
  border-radius: 22px;
  padding: 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #f06a4a, #e8573a);
  cursor: pointer;
}
.sku-picker-confirm:active {
  opacity: 0.85;
}
.as-reason-field {
  margin-bottom: 12px;
  border: 1px solid #e8e4e0;
  border-radius: 10px;
}
.order-card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.order-card-act {
  color: #e8573a;
  font-weight: 600;
  padding: 2px 10px;
  border: 1px solid #e8573a;
  border-radius: 12px;
  font-size: 12px;
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
