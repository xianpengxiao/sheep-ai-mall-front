import axios from 'axios'
import { showToast } from 'vant'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
})

// ── 大整数保护：在 JSON.parse 前将 16+ 位数字引号化 ──
// Snowflake ID（19位）超出 JS Number 安全范围，在 JSON 解析前
// 将 : 后的 16+ 位数字用引号包裹，使其被解析为字符串。
// 注：必须插在 transformResponse 数组首位，因为默认的 JSON.parse
// 一旦执行，大数精度即丢失不可逆。
request.defaults.transformResponse = [
  (raw) => {
    if (typeof raw !== 'string') return raw
    return raw.replace(/:\s*(\d{16,})\s*([,}\]])/g, ': "$1"$2')
  },
  ...(Array.isArray(request.defaults.transformResponse) ? request.defaults.transformResponse : []),
]

// 请求拦截器：附加 token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：统一处理返回结构
request.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code === 200) {
      return data.data
    }
    // 业务 code 401 → 按未登录处理（如 token 过期后端返回的 business 401）
    if (data.code === 401) {
      localStorage.removeItem('token')
      try { localStorage.removeItem('user') } catch {}
      window.dispatchEvent(new CustomEvent('auth:logout'))
      return Promise.reject(new Error(data.msg || '未登录'))
    }
    // 其他业务异常
    const msg = data.msg || '请求失败'
    if (!response.config.silent) {
      showToast(msg)
    }
    return Promise.reject(new Error(msg))
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.msg || error.message || '网络错误'

    // 401 Token 失效 → 清除 localStorage，通知应用退出登录
    if (status === 401) {
      localStorage.removeItem('token')
      try { localStorage.removeItem('user') } catch {}
      window.dispatchEvent(new CustomEvent('auth:logout'))
      return Promise.reject(error)
    }

    // 其他错误：非静默请求弹 toast
    if (!(error.config && error.config.silent)) {
      showToast(msg)
    }
    return Promise.reject(error)
  },
)

export default request
