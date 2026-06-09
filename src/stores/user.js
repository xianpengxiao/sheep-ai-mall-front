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

  // pinia-plugin-persistedstate: 自动同步到 localStorage
  persist: true,
})
