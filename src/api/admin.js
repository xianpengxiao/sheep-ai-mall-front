import request from '../utils/request.js'

// ── 系统管理 ──

export function getAdminUsers(params) {
  return request.get('/admin/users', { params })
}

export function getAllRoles() {
  return request.get('/admin/roles')
}

export function getUserRoleIds(userId) {
  return request.get('/admin/users/' + userId + '/roles')
}

export function assignUserRoles(userId, roleIds) {
  return request.put('/admin/users/' + userId + '/roles', { roleIds })
}

// ── 商品审核 ──

export function getPendingAuditGoods(params) {
  return request.get('/admin/spu/pending-audit', { params })
}

export function auditGoods(spuId, auditStatus, auditMsg) {
  const body = { spuId, auditStatus }
  if (auditMsg) body.auditMsg = auditMsg
  return request.put('/admin/spu/audit', body)
}

// ── 商家管理 ──

/** 商家列表分页 */
export function getMerchantList(params) {
  return request.get('/admin/merchant/page', { params })
}

/** 审核入驻申请（{id} 为 merchant_apply 申请ID） */
export function auditMerchantApply(id, status, auditRemark) {
  const body = { status }
  if (auditRemark) body.auditRemark = auditRemark
  return request.put('/admin/merchant/apply/' + id + '/audit', body)
}

/** 禁用/启用商家（status=1 启用, 2 禁用） */
export function toggleMerchantStatus(id, status) {
  return request.put('/admin/merchant/' + id + '/status', null, { params: { status } })
}

/** 待审核店铺信息变更列表 */
export function getPendingShopChanges(params) {
  return request.get('/admin/merchant/info-change/pending', { params })
}

/** 审核店铺信息变更 */
export function auditShopChange(changeId, auditStatus, auditMsg) {
  return request.put('/admin/merchant/info-change/audit', { changeId, auditStatus, auditMsg })
}

// ── 评价管理 ──

/** 评价分页列表 */
export function getReviewList(params) {
  return request.get('/admin/review/page', { params })
}

/** 隐藏/显示评价 */
export function setReviewStatus(reviewId, status) {
  return request.put('/admin/review/' + reviewId + '/status', null, { params: { status } })
}

/** 删除评价 */
export function deleteReview(reviewId) {
  return request.delete('/admin/review/' + reviewId)
}
