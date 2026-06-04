import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    memberInfo: null,
  }),

  getters: {
    isLogin: (state) => !!state.token,
  },

  actions: {
    login(token, memberInfo) {
      this.token = token
      this.memberInfo = memberInfo
      // 同步写入 localStorage，供 request 拦截器读取
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
