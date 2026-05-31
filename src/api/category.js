import request from '../utils/request.js'

/**
 * 获取分类树
 */
export function getTree() {
  return request.get('/category/tree')
}
