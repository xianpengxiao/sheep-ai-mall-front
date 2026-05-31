import request from '../utils/request.js'

/**
 * 分页查询商品 SPU
 * @param {Object} params — { categoryId, keyword, status, orderBy, pageNum, pageSize }
 */
export function getSpuPage(params = {}) {
  return request.get('/spu/page', { params })
}

/**
 * 获取 SPU 详情（含 SKU 列表）
 * @param {number} id
 */
export function getSpuDetail(id) {
  return request.get(`/spu/${id}`)
}
