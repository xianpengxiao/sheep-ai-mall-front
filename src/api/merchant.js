import request from '../utils/request.js'

/** 上传图片（支持 file 二进制或 base64 字符串） */
export function uploadImage(file, type = 'cert') {
  const formData = new FormData()
  if (typeof file === 'string') {
    formData.append('avatarUrl', file)
  } else {
    formData.append('file', file)
  }
  return request.post(`/upload/image?type=${type}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 商家发布商品 */
export function publishGoods(data) {
  return request.post('/merchant/goods', data)
}

/** 商家商品分页 */
export function getMerchantGoodsPage(params) {
  return request.get('/merchant/goods/page', { params })
}

/** 商家编辑商品 */
export function updateMerchantGoods(id, data) {
  return request.put(`/merchant/goods/${id}`, data)
}

/** 商家入驻申请 */
export function merchantApply(data) {
  return request.post('/merchant/apply', data)
}

/** 查询店铺信息（入驻后调用） */
export function getShopInfo() {
  return request.get('/merchant/info')
}

/** 修改店铺信息 */
export function updateShopInfo(data) {
  return request.put('/merchant/info', data)
}

/** 店铺订单分页 */
export function getShopOrders(params) {
  return request.get('/merchant/order/page', { params })
}

/** 店铺营收统计 */
export function getShopStats() {
  return request.get('/merchant/stat/income')
}

/** 店铺评价列表 */
export function getShopReviews(params) {
  return request.get('/merchant/review/page', { params })
}

/** 获取 DSR 趋势（近30天折线图数据） */
export function getDsrTrend() {
  return request.get('/merchant/stat/dsr')
}

/** 查询指定店铺的 DSR 三维评分 */
export function getShopDsr(id) {
  return request.get(`/merchant/${id}/dsr`)
}

/** 获取商家公开信息（买家端，需登录） */
export function getMerchantInfo(id) {
  return request.get(`/merchant/${id}`)
}

/** 切换营业状态 */
export function updateShopStatus() {
  return request.put('/merchant/shop/status')
}

/** 商家商品上下架 */
export function toggleMerchantGoodsStatus(id, status) {
  return request.put(`/merchant/goods/${id}/status`, null, { params: { status } })
}

/** 查询当前用户的入驻申请状态 */
export function getMerchantApplyStatus() {
  return request.get('/merchant/apply/status')
}

/** AI 生成营销文案 */
export function generateProductCopy(data) {
  return request.post('/ai/product-copy', data)
}

/** 保存 AI 文案 */
export function saveProductCopy(data) {
  return request.post('/ai/product-copy/save', data)
}
