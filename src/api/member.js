import request from '../utils/request.js'

/**
 * 会员登录
 * @param {string} username 用户名
 * @param {string} password 密码
 */
export function login(username, password) {
  return request.post('/auth/login', { username, password })
}

/**
 * 用户注册
 * @param {Object} data - { username, password, realName?, phone?, email? }
 */
export function register(data) {
  return request.post('/auth/register', data)
}

/**
 * 修改密码
 * @param {Object} data - { oldPassword, newPassword }
 */
export function updatePassword(data) {
  return request.put('/auth/password', data)
}

/**
 * 修改头像（Base64 数据走 request body，避免 URL 超长）
 * @param {string} avatarUrl - Base64 图片数据（含 data:image/xxx;base64, 前缀）
 */
export function updateAvatar(avatarUrl) {
  return request.put('/auth/avatar', `avatarUrl=${encodeURIComponent(avatarUrl)}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
