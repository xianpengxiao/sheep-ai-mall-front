import request from '../utils/request.js'

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
