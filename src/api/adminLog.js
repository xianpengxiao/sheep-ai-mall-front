import request from '../utils/request.js'

/** 管理端：操作日志分页（module/operatorName/status/时间范围筛选） */
export function pageOperateLogs(params) {
  return request.get('/admin/logs/operate', { params })
}

/** 管理端：登录日志分页（account/status/时间范围筛选） */
export function pageLoginLogs(params) {
  return request.get('/admin/logs/login', { params })
}
