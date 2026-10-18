import request from '../utils/request.js'

/** 发起售后申请 */
export function applyAfterSale(data) {
  return request.post('/after-sale/apply', data)
}

/** 我的售后单分页 */
export function getMyAfterSales(params) {
  return request.get('/after-sale/my', { params })
}

/** 商家售后单分页 */
export function getMerchantAfterSales(params) {
  return request.get('/merchant/after-sale', { params })
}

/** 商家同意售后（退款类联动退款/资金/订单） */
export function approveAfterSale(id) {
  return request.post(`/merchant/after-sale/${id}/approve`)
}

/** 商家拒绝售后 */
export function rejectAfterSale(id, rejectReason) {
  return request.post(`/merchant/after-sale/${id}/reject`, { rejectReason })
}
