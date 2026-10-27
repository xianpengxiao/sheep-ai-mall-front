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

/** 删除 SPU */
export function deleteSpu(id) {
  return request.delete(`/spu/${id}`)
}

/** 上架/下架 SPU（1=上架 0=下架） */
export function toggleSpuStatus(id, status) {
  return request.put(`/spu/${id}/status/${status}`)
}

/** 查询商品评价列表 */
export function getSpuReviews(spuId, params = {}) {
  return request.get(`/review/spu/${spuId}`, { params })
}
