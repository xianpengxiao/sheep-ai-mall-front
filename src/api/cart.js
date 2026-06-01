import request from '../utils/request.js'

/**
 * 添加商品到购物车（同 SKU 则累加数量）
 * @param {Object} params - { memberId, spuId, skuId, quantity }
 */
export function addCart(params) {
  return request.post('/cart/add', params)
}
