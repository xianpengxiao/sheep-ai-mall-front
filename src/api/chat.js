import request from '../utils/request.js'

/** 获取会话列表 */
export function getSessions() {
  return request.get('/ai/chat/sessions')
}

/** 获取会话消息历史 */
export function getMessages(sessionId) {
  return request.get(`/ai/chat/sessions/${sessionId}/messages`)
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
 */
export function sendMessageStream(sessionId, content) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(`${import.meta.env.VITE_API_BASE || '/api'}/ai/chat/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId: sessionId || null, content }),
  })
}
