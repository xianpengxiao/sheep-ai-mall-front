import request from '../utils/request.js'

/** 获取分类树 */
export function getTree() {
  return request.get('/category/tree')
}

/** 根据 ID 获取分类详情 */
export function getCategoryById(id) {
  return request.get('/category/' + id)
}

/** 查子分类列表（平面） */
export function getCategoryChildren(parentId) {
  return request.get('/category/children/' + parentId)
}

/** 新增分类 */
export function createCategory(data) {
  return request.post('/category', data)
}

/** 编辑分类 */
export function updateCategory(id, data) {
  return request.put('/category/' + id, data)
}

/** 删除分类（逻辑删除） */
export function deleteCategory(id) {
  return request.delete('/category/' + id)
}
