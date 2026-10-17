import request from '../utils/request.js'

/** 获取会话列表（config 可选，轮询时传 { silent: true } 静默错误提示） */
export function getSessions(config) {
  return request.get('/ai/chat/sessions', config)
}

/** 获取会话消息历史（config 可选，轮询时传 { silent: true } 静默错误提示） */
export function getMessages(sessionId, config) {
  return request.get(`/ai/chat/sessions/${sessionId}/messages`, config)
}

/** 转人工客服 */
export function transferToHuman(sessionId) {
  return request.post('/ai/chat/transfer', { sessionId })
}

/** 删除会话 */
export function deleteSession(sessionId) {
  return request.delete(`/ai/chat/sessions/${sessionId}`)
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
export function sendMessageStream(sessionId, content, merchantId) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const body = { sessionId: sessionId || null, content }
  if (merchantId) body.merchantId = merchantId

  return fetch(`${import.meta.env.VITE_API_BASE || '/api'}/ai/chat/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

/** 确认/取消 AI 待执行操作（改地址/取消订单/加购物车） */
export function confirmOperation(operationId, approve) {
  return request.post('/ai/chat/confirm', { operationId, approve })
}

/** 商品卡片"加入购物车"：仅生成待确认操作单（走确认闸），返回 {operationId, displayText, opType} */
export function createAddCartOp({ skuId, quantity, sessionId }) {
  return request.post('/ai/chat/add-cart-op', { skuId, quantity, sessionId })
}
