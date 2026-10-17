import request from '../utils/request.js'

/** 平台坐席：客服会话列表（config 可选，轮询传 { silent: true }） */
export function getAdminCsSessions(config) {
  return request.get('/admin/cs/sessions', config)
}

/** 平台坐席：会话消息历史 */
export function getAdminCsMessages(sessionId, config) {
  return request.get(`/admin/cs/sessions/${sessionId}/messages`, config)
}

/** 平台坐席：人工回复 */
export function replyAdminCs(sessionId, content) {
  return request.post(`/admin/cs/sessions/${sessionId}/reply`, { content })
}

/** 平台坐席：接入会话（接管人工回复） */
export function takeoverAdminCs(sessionId) {
  return request.put(`/admin/cs/sessions/${sessionId}/takeover`)
}

/** 平台坐席：转回 AI 接待 */
export function toAiAdminCs(sessionId) {
  return request.put(`/admin/cs/sessions/${sessionId}/to-ai`)
}

/** 平台坐席：人工转接（AI态会话切入人工态） */
export function toHumanAdminCs(sessionId) {
  return request.put(`/admin/cs/sessions/${sessionId}/to-human`)
}

/** 客服全局配置（总开关/平台AI开关/额度等单行配置） */
export function getAdminCsConfig() {
  return request.get('/admin/cs/config')
}

/** AI自动接待总开关（1=开 0=关；关闭时全部会话人工，商家开关被覆盖但保留） */
export function setAdminAiEnabled(enabled) {
  return request.put('/admin/cs/ai-enabled', null, { params: { enabled } })
}

/** 平台会话AI接待开关（1=官方客服新会话AI接待 0=默认人工） */
export function setAdminPlatformAiEnabled(enabled) {
  return request.put('/admin/cs/platform-ai-enabled', null, { params: { enabled } })
}
