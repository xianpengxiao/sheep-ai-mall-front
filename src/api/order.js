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

/**
 * 确认收货（买家）
 * @param {number|string} id - 订单ID
 */
export function completeOrder(id) {
  return request.put(`/order/${id}/complete`)
}

/** 订单发货 */
export function deliverOrder(id, deliveryCompany, deliveryNo) {
  return request.put(`/merchant/order/${id}/deliver`, null, {
    params: { deliveryCompany, deliveryNo },
  })
}

/**
 * 提交评价（每条订单明细仅可评一次）
 * @param {Object} data - { orderId, orderItemId, describeScore?, serviceScore?, logisticsScore?, content?, imageList? }
 */
export function submitReview(data) {
  return request.post('/review', data)
}

/**
 * 查询订单明细的评价（用户只能查看自己的）
 * @param {number|string} orderItemId - 订单明细ID
 */
export function getOrderReview(orderItemId) {
  return request.get(`/review/item/${orderItemId}`)
}

/**
 * 切换评价显示/隐藏状态（用户只能操作自己的）
 * @param {number|string} id - 评价ID
 * @param {number} status - 1 显示, 0 隐藏
 */
export function updateReviewStatus(id, status) {
  return request.put(`/review/${id}/status`, null, { params: { status } })
}

/**
 * 删除自己的评价
 * @param {number|string} id - 评价ID
 */
export function deleteReview(id) {
  return request.delete(`/review/${id}`)
}
