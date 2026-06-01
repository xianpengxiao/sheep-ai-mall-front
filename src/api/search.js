import request from '../utils/request.js'

/**
 * 商品全文搜索（Elasticsearch）
 * @param {Object} params — { keyword, categoryId, minPrice, maxPrice, sortBy, pageNum, pageSize }
 */
export function searchProducts(params = {}) {
  return request.get('/search/product', { params })
}
