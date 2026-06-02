import request from '../utils/request.js'

/** 获取收货地址列表 */
export function getAddressList() {
  return request.get('/address/list')
}

/** 添加收货地址 */
export function addAddress(data) {
  return request.post('/address/add', data)
}

/** 修改收货地址 */
export function updateAddress(data) {
  return request.put('/address/update', data)
}

/** 删除收货地址 */
export function deleteAddress(id) {
  return request.delete(`/address/${id}`)
}

/** 设置默认地址 */
export function setDefaultAddress(id) {
  return request.put(`/address/${id}/default`)
}

/** 查询地址详情 */
export function getAddressDetail(id) {
  return request.get(`/address/${id}`)
}
