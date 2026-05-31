import axios from 'axios'
import { showToast } from 'vant'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

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
    // 业务异常
    const msg = data.msg || '请求失败'
    // 支持请求级静默：config.silent 为 true 时不弹 toast
    if (!response.config.silent) {
      showToast(msg)
    }
    return Promise.reject(new Error(msg))
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.msg || error.message || '网络错误'

    // 401 未认证 → 静默处理，由调用方决定是否跳转登录
    if (status === 401) {
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
