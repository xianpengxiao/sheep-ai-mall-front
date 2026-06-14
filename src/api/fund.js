import request from '../utils/request.js'

/* =================== 1. 结算账户 =================== */
export function getSettlementAccountPage(params) {
  return request.get('/admin/fund/settlement-account/page', { params })
}
export function getSettlementAccount(merchantId) {
  return request.get(`/admin/fund/settlement-account/${merchantId}`)
}
export function updateSettlementAccount(merchantId, data) {
  return request.put(`/admin/fund/settlement-account/${merchantId}`, data)
}

/* =================== 2. 佣金规则 =================== */
export function getCommissionConfigPage(params) {
  return request.get('/admin/fund/commission/config/page', { params })
}
export function createCommissionConfig(data) {
  return request.post('/admin/fund/commission/config', data)
}
export function updateCommissionConfig(id, data) {
  return request.put(`/admin/fund/commission/config/${id}`, data)
}
export function toggleCommissionConfigStatus(id, status) {
  return request.put(`/admin/fund/commission/config/${id}/status`, null, { params: { status } })
}

/* =================== 3. 分佣明细 =================== */
export function getCommissionLogPage(params) {
  return request.get('/admin/fund/commission/log/page', { params })
}

/* =================== 4. 提现审核 =================== */
export function getWithdrawPage(params) {
  return request.get('/admin/fund/withdraw/page', { params })
}
export function auditWithdraw(id, data) {
  return request.put(`/admin/fund/withdraw/${id}/audit`, data)
}
export function confirmWithdraw(id) {
  return request.put(`/admin/fund/withdraw/${id}/confirm`)
}

/* =================== 5. 资金流水 =================== */
export function getFundFlowPage(params) {
  return request.get('/admin/fund/flow/page', { params })
}

/* =================== 6. 对账报表 =================== */
export function getDailyReport(params) {
  return request.get('/admin/fund/report/daily', { params })
}
export function getMerchantReport(params) {
  return request.get('/admin/fund/report/merchant', { params })
}
