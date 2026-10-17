import request from '../utils/request.js'

/** 商家坐席：待接入/进行中的客服会话列表（config 可选，轮询传 { silent: true }） */
export function getCsSessions(config) {
  return request.get('/merchant/cs/sessions', config)
}

/** 商家坐席：会话消息历史 */
export function getCsMessages(sessionId, config) {
  return request.get(`/merchant/cs/sessions/${sessionId}/messages`, config)
}

/** 商家坐席：人工回复 */
export function replyCs(sessionId, content) {
  return request.post(`/merchant/cs/sessions/${sessionId}/reply`, { content })
}

/** 商家坐席：接入会话（接管人工回复） */
export function takeoverCs(sessionId) {
  return request.put(`/merchant/cs/sessions/${sessionId}/takeover`)
}

/** 商家坐席：转回 AI 接待 */
export function toAiCs(sessionId) {
  return request.put(`/merchant/cs/sessions/${sessionId}/to-ai`)
}

/** 商家坐席：AI 服务额度（未开通时额度字段为 null） */
export function getCsQuota() {
  return request.get('/merchant/cs/quota')
}
