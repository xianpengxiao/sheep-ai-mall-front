import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    memberInfo: null,
  }),

  getters: {
    isLogin: (state) => !!state.token,
    /** 当前用户权限列表 */
    permissions: (state) => {
      if (!state.memberInfo?.permissions) return []
      return Array.isArray(state.memberInfo.permissions) ? state.memberInfo.permissions : []
    },
    /** 是否已入驻商家（通过 roles 判断，登录时 backend 返回） */
    isMerchant: (state) => {
      if (!state.memberInfo?.roles) return false
      const roles = state.memberInfo.roles
      if (!Array.isArray(roles)) return false
      return roles.some(r => {
        if (typeof r === 'string') return r === 'merchant' || r === 'seller'
        if (typeof r === 'number') return r === 2
        if (typeof r === 'object' && r !== null) {
          return r.id === 2 || r.code === 'merchant' || r.code === 'seller'
        }
        return false
      })
    },
    /** 是否平台管理员/运营（ROLE_ADMIN/ROLE_OPERATOR，与 home 顶栏判定一致） */
    isAdmin: (state) => {
      if (!state.memberInfo?.roles) return false
      const roles = state.memberInfo.roles
      if (!Array.isArray(roles)) return false
      return roles.some(r => {
        if (typeof r === 'string') return r === 'ROLE_ADMIN' || r === 'ROLE_OPERATOR'
        if (typeof r === 'object' && r !== null) {
          const code = r.code || r.name || ''
          return code === 'ROLE_ADMIN' || code === 'ROLE_OPERATOR'
        }
        return false
      })
    },
  },

  actions: {
    login(token, memberInfo) {
      this.token = token
      this.memberInfo = memberInfo
      localStorage.setItem('token', token)
    },
    logout() {
      this.token = ''
      this.memberInfo = null
      localStorage.removeItem('token')
    },
    setMemberInfo(info) {
      this.memberInfo = info
    },
  },

  // 只持久化 token，memberInfo 每次启动从后端重新获取
  persist: {
    pick: ['token'],
  },
})
