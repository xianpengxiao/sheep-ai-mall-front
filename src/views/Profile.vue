<template>
  <div class="page-profile">
    <div class="nav-bar-sticky">
      <NavBar title="个人中心" />
    </div>

    <!-- 用户信息卡片 -->
    <div class="user-card">
      <div class="user-avatar-wrap" @click="showAvatarDialog = true">
        <van-image
          v-if="profile.avatar"
          round
          width="80"
          height="80"
          :src="profile.avatar"
          class="user-avatar-img"
        />
        <div v-else class="user-avatar-icon">
          <van-icon name="user-o" size="36" color="#c8c4c0" />
        </div>
      </div>
      <div class="user-info" @click="openEdit">
        <div class="user-nickname">{{ profile.nickname || '暂无昵称' }}</div>
        <div class="user-meta-row">
          <span class="user-gender" v-if="profile.gender === 1"><van-icon name="male" color="#1989fa" /> 男</span>
          <span class="user-gender" v-else-if="profile.gender === 2"><van-icon name="female" color="#ee0a24" /> 女</span>
          <span class="user-gender unknown" v-else>性别未知</span>
          <span class="user-sig">{{ profile.signature || '这家伙很懒，什么都没留下' }}</span>
        </div>
      </div>
      <van-icon name="arrow" size="16" color="rgba(255,255,255,0.5)" class="card-arrow" />
    </div>

    <!-- 安全提示 -->
    <div class="sec-tip" v-if="secTipText" @click="goSecurity">
      <van-icon name="info-o" size="16" color="#f39c12" />
      <span class="sec-tip-text">{{ secTipText }}</span>
      <van-icon name="arrow" size="14" color="#f39c12" />
    </div>

    <!-- 我的订单（状态导航） -->
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

    <!-- 功能菜单 -->
    <div class="menu-section">
      <div class="menu-item" @click="goSecurity">
        <van-icon name="eye-o" size="20" color="#e8573a" />
        <span class="menu-text">安全设置</span>
        <van-icon name="arrow" size="16" color="#c8c4c0" class="menu-arrow" />
      </div>
      <div class="menu-item" @click="showPwdDialog = true">
        <van-icon name="shield-o" size="20" color="#e8573a" />
        <span class="menu-text">修改密码</span>
        <van-icon name="arrow" size="16" color="#c8c4c0" class="menu-arrow" />
      </div>
      <div class="menu-item" @click="goAddress">
        <van-icon name="location-o" size="20" color="#e8573a" />
        <span class="menu-text">收货地址</span>
        <van-icon name="arrow" size="16" color="#c8c4c0" class="menu-arrow" />
      </div>
    </div>

    <!-- 退出登录 -->
    <div class="logout-section">
      <van-button round block plain class="logout-btn" @click="handleLogout">退出登录</van-button>
    </div>

    <!-- 编辑个人资料弹窗 -->
    <van-dialog v-model:show="showEdit" title="编辑个人资料" :show-confirm-button="false" closeable close-icon-position="top-left" class="profile-edit-dialog">
      <div class="dialog-body">
        <!-- 表单 -->
        <van-form ref="formRef" @submit="handleSave">
          <van-field v-model="editForm.nickname" label="昵称" placeholder="请输入昵称" maxlength="30" clearable :rules="[{ required: true, message: '昵称不能为空' }]" />
          <van-field name="gender" label="性别">
            <template #input>
              <div class="gender-pills">
                <span class="gender-pill" :class="{ active: editForm.gender === 0 }" @click="editForm.gender = 0"><van-icon name="question-o" /> 未知</span>
                <span class="gender-pill" :class="{ active: editForm.gender === 1 }" @click="editForm.gender = 1"><van-icon name="male" color="#1989fa" /> 男</span>
                <span class="gender-pill" :class="{ active: editForm.gender === 2 }" @click="editForm.gender = 2"><van-icon name="female" color="#ee0a24" /> 女</span>
              </div>
            </template>
          </van-field>
          <van-field label="生日">
            <template #input>
              <input v-model="editForm.birthday" type="date" class="edit-date-input" />
            </template>
          </van-field>
          <van-field v-model="editForm.signature" label="个性签名" type="textarea" :rows="3" autosize placeholder="介绍一下自己吧" maxlength="200" show-word-limit />
        </van-form>

        <div class="edit-actions">
          <van-button round plain class="edit-btn" @click="showEdit = false">取消</van-button>
          <van-button round class="edit-btn edit-btn-primary" :loading="saving" @click="handleSave">保存</van-button>
        </div>
      </div>
    </van-dialog>

    <!-- 修改头像弹窗（保留兼容） -->
    <AvatarUploader v-model="showAvatarDialog" @saved="onAvatarSaved" />

    <!-- 修改密码弹窗 -->
    <PasswordEditor v-model="showPwdDialog" />
  </div>
</template>

<script setup>
import { ref, reactive, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '../stores/user.js'
import { getOrderList } from '../api/order.js'
import { getProfile, updateProfile, getSecurityProfile } from '../api/member.js'
import NavBar from '../components/NavBar.vue'
import AvatarUploader from '../components/AvatarUploader.vue'
import PasswordEditor from '../components/PasswordEditor.vue'

const router = useRouter()
const userStore = useUserStore()


// ── 个人资料 ──
const profile = reactive({
  avatar: '',
  nickname: '',
  gender: 0,
  birthday: '',
  signature: '',
})

async function fetchProfile() {
  try {
    const data = await getProfile()
    if (data) {
      profile.avatar = data.avatar || ''
      profile.nickname = data.nickname || ''
      profile.gender = data.gender ?? 0
      profile.birthday = data.birthday || ''
      profile.signature = data.signature || ''
      // 同步到 store（供其他页面使用）
      if (userStore.memberInfo) {
        userStore.memberInfo = { ...userStore.memberInfo, avatar: data.avatar, nickname: data.nickname, realName: data.realName }
      }
    }
  } catch { /* ignore */ }
}

// ── 安全提示 ──
const secTipText = ref('')

async function fetchSecurityStatus() {
  try {
    const data = await getSecurityProfile()
    if (data) {
      const tips = []
      if (!data.realNameAuth) tips.push('实名认证')
      if (!data.phoneBound) tips.push('手机绑定')
      if (!data.emailBound) tips.push('邮箱绑定')
      if (tips.length === 3) secTipText.value = '为保障账号安全，请尽快完成全部安全设置'
      else if (tips.length > 0) secTipText.value = '建议完成' + tips.join('、') + '，获得更多权益'
      else secTipText.value = ''
    }
  } catch { secTipText.value = '' }
}

// ── 各状态订单数量 ──
const orderCounts = ref({})

async function fetchOrderCounts() {
  try {
    const res = await getOrderList({ pageNum: 1, pageSize: 100 })
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

onActivated(() => {
  if (!localStorage.getItem('token') && userStore.isLogin) {
    userStore.logout()
    return
  }
  fetchProfile()
  fetchSecurityStatus()
  fetchOrderCounts()
})

// ── 编辑弹窗 ──
const showEdit = ref(false)
const editForm = reactive({ nickname: '', gender: 0, birthday: '', signature: '' })
const saving = ref(false)

function openEdit() {
  editForm.nickname = profile.nickname
  editForm.gender = profile.gender
  editForm.birthday = profile.birthday
  editForm.signature = profile.signature
  showEdit.value = true
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      nickname: editForm.nickname.trim(),
      gender: editForm.gender,
      birthday: editForm.birthday || null,
      signature: editForm.signature.trim(),
    }
    await updateProfile(payload)
    showToast('保存成功')
    // 同步到本地
    profile.nickname = editForm.nickname
    profile.gender = editForm.gender
    profile.birthday = editForm.birthday
    profile.signature = editForm.signature
    showEdit.value = false
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    showToast(msg || '保存失败')
  } finally {
    saving.value = false
  }
}

// ── 头像上传 ──
const showAvatarDialog = ref(false)

function onAvatarSaved(avatarDataUrl) {
  profile.avatar = avatarDataUrl
  if (userStore.memberInfo) {
    userStore.memberInfo = { ...userStore.memberInfo, avatar: avatarDataUrl }
  }
}

// ── 修改密码 ──
const showPwdDialog = ref(false)

// ── 导航 ──
function goSecurity() { router.push('/security') }
function goOrders() { router.push('/order/list') }
function goOrdersByStatus(status) { router.push({ path: '/order/list', query: { tab: status } }) }
function goAddress() { router.push('/address') }

async function handleLogout() {
  try {
    await showConfirmDialog({ title: '提示', message: '确定要退出登录吗？', confirmButtonText: '确定', cancelButtonText: '取消', confirmButtonColor: '#e8573a' })
  } catch { return }
  userStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.page-profile {
  min-height: 100vh;
  background: #f5f3f0;
  padding-bottom: 40px;
}
.nav-bar-sticky {
  position: sticky; top: 0; z-index: 100;
}

/* ── 用户卡片 ── */
.user-card {
  display: flex; align-items: center; gap: 16px;
  padding: 28px 20px;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff; cursor: pointer;
  transition: opacity 0.15s;
}
.user-card:active { opacity: 0.92; }
.user-avatar-wrap {
  position: relative; flex-shrink: 0;
  width: 84px; height: 84px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255,255,255,0.5);
  border-radius: 50%;
}
.user-avatar-img { border-radius: 50%; }
.user-info { flex: 1; min-width: 0; }
.user-nickname { font-size: 22px; font-weight: 700; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-meta-row { display: flex; align-items: center; gap: 10px; font-size: 13px; flex-wrap: wrap; }
.user-gender { display: inline-flex; align-items: center; gap: 2px; background: rgba(255,255,255,0.2); padding: 1px 8px; border-radius: 10px; }
.user-gender.unknown { color: rgba(255,255,255,0.7); }
.user-sig { color: rgba(255,255,255,0.75); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.card-arrow { flex-shrink: 0; }

/* ── 安全提示 ── */
.sec-tip {
  display: flex; align-items: center; gap: 6px; margin: 10px 12px 0;
  padding: 10px 14px; background: #fff8e1; border-radius: 10px; cursor: pointer;
  font-size: 13px; color: #795548;
}
.sec-tip:active { opacity: 0.8; }
.sec-tip-text { flex: 1; }

/* ── 我的订单 ── */
.orders-section {
  background: #fff; margin: 12px 12px 0;
  border-radius: 14px; overflow: visible; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.orders-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 0; cursor: pointer;
}
.orders-title { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.orders-more { font-size: 13px; color: #9a9aae; display: flex; align-items: center; gap: 2px; }
.orders-statuses {
  display: flex; justify-content: space-around; padding: 16px 8px;
}
.status-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer; padding: 4px 12px; transition: background 0.2s; border-radius: 8px; position: relative;
}
.status-item:active { background: #f5f3f0; }
.status-icon-wrap { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; position: relative; }
.status-badge { position: absolute; top: -6px; right: -10px; }
:deep(.van-badge) { font-size: 10px; padding: 0 4px; min-width: 16px; height: 16px; line-height: 16px; }
.status-label { font-size: 12px; color: #5a5a6e; }

/* ── 功能菜单 ── */
.menu-section {
  background: #fff; margin: 12px 12px 0;
  border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.menu-item {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; cursor: pointer; transition: background 0.2s;
}
.menu-item:active { background: #faf8f6; }
.menu-text { flex: 1; font-size: 15px; font-weight: 500; color: #1a1a2e; }
.menu-arrow { flex-shrink: 0; }

/* ── 退出登录 ── */
.logout-section { padding: 40px 16px; }
.logout-btn { height: 44px; font-size: 16px; color: #9a9aae; border-color: #e0dcd8; border-radius: 22px; }

/* ── 编辑弹窗 ── */
.profile-edit-dialog :deep(.van-dialog__header) { font-weight: 600; font-size: 16px; padding: 16px 20px 0; }
.dialog-body { padding: 12px 20px 20px; max-height: 520px; overflow-y: auto; }

/* 性别选择 pill 样式 */
.gender-pills { display: flex; gap: 10px; }
.gender-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 16px; border-radius: 20px;
  font-size: 13px; font-weight: 500; cursor: pointer;
  border: 1.5px solid #e0dcd8; color: #5a5a6e;
  background: #faf8f6; transition: all 0.2s; user-select: none;
}
.gender-pill:active { transform: scale(0.96); }
.gender-pill.active {
  border-color: #e8573a; background: #fff5f2; color: #e8573a; font-weight: 600;
}
.edit-avatar-tip { font-size: 12px; color: #9a9aae; }

.edit-date-input {
  border: none; outline: none; font-size: 14px; color: #1a1a2e;
  padding: 6px 0; background: transparent; font-family: inherit;
  width: 100%;
}

.edit-actions { display: flex; gap: 12px; justify-content: center; margin-top: 20px; }
.edit-btn { flex: 1; height: 40px; font-size: 14px; }
.edit-btn-primary {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important;
}
</style>