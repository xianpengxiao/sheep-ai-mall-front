import request from '../utils/request.js'

/** 商家坐席：AI 服务额度（未开通时额度字段为 null） */
export function getCsQuota() {
  return request.get('/merchant/cs/quota')
}
