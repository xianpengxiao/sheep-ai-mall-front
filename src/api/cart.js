import request from '../utils/request.js'

/**
 * 添加商品到购物车（同 SKU 则累加数量）
 * @param {Object} params - { userId, spuId, skuId, quantity }
 */
export function addCart(params) {
  return request.post('/cart/add', params)
}

/**
 * 获取购物车列表
 * @param {number} userId - 会员 ID（路径参数）
 * @returns {Promise<Array>} 购物车商品列表
 */
export function getCartList(userId) {
  return request.get(`/cart/${userId}`)
}

/**
 * 修改购物车商品数量
 * @param {number} id - 购物车记录 ID
 * @param {number} quantity - 新数量
 */
export function updateCartQuantity(id, quantity) {
  return request.put(`/cart/${id}/quantity`, null, { params: { quantity } })
}

/**
 * 修改购物车商品选中状态
 * @param {number} id - 购物车记录 ID
 * @param {number} selected - 1=选中 0=取消
 */
export function updateSelected(id, selected) {
  return request.put(`/cart/${id}/selected`, null, { params: { selected } })
}

/**
 * 全选/取消全选
 * @param {number} userId - 会员 ID
 * @param {number} selected - 1=全选 0=取消全选
 */
export function updateSelectAll(userId, selected) {
  return request.put(`/cart/select-all/${userId}`, null, { params: { selected } })
}

/**
 * 删除购物车中单个商品
 * @param {number} id - 购物车记录 ID
 */
export function removeCartItem(id) {
  return request.delete(`/cart/${id}`)
}

/**
 * 批量删除购物车记录
 * @param {number[]} ids - 购物车记录 ID 数组
 */
export function batchRemoveCart(ids) {
  return request.delete('/cart/batch', { data: ids })
}

/**
 * 清空购物车
 * @param {number} userId - 会员 ID
 */
export function clearCart(userId) {
  return request.delete(`/cart/clear/${userId}`)
}
