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

/** 发送短信验证码（登录用） */
export function sendSmsCode(phone) {
  return request.post('/auth/send-login-code', null, { params: { phone } })
}

/** 短信验证码登录（直接登录，无需先调 verify-code） */
export function smsLogin(phone, code) {
  return request.post('/auth/sms-login', { phone, code })
}

/** 检查手机号是否已注册 */
export function checkPhone(phone) {
  return request.get('/auth/check-phone', { params: { phone } })
}

/** 发送注册验证码 */
export function sendRegisterCode(phone) {
  return request.post('/auth/send-code', null, { params: { phone } })
}

/** 校验验证码 */
export function verifyCode(phone, code) {
  return request.post('/auth/verify-code', { phone, code })
}

/** 获取当前登录用户信息（含 roles 角色列表） */
export function getCurrentUser() {
  return request.get('/auth/me')
}

/** 获取个人资料 */
export function getProfile() {
  return request.get('/profile')
}

/** 更新个人资料 */
export function updateProfile(data) {
  return request.put('/profile', data)
}

// ── 安全中心 ──

/** 获取安全资料（实名/手机/邮箱状态） */
export function getSecurityProfile() {
  return request.get('/auth/profile')
}

/** 提交实名认证 */
export function submitRealName(data) {
  return request.post('/auth/realname', data)
}

/** 绑定/更换手机 */
export function bindPhone(data) {
  return request.put('/auth/phone', data)
}

/** 发送邮箱验证码 */
export function sendEmailCode(email) {
  return request.post('/auth/send-email', null, { params: { email } })
}

/** 绑定/更换邮箱 */
export function bindEmail(data) {
  return request.put('/auth/email', data)
}

/** 向当前绑定手机号发送验证码（换绑验证） */
export function sendOldPhoneCode() {
  return request.post('/auth/send-old-phone-code')
}

/** 向当前绑定邮箱发送验证码（换绑验证） */
export function sendOldEmailCode() {
  return request.post('/auth/send-old-email-code')
}