import request from '../utils/request.js'

/**
 * 商品全文搜索（Elasticsearch）
 * @param {Object} params — { keyword, categoryId, minPrice, maxPrice, sortBy, pageNum, pageSize }
 */
export function searchProducts(params = {}) {
  return request.get('/search/product', { params })
}

/**
 * 商家搜索（Elasticsearch）
 * @param {Object} params — { keyword, pageNum, pageSize, sortBy }
 * sortBy: relevance / compositeScoreDesc / newest
 * 返回: { records: [{ id, shopName, shopNameHighlight, shopLogo, shopDesc, shopDescHighlight, businessScope, describeScore, serviceScore, logisticsScore, compositeScore, dsrCount, shopStatus }], total }
 */
export function searchMerchant(params = {}) {
  return request.get('/search/merchant', { params })
}
