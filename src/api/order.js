import request from '../utils/request.js'

/**
 * 创建订单
 * @param {Object} data - { receiverName, receiverPhone, receiverAddress, remark?, items: [{ spuId, skuId, quantity }] }
 */
export function createOrder(data) {
  return request.post('/order/create', data)
}

/**
 * 查询订单详情
 * @param {number|string} id - 订单ID
 */
export function getOrderDetail(id) {
  return request.get(`/order/${id}`)
}

/**
 * 取消订单（仅待支付状态可取消）
 * @param {number|string} id - 订单ID
 */
export function cancelOrder(id) {
  return request.put(`/order/${id}/cancel`)
}

/**
 * 查询订单列表
 * @param {Object} params - { pageNum, pageSize, status? }
 */
export function getOrderList(params) {
  return request.get('/order/page', { params })
}

/** 订单发货 */
export function deliverOrder(id, deliveryCompany, deliveryNo) {
  return request.put(`/merchant/order/${id}/deliver`, null, {
    params: { deliveryCompany, deliveryNo },
  })
}
