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

/**
 * 根据 SPU ID 查询 SKU 列表
 * @param {number} spuId
 * @returns {Promise<Array>} SKU 列表，每个 SKU 包含 price 字段
 */
export function getSkuBySpuId(spuId) {
  return request.get(`/sku/spu/${spuId}`)
}
