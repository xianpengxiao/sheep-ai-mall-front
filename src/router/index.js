import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/home/index.vue'),
    meta: { title: '首页', showTabbar: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { title: '个人中心', requiresAuth: true, showTabbar: true },
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('../views/cart/Index.vue'),
    meta: { title: '购物车', requiresAuth: true, showTabbar: true },
  },
  {
    path: '/order',
    name: 'Order',
    component: () => import('../views/Order.vue'),
    meta: { title: '订单', requiresAuth: true },
  },
  {
    path: '/member/:pathMatch(.*)*',
    name: 'Member',
    component: () => import('../views/Member.vue'),
    meta: { title: '会员中心', requiresAuth: true },
  },
  {
    path: '/goods/:id',
    name: 'GoodsDetail',
    component: () => import('../views/GoodsDetail.vue'),
    meta: { title: '商品详情' },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue'),
    meta: { title: '搜索' },
  },
  {
    path: '/address',
    name: 'AddressList',
    component: () => import('../views/address/Index.vue'),
    meta: { title: '收货地址', requiresAuth: true },
  },
  {
    path: '/address/edit/:id?',
    name: 'AddressEdit',
    component: () => import('../views/address/Edit.vue'),
    meta: { title: '编辑地址', requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 需要 Pinia 实例，这里通过内部获取
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLogin) {
    // 未登录访问需授权页面 → 跳转登录
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && userStore.isLogin) {
    // 已登录访问登录页 → 跳转首页
    next('/')
  } else {
    next()
  }
})

export default router
