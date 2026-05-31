import request from '../utils/request.js'

/**
 * 会员登录
 * @param {string} username 用户名
 * @param {string} password 密码
 */
export function login(username, password) {
  return request.post('/auth/login', { username, password })
}
