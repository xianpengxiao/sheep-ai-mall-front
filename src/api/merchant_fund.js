import request from '../utils/request.js'

/* =================== 结算账户 =================== */
export function getAccount() {
  return request.get('/merchant/fund/account')
}
export function saveAccount(data) {
  return request.put('/merchant/fund/account', data)
}
export function getBalance() {
  return request.get('/merchant/fund/balance')
}

/* =================== 提现 =================== */
export function submitWithdraw(amount) {
  return request.post('/merchant/fund/withdraw', { amount })
}
export function getWithdrawPage(params) {
  return request.get('/merchant/fund/withdraw/page', { params })
}

/* =================== 资金流水 =================== */
export function getFundFlowPage(params) {
  return request.get('/merchant/fund/flow/page', { params })
}

/* =================== 分佣明细 =================== */
export function getCommissionPage(params) {
  return request.get('/merchant/fund/commission/page', { params })
}

/* =================== 经营报表 =================== */
export function getReport(params) {
  return request.get('/merchant/fund/report', { params })
}
