import request from '../utils/request.js'

/**
 * 获取分类树
 */
export function getTree() {
  return request.get('/category/tree')
}

/**
 * 根据 ID 获取分类
 */
export function getCategoryById(id) {
  return request.get('/category/' + id)
}
