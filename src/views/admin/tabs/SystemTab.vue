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
            <td>{{ row.phone || '--' }}</td>
            <td>{{ row.email || '--' }}</td>
            <td>
              <span v-if="row.roles?.length" class="role-tags">
                <span v-for="(r, i) in row.roles" :key="i" class="role-badge">{{ typeof r === 'string' ? r : r.roleName || r.roleCode || r }}</span>
              </span>
              <span v-else style="color:#c8c4c0">--</span>
            </td>
            <td><span class="status-tag" :class="statusClass(row.status)">{{ statusText(row.status) }}</span></td>
            <td class="cell-lastlogin">{{ row.lastLogin ? fmt(row.lastLogin) : '--' }}</td>
            <td v-if="hasPerm('sys:user:update')">
              <van-button size="small" plain round type="primary" @click="openRole(row)">分配角色</van-button>
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
import { showToast } from 'vant'
import { useUserStore } from '../../../stores/user.js'
import { getAdminUsers, getAllRoles, getUserRoleIds, assignUserRoles } from '../../../api/admin.js'

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

// ── 状态映射 ──
function statusClass(s) {
  if (s === 1) return 'on'
  if (s === 0) return 'off'
  return 'locked'
}
function statusText(s) {
  if (s === 1) return '正常'
  if (s === 0) return '禁用'
  return '锁定'
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

/* ── 状态标签 ── */
.status-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
}
.status-tag.on { background: #e8f8e8; color: #2e7d32; }
.status-tag.off { background: #fdecea; color: #c62828; }
.status-tag.locked { background: #f0ece8; color: #9a9aae; }

/* ── 角色标签 ── */
.role-tags { display: flex; flex-wrap: wrap; gap: 3px; }
.role-badge {
  display: inline-block;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 4px;
  background: #f0ece8;
  color: #5a5a6e;
  font-weight: 500;
}

/* ── 操作列按钮 ── */
.data-table td :deep(.van-button--primary) {
  background: transparent;
  border-color: #e8573a;
  color: #e8573a;
  font-size: 12px;
  padding: 0 10px;
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
</style>
