<template>
  <div class="page-profile">
    <div class="nav-sticky"><NavBar title="个人中心" :show-back="false" /></div>

    <!-- 🧑 用户信息卡片 -->
    <div class="user-card">
      <div class="user-avatar" @click="showAvatarDialog = true">
        <van-image
          round
          width="64"
          height="64"
          :src="avatarSrc"
          :key="avatarSrc"
          class="avatar-img"
        />
      </div>
      <div class="user-meta">
        <div class="user-name">{{ memberInfo?.realName || memberInfo?.username || '未设置昵称' }}</div>
      </div>
    </div>

    <!-- 📋 我的订单（状态导航） -->
    <div class="orders-section">
      <div class="orders-header" @click="goOrders">
        <span class="orders-title">我的订单</span>
        <span class="orders-more">
          全部订单 <van-icon name="arrow" size="14" color="#c8c4c0" />
        </span>
      </div>
      <div class="orders-statuses">
        <div class="status-item" @click="goOrdersByStatus(0)">
          <div class="status-icon-wrap">
            <van-icon name="clock-o" size="24" color="#f39c12" />
            <van-badge v-if="orderCounts[0]" :content="orderCounts[0]" max="99" class="status-badge" />
          </div>
          <span class="status-label">待付款</span>
        </div>
        <div class="status-item" @click="goOrdersByStatus(1)">
          <div class="status-icon-wrap">
            <van-icon name="logistics" size="24" color="#e8573a" />
            <van-badge v-if="orderCounts[1]" :content="orderCounts[1]" max="99" class="status-badge" />
          </div>
          <span class="status-label">待发货</span>
        </div>
        <div class="status-item" @click="goOrdersByStatus(2)">
          <div class="status-icon-wrap">
            <van-icon name="send-gift-o" size="24" color="#1989fa" />
            <van-badge v-if="orderCounts[2]" :content="orderCounts[2]" max="99" class="status-badge" />
          </div>
          <span class="status-label">待收货</span>
        </div>
        <div class="status-item" @click="goOrdersByStatus(3)">
          <div class="status-icon-wrap">
            <van-icon name="records-o" size="24" color="#07c160" />
            <van-badge v-if="orderCounts[3]" :content="orderCounts[3]" max="99" class="status-badge" />
          </div>
          <span class="status-label">已完成</span>
        </div>
      </div>
    </div>

    <!-- 📋 功能菜单 -->
    <div class="menu-section">
      <div class="menu-item" @click="showPwdDialog = true">
        <van-icon name="lock-o" size="20" color="#e8573a" />
        <span class="menu-text">修改密码</span>
        <van-icon name="arrow" size="16" color="#c8c4c0" class="menu-arrow" />
      </div>
      <div class="menu-item" @click="goAddress">
        <van-icon name="location-o" size="20" color="#e8573a" />
        <span class="menu-text">收货地址</span>
        <van-icon name="arrow" size="16" color="#c8c4c0" class="menu-arrow" />
      </div>
    </div>

    <!-- 🖼 修改头像弹窗 -->
    <van-dialog v-model:show="showAvatarDialog" title="修改头像" :show-confirm-button="false" closeable close-icon-position="top-left">
      <div class="dialog-body">
        <div class="avatar-preview-wrap" v-if="avatarPreview">
          <van-image round width="96" height="96" :src="avatarPreview" class="avatar-preview" />
        </div>
        <div class="avatar-placeholder" v-else>
          <van-icon name="photograph" size="40" color="#c8c4c0" />
          <span class="placeholder-text">选择图片</span>
        </div>
        <input ref="fileInputRef" type="file" accept="image/*" class="file-input-hidden" @change="onFileSelected" />
        <van-button round block class="dialog-btn select-btn" @click="fileInputRef?.click()">选择图片</van-button>
        <van-button round block class="dialog-btn save-btn" @click="handleUpdateAvatar" :loading="uploadLoading" :disabled="!avatarFile">保存头像</van-button>
      </div>
    </van-dialog>

    <!-- 🔐 修改密码弹窗 -->
    <van-dialog v-model:show="showPwdDialog" title="修改密码" :show-confirm-button="false">
      <div class="dialog-body">
        <van-field v-model="pwdForm.oldPassword" type="password" label="旧密码" placeholder="请输入旧密码" />
        <van-field v-model="pwdForm.newPassword" type="password" label="新密码" placeholder="请输入新密码" />
        <van-field
          v-model="pwdForm.confirmPwd" type="password" label="确认密码" placeholder="请再次输入新密码"
          :rules="[{ validator: () => !pwdForm.newPassword || pwdForm.confirmPwd === pwdForm.newPassword, message: '两次密码不一致' }]"
        />
        <van-button round block class="dialog-btn" @click="handleUpdatePwd" :loading="pwdLoading">保存</van-button>
      </div>
    </van-dialog>

    <!-- 🚪 退出登录 -->
    <div class="logout-section">
      <van-button round block plain class="logout-btn" @click="handleLogout">退出登录</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useUserStore } from '../stores/user.js'
import { getOrderList } from '../api/order.js'
import { updatePassword, updateAvatar } from '../api/member.js'
import NavBar from '../components/NavBar.vue'

const router = useRouter()
const userStore = useUserStore()

const memberInfo = computed(() => userStore.memberInfo)
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0ece8' rx='50'/%3E%3Ctext x='50' y='58' text-anchor='middle' font-size='40' fill='%23c8c4c0'%3E👤%3C/text%3E%3C/svg%3E"
// customAvatar 优先级最高，覆盖 store 中的 avatar
const customAvatar = ref('')
const avatarSrc = computed(() => customAvatar.value || memberInfo.value?.avatar || defaultAvatar)

// 各状态订单数量 { 0: N, 1: N, 2: N, 3: N }
const orderCounts = ref({})

// 修改头像
const showAvatarDialog = ref(false)
const fileInputRef = ref(null)
const avatarFile = ref(null)
const avatarPreview = ref('')
const uploadLoading = ref(false)

// 修改密码
const showPwdDialog = ref(false)
const pwdLoading = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPwd: '' })

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  avatarFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { avatarPreview.value = ev.target?.result || '' }
  reader.readAsDataURL(file)
}

async function handleUpdateAvatar() {
  if (!avatarPreview.value) return showToast('请先选择图片')
  uploadLoading.value = true
  try {
    await updateAvatar(avatarPreview.value)
    // 立即更新显示
    customAvatar.value = avatarPreview.value
    // 持久化到 store（刷新页面后仍保留）
    if (userStore.memberInfo) {
      userStore.memberInfo = { ...userStore.memberInfo, avatar: avatarPreview.value }
    }
    showToast('头像已更新')
    showAvatarDialog.value = false
    avatarFile.value = null
    avatarPreview.value = ''
  } catch { /* toast 由拦截器处理 */ }
  finally { uploadLoading.value = false }
}

async function handleUpdatePwd() {
  if (!pwdForm.value.oldPassword || !pwdForm.value.newPassword) return showToast('请填写完整')
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPwd) return showToast('两次密码不一致')
  pwdLoading.value = true
  try {
    await updatePassword({ oldPassword: pwdForm.value.oldPassword, newPassword: pwdForm.value.newPassword })
    showToast('密码已修改')
    showPwdDialog.value = false
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPwd: '' }
  } catch { /* toast 由拦截器处理 */ }
  finally { pwdLoading.value = false }
}

onActivated(() => {
  if (!localStorage.getItem('token') && userStore.isLogin) {
    userStore.logout()
    return
  }
  fetchOrderCounts()
})

// ── 获取各状态订单数量 ──
async function fetchOrderCounts() {
  try {
    const res = await getOrderList({ pageNum: 1, pageSize: 100 })
    // 兼容分页对象 { records } 和直接返回数组
    const list = Array.isArray(res) ? res : (res?.records || [])
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 }
    for (const order of list) {
      const s = order.status
      if (s in counts) counts[s]++
    }
    orderCounts.value = counts
  } catch {
    orderCounts.value = {}
  }
}

function goOrders() {
  router.push('/order/list')
}

function goOrdersByStatus(status) {
  router.push({ path: '/order/list', query: { tab: status } })
}

function goAddress() {
  router.push('/address')
}

async function handleLogout() {
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确定要退出登录吗？',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      confirmButtonColor: '#e8573a',
    })
  } catch {
    return
  }
  userStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.page-profile {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 40px;
}
.nav-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}

/* ── 用户卡片 ── */
.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 32px 20px 24px;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
}
.user-avatar {
  flex-shrink: 0;
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,0.4);
  border-radius: 50%;
}
.avatar-img {
  border-radius: 50%;
}
.user-meta {
  flex: 1;
  min-width: 0;
}
.user-name {
  font-size: 20px;
  font-weight: 700;
}

/* ── 我的订单 ── */
.orders-section {
  background: #fff;
  margin: 12px 12px 0;
  border-radius: 14px;
  overflow: visible;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.orders-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
  cursor: pointer;
}
.orders-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}
.orders-more {
  font-size: 13px;
  color: #9a9aae;
  display: flex;
  align-items: center;
  gap: 2px;
}
.orders-statuses {
  display: flex;
  justify-content: space-around;
  padding: 16px 8px;
}
.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 12px;
  transition: background 0.2s;
  border-radius: 8px;
  position: relative;
}
.status-item:active {
  background: #f5f3f0;
}
.status-icon-wrap {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.status-badge {
  position: absolute;
  top: -6px;
  right: -10px;
}
:deep(.van-badge) {
  font-size: 10px;
  padding: 0 4px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
}
.status-label {
  font-size: 12px;
  color: #5a5a6e;
}

/* ── 功能菜单 ── */
.menu-section {
  background: #fff;
  margin: 12px 12px 0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.menu-item:active {
  background: #faf8f6;
}
.menu-text {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #1a1a2e;
}
.menu-arrow {
  flex-shrink: 0;
}

/* ── 弹窗表单 ── */
.dialog-body {
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.avatar-preview-wrap {
  margin-bottom: 20px;
}
.avatar-preview {
  border: 3px solid #f0ece8;
}
.avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 24px 0;
}
.placeholder-text {
  font-size: 13px;
  color: #c8c4c0;
}
.file-input-hidden {
  display: none;
}
.dialog-btn {
  margin-top: 12px;
  height: 40px;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
}
.select-btn {
  background: #f5f3f0 !important;
  color: #5a5a6e !important;
  border: 1px solid #e0dcd8 !important;
}
.save-btn {
  margin-top: 8px;
}

/* ── 退出登录 ── */
.logout-section {
  padding: 40px 16px;
}
.logout-btn {
  height: 44px;
  font-size: 16px;
  color: #9a9aae;
  border-color: #e0dcd8;
  border-radius: 22px;
}
</style>
