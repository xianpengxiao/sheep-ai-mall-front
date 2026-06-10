<template>
  <div class="tab-system">
    <!-- 搜索框（防抖 300ms） -->
    <div class="sys-toolbar">
      <div class="sys-search">
        <van-icon name="search" size="14" color="#c8c4c0" />
        <input v-model="keyword" placeholder="搜索用户名/真实姓名/手机号" @input="onSearchInput" @keyup.enter="handleSearch" />
      </div>
    </div>

    <!-- 表格 -->
    <div class="sys-table-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>账号</th>
            <th>真实姓名</th>
            <th>手机号</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>最后登录</th>
            <th v-if="hasPerm('sys:user:update')">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="list.length === 0">
            <td colspan="8" class="empty-cell">未找到匹配的用户</td>
          </tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.username }}</td>
            <td>{{ row.realName || '--' }}</td>
            <td>
              <span v-if="row.phone" class="mask-text" :title="row.phone">{{ maskPhone(row.phone) }}</span>
              <span v-else style="color:#c8c4c0">--</span>
            </td>
            <td>
              <span v-if="row.email" class="mask-text" :title="row.email">{{ maskEmail(row.email) }}</span>
              <span v-else style="color:#c8c4c0">--</span>
            </td>
            <td>
              <span v-if="row.roles?.length" class="role-tags">
                <span v-for="(r, i) in row.roles" :key="i" class="role-badge" :class="roleClass(r)">{{ roleName(r) }}</span>
              </span>
              <span v-else style="color:#c8c4c0">--</span>
            </td>
            <td><span class="status-dot" :class="row.status === 1 ? 'on' : 'off'"></span>{{ row.status === 1 ? '正常' : '禁用' }}</td>
            <td class="cell-lastlogin">{{ row.lastLogin ? fmt(row.lastLogin) : '从未登录' }}</td>
            <td class="cell-actions">
              <van-button size="small" plain round class="btn-detail" @click="openDetail(row)">查看详情</van-button>
              <van-button v-if="hasPerm('sys:user:update')" size="small" plain round class="btn-role" @click="openRole(row)">分配角色</van-button>
              <van-button v-if="row.status === 1" size="small" plain round class="btn-ban" @click="handleToggleStatus(row, 0)">封禁</van-button>
              <van-button v-else size="small" plain round class="btn-unban" @click="handleToggleStatus(row, 1)">解封</van-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="sys-pagination">
      <van-pagination v-model="page" :page-count="pageCount" mode="simple" @change="loadData" />
      <span class="page-info">共 {{ total }} 条</span>
    </div>

    <!-- 用户详情弹窗 -->
    <van-dialog v-model:show="showDetail" title="用户详情" :show-confirm-button="false" closeable close-icon-position="top-left" class="detail-dialog">
      <div class="detail-body" v-if="detailUser">
        <div class="detail-avatar-row">
          <van-image v-if="detailUser.avatar" :src="detailUser.avatar" round width="56" height="56" />
          <span v-else class="detail-avatar-placeholder">{{ (detailUser.username || '?')[0] }}</span>
          <div class="detail-avatar-info">
            <div class="detail-username">{{ detailUser.username }}</div>
            <div class="detail-nickname">{{ detailUser.nickname || '暂无昵称' }}</div>
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">真实姓名</span><span class="detail-val">{{ detailUser.realName || '--' }}</span></div>
          <div class="detail-item"><span class="detail-label">性别</span><span class="detail-val">{{ genderText(detailUser.gender) }}</span></div>
          <div class="detail-item"><span class="detail-label">手机号</span><span class="detail-val">{{ detailUser.phone ? maskPhone(detailUser.phone) : '--' }}</span></div>
          <div class="detail-item"><span class="detail-label">邮箱</span><span class="detail-val">{{ detailUser.email ? maskEmail(detailUser.email) : '--' }}</span></div>
          <div class="detail-item"><span class="detail-label">生日</span><span class="detail-val">{{ detailUser.birthday || '--' }}</span></div>
          <div class="detail-item"><span class="detail-label">身份证</span><span class="detail-val">{{ detailUser.idCard || '--' }}</span></div>
          <div class="detail-item"><span class="detail-label">个性签名</span><span class="detail-val detail-sig">{{ detailUser.signature || '--' }}</span></div>
          <div class="detail-item"><span class="detail-label">备注</span><span class="detail-val">{{ detailUser.remark || '--' }}</span></div>
          <div class="detail-item"><span class="detail-label">角色</span><span class="detail-val"><span v-for="(r, i) in detailUser.roles" :key="i" class="role-badge" :class="roleClass(r)" style="margin-right:4px;">{{ roleName(r) }}</span></span></div>
          <div class="detail-item"><span class="detail-label">状态</span><span class="detail-val"><span class="status-dot" :class="detailUser.status === 1 ? 'on' : 'off'"></span>{{ detailUser.status === 1 ? '正常' : '禁用' }}</span></div>
          <div class="detail-item"><span class="detail-label">注册时间</span><span class="detail-val">{{ detailUser.createTime ? fmt(detailUser.createTime) : '--' }}</span></div>
          <div class="detail-item"><span class="detail-label">最后登录</span><span class="detail-val">{{ detailUser.lastLogin ? fmt(detailUser.lastLogin) : '从未登录' }}</span></div>
        </div>
      </div>
    </van-dialog>

    <!-- 角色分配弹窗 -->
    <van-dialog v-model:show="showRole" title="分配角色" :show-confirm-button="false" closeable close-icon-position="top-left" class="role-dialog" @close="onDialogClose">
      <div class="role-body">
        <van-loading v-if="roleLoading" size="20" class="loading-center" />
        <template v-else>
          <div class="role-hint">至少勾选 1 个角色</div>
          <van-checkbox-group v-model="selectedIds" direction="vertical" class="role-group">
            <van-checkbox v-for="r in allRoles" :key="r.id" :name="r.id" shape="square" class="role-item">
              <span class="role-name">{{ r.roleName || r.roleCode }}</span>
              <span v-if="r.description" class="role-desc" :title="r.description"> — {{ r.description }}</span>
            </van-checkbox>
          </van-checkbox-group>
          <div v-if="roleErr" class="role-err">{{ roleErr }}</div>
        </template>
        <div class="role-actions">
          <van-button round plain class="role-btn" @click="showRole = false">取消</van-button>
          <van-button round class="role-btn role-btn-primary" @click="confirmRole" :loading="saving">确定</van-button>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '../../../stores/user.js'
import { getAdminUsers, getAllRoles, getUserRoleIds, assignUserRoles, toggleUserStatus } from '../../../api/admin.js'

const userStore = useUserStore()

// ── 搜索（防抖 300ms） ──
const keyword = ref('')
let debounceTimer = null

function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    loadData()
  }, 300)
}
function handleSearch() {
  clearTimeout(debounceTimer)
  page.value = 1
  loadData()
}

// ── 列表 ──
const list = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const size = 10
const pageCount = computed(() => Math.ceil(total.value / size) || 1)

async function loadData() {
  loading.value = true
  try {
    const data = await getAdminUsers({ page: page.value, size, keyword: keyword.value })
    list.value = data?.records || []
    total.value = data?.total || 0
  } catch (e) {
    const status = e?.response?.status
    if (status === 401) { /* 拦截器已处理跳转 */ }
    else if (status === 403) showToast('暂无权限')
    else if (e?.message?.includes('timeout') || e?.message?.includes('超时')) showToast('网络异常，请重试')
    else showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// ── 权限检查 ──
function hasPerm(p) {
  return Array.isArray(userStore.permissions) && userStore.permissions.includes(p)
}

// ── 封禁/解封 ──
async function handleToggleStatus(row, newStatus) {
  const action = newStatus === 0 ? '封禁' : '解封'
  try {
    await showConfirmDialog({ title: action + '用户', message: '确定要' + action + '该用户吗？', confirmButtonColor: '#e8573a' })
    await toggleUserStatus(row.id, newStatus)
    showToast(action + '成功')
    loadData()
  } catch { /* cancelled */ }
}

// ── 用户详情 ──
const showDetail = ref(false)
const detailUser = ref(null)

function openDetail(row) {
  detailUser.value = row
  showDetail.value = true
}

function genderText(g) {
  if (g === 1) return '男'
  if (g === 2) return '女'
  return '未知'
}

// ── 脱敏 ──
function maskPhone(p) {
  if (!p || p.length < 7) return p
  return p.slice(0, 3) + '****' + p.slice(-4)
}
function maskEmail(e) {
  if (!e) return ''
  const at = e.indexOf('@')
  if (at <= 1) return e
  return e[0] + '***' + e.slice(at)
}

// ── 角色展示 ──
function roleName(r) {
  const raw = typeof r === 'string' ? r : (r.roleName || r.roleCode || '')
  if (raw.includes('ADMIN') || raw.includes('admin') || raw.includes('超级管理员')) return '管理员'
  if (raw.includes('MERCHANT') || raw.includes('merchant') || raw.includes('商家')) return '商家'
  if (raw.includes('VIEWER') || raw.includes('viewer') || raw.includes('普通')) return '普通用户'
  return raw
}
function roleClass(r) {
  const raw = typeof r === 'string' ? r : (r.roleName || r.roleCode || '')
  if (raw.includes('ADMIN') || raw.includes('admin') || raw.includes('超级管理员')) return 'role-admin'
  if (raw.includes('MERCHANT') || raw.includes('merchant') || raw.includes('商家')) return 'role-merchant'
  return 'role-user'
}

// ── 角色分配弹窗 ──
const showRole = ref(false)
const roleLoading = ref(false)
const saving = ref(false)
const allRoles = ref([])
const selectedIds = ref([])
const roleErr = ref('')
const curUser = ref(null)

async function openRole(row) {
  curUser.value = row
  selectedIds.value = []
  roleErr.value = ''
  showRole.value = true
  roleLoading.value = true
  try {
    const [roleIds, roles] = await Promise.all([
      getUserRoleIds(row.id),
      getAllRoles(),
    ])
    selectedIds.value = Array.isArray(roleIds) ? roleIds : []
    allRoles.value = Array.isArray(roles) ? roles : []
  } catch {
    showToast('加载角色数据失败')
  } finally {
    roleLoading.value = false
  }
}

function onDialogClose() {
  selectedIds.value = []
  roleErr.value = ''
}

async function confirmRole() {
  roleErr.value = ''
  if (selectedIds.value.length === 0) {
    roleErr.value = '请至少选择一个角色'
    return
  }
  saving.value = true
  try {
    await assignUserRoles(curUser.value.id, selectedIds.value)
    showToast('角色分配成功')
    showRole.value = false
    loadData()
  } catch (e) {
    roleErr.value = e?.response?.data?.msg || e?.message || '分配失败'
  } finally {
    saving.value = false
  }
}

// ── 工具 ──
function fmt(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(loadData)
</script>

<style scoped>
.tab-system { font-size: 13px; }
.loading-center { padding: 60px 0; }

/* ── 搜索栏 ── */
.sys-toolbar { margin-bottom: 16px; }
.sys-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1.5px solid #eeeae6;
  border-radius: 10px;
  padding: 0 14px;
  max-width: 320px;
}
.sys-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  padding: 9px 0;
  background: transparent;
  color: #1a1a2e;
}
.sys-search input::placeholder { color: #c8c4c0; }

/* ── 表格 ── */
.sys-table-wrap { overflow-x: auto; }
.sys-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}
.page-info { font-size: 12px; color: #9a9aae; }

.data-table {
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.data-table th {
  padding: 11px 10px;
  text-align: left;
  font-weight: 600;
  color: #5a5a6e;
  background: #faf8f6;
  border-bottom: 1px solid #eeeae6;
  white-space: nowrap;
  font-size: 12px;
}
.data-table td {
  padding: 10px;
  color: #1a1a2e;
  border-bottom: 1px solid #f5f3f0;
  white-space: nowrap;
}
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-lastlogin { font-size: 12px; color: #5a5a6e; }

/* ── 脱敏文本 ── */
.mask-text { cursor: help; border-bottom: 1px dashed #d0ccc8; }

/* ── 状态圆点 ── */
.status-dot {
  display: inline-block; width: 7px; height: 7px; border-radius: 50%;
  margin-right: 5px; vertical-align: middle;
}
.status-dot.on { background: #2e7d32; }
.status-dot.off { background: #c8c4c0; }

/* ── 角色标签 ── */
.role-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.role-badge {
  display: inline-block; font-size: 11px; padding: 1px 8px;
  border-radius: 4px; font-weight: 500;
}
.role-admin { background: #fdecea; color: #c62828; }
.role-merchant { background: #fff3e0; color: #e65100; }
.role-user { background: #f0ece8; color: #5a5a6e; }

/* ── 操作列按钮 ── */
.cell-actions { display: flex; gap: 6px; white-space: nowrap; }
.btn-detail {
  border-color: #5a5a6e !important; color: #5a5a6e !important;
  font-size: 12px; padding: 0 10px;
}
.btn-role {
  border-color: #e8573a !important; color: #e8573a !important;
  font-size: 12px; padding: 0 10px;
}
.btn-ban {
  border-color: #c62828 !important; color: #c62828 !important;
  font-size: 12px; padding: 0 10px;
}
.btn-unban {
  border-color: #2e7d32 !important; color: #2e7d32 !important;
  font-size: 12px; padding: 0 10px;
}

/* ── 角色弹窗 ── */
.role-dialog :deep(.van-dialog__header) { font-weight: 600; font-size: 16px; padding: 16px 20px 0; }
.role-body { padding: 8px 20px 20px; max-height: 460px; overflow-y: auto; }
.role-hint { font-size: 12px; color: #9a9aae; margin-bottom: 10px; }
.role-group { display: flex; flex-direction: column; gap: 6px; }
.role-item { padding: 8px 10px; border-radius: 8px; background: #faf8f6; font-size: 13px; }
.role-name { font-weight: 500; color: #1a1a2e; }
.role-desc { color: #9a9aae; font-size: 12px; cursor: help; }
.role-err { color: #e8573a; font-size: 12px; margin-top: 8px; text-align: center; }
.role-actions { display: flex; gap: 12px; justify-content: center; margin-top: 16px; }
.role-btn { flex: 1; height: 40px; font-size: 14px; }
.role-btn-primary {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
}

/* ── 用户详情弹窗 ── */
.detail-dialog :deep(.van-dialog__header) { font-weight: 600; font-size: 16px; padding: 16px 20px 0; }
.detail-body { padding: 12px 20px 20px; max-height: 480px; overflow-y: auto; }
.detail-avatar-row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f0ece8; }
.detail-avatar-placeholder {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%);
  color: #fff; font-size: 22px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.detail-avatar-info { flex: 1; min-width: 0; }
.detail-username { font-size: 16px; font-weight: 700; color: #1a1a2e; }
.detail-nickname { font-size: 13px; color: #9a9aae; margin-top: 2px; }
.detail-grid { display: flex; flex-direction: column; gap: 10px; }
.detail-item { display: flex; font-size: 13px; line-height: 1.6; }
.detail-label { width: 72px; flex-shrink: 0; color: #9a9aae; }
.detail-val { color: #1a1a2e; font-weight: 500; flex: 1; min-width: 0; }
.detail-sig { word-break: break-word; white-space: normal; }
</style>
