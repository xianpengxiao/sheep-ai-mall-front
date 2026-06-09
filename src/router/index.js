import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/home/index.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/login/register.vue'),
    meta: { title: '注册' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { title: '个人中心', requiresAuth: true },
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('../views/cart/Index.vue'),
    meta: { title: '购物车', requiresAuth: true },
  },
  {
    path: '/order',
    name: 'Order',
    component: () => import('../views/Order.vue'),
    meta: { title: '订单', requiresAuth: true },
  },
  {
    path: '/order/list',
    name: 'OrderList',
    component: () => import('../views/order/list.vue'),
    meta: { title: '我的订单', requiresAuth: true },
  },
  {
    path: '/order/detail/:id',
    name: 'OrderDetail',
    component: () => import('../views/order/detail.vue'),
    meta: { title: '订单详情', requiresAuth: true },
  },
  {
    path: '/payment',
    name: 'Payment',
    component: () => import('../views/payment/index.vue'),
    meta: { title: '支付中心', requiresAuth: true },
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
  // ── 商家中心 ──
  {
    path: '/merchant/apply',
    name: 'MerchantApply',
    component: () => import('../views/merchant/Apply.vue'),
    meta: { title: '商家入驻', requiresAuth: true },
  },
  {
    path: '/merchant/dashboard',
    name: 'MerchantDashboard',
    component: () => import('../views/merchant/Dashboard.vue'),
    meta: { title: '我的店铺', requiresAuth: true },
  },
  {
    path: '/merchant/goods/publish',
    name: 'MerchantGoodsPublish',
    component: () => import('../views/merchant/PublishGoods.vue'),
    meta: { title: '发布商品', requiresAuth: true },
  },
  // ── 管理后台 ──
  {
    path: '/admin',
    name: 'AdminCenter',
    component: () => import('../views/admin/Index.vue'),
    meta: { title: '管理中心', requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 路由守卫：未登录自动跳转登录页，登录后返回原页面
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLogin) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && userStore.isLogin) {
    next('/')
  } else {
    next()
  }
})

export default router
