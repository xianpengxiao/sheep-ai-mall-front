import request from '../utils/request.js'

/**
 * 模拟支付（开发环境用，直接标记支付成功）
 * @param {number|string} orderId
 */
export function mockPay(orderId) {
  return request.post(`/payment/mock-pay?orderId=${orderId}`)
}

/**
 * 查询支付状态
 * @param {number|string} orderId
 */
export function getPaymentStatus(orderId) {
  return request.get(`/payment/status/${orderId}`)
}
