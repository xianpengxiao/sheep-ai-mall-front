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

/** 新增 SPU（含 SKU 列表） */
export function addSpu(data) {
  return request.post('/spu', data)
}

/** 编辑 SPU */
export function updateSpu(id, data) {
  return request.put(`/spu/${id}`, data)
}

/** 上架/下架 SPU（1=上架 0=下架） */
export function toggleSpuStatus(id, status) {
  return request.put(`/spu/${id}/status/${status}`)
}

/** 查询商品评价列表 */
export function getSpuReviews(spuId, params = {}) {
  return request.get(`/review/spu/${spuId}`, { params })
}
