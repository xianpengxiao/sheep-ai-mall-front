import request from '../utils/request.js'

/** 获取会话列表（config 可选，轮询时传 { silent: true } 静默错误提示） */
export function getSessions(config) {
  return request.get('/ai/chat/sessions', config)
}

/** 获取会话消息历史（config 可选，轮询时传 { silent: true } 静默错误提示） */
export function getMessages(sessionId, config) {
  return request.get(`/ai/chat/sessions/${sessionId}/messages`, config)
}

/** 聊天对象聚合时间线（单时间线展示）：beforeId=早于该消息 id（不传=最新一页） */
export function getTimeline({ merchantId, beforeId, size }, config) {
  const params = {}
  if (merchantId) params.merchantId = merchantId
  if (beforeId) params.beforeId = beforeId
  if (size) params.size = size
  return request.get('/ai/chat/messages/timeline', { ...config, params })
}

/** 转人工客服 */
export function transferToHuman(sessionId) {
  return request.post('/ai/chat/transfer', { sessionId })
}

/**
 * 发送消息（SSE 流式）
 * 返回 fetch Response 对象，调用方自行读取 ReadableStream
 * 响应头：
 *   X-Session-Id    会话ID（每次请求都返回）
 *   X-Session-Title 会话标题（有值时返回）
 * @param sessionId 会话ID（null 表示新建会话）
 * @param content   消息内容
 * @param merchantId 商家ID（仅新建会话时生效，进入商家专属客服）
 */
export function sendMessageStream(sessionId, content, merchantId, contextSpuId = null, implicitSpuId = null) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const body = { sessionId: sessionId || null, content }
  if (merchantId) body.merchantId = merchantId
  // 咨询商品上下文：字符串传参规避 19 位雪花 ID 的 JSON 精度丢失
  if (contextSpuId) body.contextSpuId = String(contextSpuId)
  // 隐式浏览商品：商品条展示期间的手动提问携带，仅注入当轮 AI 上下文
  if (implicitSpuId) body.implicitSpuId = String(implicitSpuId)

  return fetch(`${import.meta.env.VITE_API_BASE || '/api'}/ai/chat/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

/** 上报/清除当前浏览商品（spuId 空=清除；商家坐席"正在浏览"横幅数据源；失败静默） */
export function reportViewing(merchantId, spuId) {
  return request.post('/ai/chat/viewing', { merchantId, spuId: spuId || null }).catch(() => {})
}

/** 确认/取消 AI 待执行操作（改地址/取消订单/加购物车） */
export function confirmOperation(operationId, approve) {
  return request.post('/ai/chat/confirm', { operationId, approve })
}

/** 商品卡片"加入购物车"：仅生成待确认操作单（走确认闸），返回 {operationId, displayText, opType} */
export function createAddCartOp({ skuId, quantity, sessionId }) {
  return request.post('/ai/chat/add-cart-op', { skuId, quantity, sessionId })
}

/**
 * 批量查询操作单最新状态（刷新历史确认卡时回显）
 * 返回 { operationId: 'PENDING'|'DONE'|'CANCELLED'|'EXPIRED' }
 */
export function getPendingOpStates(ids) {
  return request.get('/ai/chat/pending-ops/states', { params: { ids: ids.join(',') } })
}

/** 商品卡片规格列表（SKU ID 已字符串化）：加购选规格用，返回 [{skuId, skuName, price, stock}] */
export function getGoodsSkus(spuId) {
  return request.get(`/ai/chat/goods/${spuId}/skus`)
}

/** 商品卡片"购买"：仅生成待确认操作单（CREATE_ORDER，确认后创建待支付订单，不代支付） */
export function createOrderOp({ spuId, skuId, quantity, addressId, sessionId }) {
  return request.post('/ai/chat/create-order-op', { spuId, skuId, quantity, addressId, sessionId })
}

/** 订单卡片"申请售后"：仅生成待确认操作单（AFTER_SALE，确认后创建待处理售后单） */
export function createAfterSaleOp({ orderId, type, reason, sessionId }) {
  return request.post('/ai/chat/after-sale-op', { orderId, type, reason, sessionId })
}
