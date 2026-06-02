import request from '../utils/request.js'

/**
 * 创建订单
 * @param {Object} data - 订单数据 { receiverName, receiverPhone, receiverAddress, remark?, items: [{ spuId, skuId, quantity }] }
 */
export function createOrder(data) {
  return request.post('/order/create', data)
}
