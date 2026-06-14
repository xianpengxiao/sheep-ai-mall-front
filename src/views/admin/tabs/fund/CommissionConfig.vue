<template>
  <div class="sub-page">
    <div class="sub-toolbar">
      <div class="sub-search"><input v-model="keyword" placeholder="分类ID..." @keyup.enter="handleSearch" /></div>
      <van-button round size="small" class="sub-search-btn" @click="handleSearch">搜索</van-button>
      <van-button v-if="hasPerm('fund:commission:edit')" round size="small" class="sub-add-btn" @click="openAdd"><van-icon name="plus" />新增规则</van-button>
    </div>
    <div class="sub-table-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <table v-else class="data-table">
        <thead><tr><th>ID</th><th>分类ID</th><th>分类名称</th><th>佣金比例(%)</th><th>生效日期</th><th>失效日期</th><th>状态</th><th>备注</th><th>创建时间</th><th>更新时间</th><th v-if="hasPerm('fund:commission:edit')">操作</th></tr></thead>
        <tbody>
          <tr v-if="list.length === 0"><td colspan="11" class="empty-cell">暂无数据</td></tr>
          <tr v-for="row in list" :key="row.id" :class="{ 'row-disabled': row.status === 0 }">
            <td>{{ row.id }}</td><td>{{ row.categoryId }}</td><td>{{ row.categoryName }}</td><td>{{ row.commissionRate }}</td>
            <td class="cell-time">{{ row.effectiveDate || '--' }}</td><td class="cell-time">{{ row.expireDate || '长期' }}</td>
            <td><span :class="row.status === 1 ? 'tag-green' : 'tag-gray'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td>
            <td>{{ row.remark || '--' }}</td><td class="cell-time">{{ row.createTime }}</td><td class="cell-time">{{ row.updateTime }}</td>
            <td v-if="hasPerm('fund:commission:edit')" class="cell-actions">
              <van-button size="mini" round plain class="btn-act" @click="openEdit(row)">编辑</van-button>
              <van-button size="mini" round plain :class="row.status === 1 ? 'btn-ban' : 'btn-unban'" @click="toggleStatus(row)">{{ row.status === 1 ? '禁用' : '启用' }}</van-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="sub-pagination" v-if="total > 0">
      <van-pagination v-model="page" :page-count="pageCount" mode="simple" @change="loadData" />
      <span class="page-info">共 {{ total }} 条</span>
    </div>

    <van-dialog v-model:show="showForm" :title="isEdit ? '编辑佣金规则' : '新增佣金规则'" :show-confirm-button="false" closeable close-icon-position="top-left">
      <div class="dialog-body">
        <div class="field-row"><span class="field-label">分类ID</span><van-field v-model="form.categoryId" type="digit" placeholder="请输入分类ID" :disabled="isEdit" input-align="right" /></div>
        <div class="field-row"><span class="field-label">佣金比例(%)</span><van-field v-model="form.commissionRate" type="digit" placeholder="0~100" input-align="right" /></div>
        <div class="field-row"><span class="field-label">生效日期</span><van-field v-model="form.effectiveDate" placeholder="yyyy-MM-dd" input-align="right" /></div>
        <div class="field-row"><span class="field-label">失效日期</span><van-field v-model="form.expireDate" placeholder="空=长期有效" input-align="right" /></div>
        <div class="field-row"><span class="field-label">备注</span><van-field v-model="form.remark" placeholder="备注说明" input-align="right" /></div>
        <div v-if="errMsg" class="err-msg">{{ errMsg }}</div>
        <div class="dialog-actions">
          <van-button round class="dialog-btn-cancel" @click="showForm = false">取消</van-button>
          <van-button round class="dialog-btn-primary" @click="handleSubmit" :loading="saving">确定</van-button>
        </div>
      </div>
    </van-dialog>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { getCommissionConfigPage, createCommissionConfig, updateCommissionConfig, toggleCommissionConfigStatus } from '../../../../api/fund.js'
import { useUserStore } from '../../../../stores/user.js'
const us = useUserStore()
function hasPerm(p) { return Array.isArray(us.permissions) && us.permissions.includes(p) }
const keyword = ref(''); const page = ref(1); const total = ref(0); const size = 10
const list = ref([]); const loading = ref(false)
const pageCount = computed(() => Math.ceil(total.value / size) || 1)
const showForm = ref(false); const saving = ref(false); const isEdit = ref(false); const editingId = ref(null); const errMsg = ref('')
const form = ref({ categoryId: '', commissionRate: '', effectiveDate: '', expireDate: '', remark: '' })
async function loadData() {
  loading.value = true
  try { const r = await getCommissionConfigPage({ pageNum: page.value, pageSize: size, categoryId: keyword.value || undefined }); list.value = r?.records || []; total.value = r?.total || 0 }
  catch { list.value = []; total.value = 0 }
  finally { loading.value = false }
}
function handleSearch() { page.value = 1; loadData() }
function openAdd() { isEdit.value = false; editingId.value = null; errMsg.value = ''; form.value = { categoryId: '', commissionRate: '', effectiveDate: '', expireDate: '', remark: '' }; showForm.value = true }
function openEdit(row) { isEdit.value = true; editingId.value = row.id; errMsg.value = ''; form.value = { categoryId: String(row.categoryId), commissionRate: String(row.commissionRate), effectiveDate: row.effectiveDate || '', expireDate: row.expireDate || '', remark: row.remark || '' }; showForm.value = true }
async function handleSubmit() {
  if (!form.value.categoryId) return showToast('请输入分类ID')
  if (!form.value.commissionRate) return showToast('请输入佣金比例')
  const rate = Number(form.value.commissionRate)
  if (rate < 0 || rate > 100) return showToast('佣金比例0~100之间')
  const payload = { categoryId: Number(form.value.categoryId), commissionRate: rate, effectiveDate: form.value.effectiveDate || undefined, expireDate: form.value.expireDate || undefined, remark: form.value.remark || undefined }
  saving.value = true; errMsg.value = ''
  try {
    if (isEdit.value) await updateCommissionConfig(editingId.value, payload)
    else await createCommissionConfig(payload)
    showToast(isEdit.value ? '修改成功' : '新增成功'); showForm.value = false; loadData()
  } catch (e) { errMsg.value = e?.response?.data?.msg || e?.message || '操作失败' }
  finally { saving.value = false }
}
async function toggleStatus(row) {
  const action = row.status === 1 ? '禁用' : '启用'
  try { await showConfirmDialog({ title: '提示', message: `确定${action}该规则？`, confirmButtonColor: '#e8573a' }); await toggleCommissionConfigStatus(row.id, row.status === 1 ? 0 : 1); showToast(`${action}成功`); loadData() }
  catch { /* */ }
}
onMounted(loadData)
</script>
<style scoped>
.row-disabled { opacity: 0.5; }
.sub-page { font-size: 13px; }
.sub-toolbar { display: flex; gap: 10px; margin-bottom: 14px; align-items: center; }
.sub-search { display: flex; align-items: center; background: #fff; border: 1.5px solid #eeeae6; border-radius: 10px; padding: 0 12px; max-width: 200px; }
.sub-search input { flex: 1; border: none; outline: none; font-size: 13px; padding: 8px 0; background: transparent; color: #1a1a2e; width: 100px; }
.sub-search input::placeholder { color: #c8c4c0; }
.sub-search-btn { height: 34px; font-size: 13px; font-weight: 500; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 16px; }
.sub-add-btn { height: 34px; font-size: 13px; font-weight: 500; background: #1a1a2e !important; border: none !important; color: #fff !important; padding: 0 14px; }
.sub-table-wrap { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.data-table { width: 100%; min-width: 1000px; border-collapse: collapse; }
.data-table th { padding: 11px 8px; text-align: left; font-weight: 600; color: #5a5a6e; background: #faf8f6; border-bottom: 1px solid #eeeae6; white-space: nowrap; font-size: 12px; }
.data-table td { padding: 9px 8px; color: #1a1a2e; border-bottom: 1px solid #f5f3f0; white-space: nowrap; font-size: 12px; }
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 11px; color: #9a9aae; }
.loading-center { padding: 60px 0; }
.sub-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; }
.page-info { font-size: 12px; color: #9a9aae; }
.tag-green { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #e8f8ee; color: #07c160; font-weight: 500; }
.tag-gray { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #f0ece8; color: #9a9aae; font-weight: 500; }
.btn-act { border-color: #e8573a !important; color: #e8573a !important; font-size: 11px; padding: 0 8px; height: 24px; }
.btn-ban { border-color: #c62828 !important; color: #c62828 !important; font-size: 11px; padding: 0 8px; height: 24px; }
.btn-unban { border-color: #2e7d32 !important; color: #2e7d32 !important; font-size: 11px; padding: 0 8px; height: 24px; }
.cell-actions { display: flex; gap: 4px; }
.dialog-body { padding: 12px 20px 20px; }
.field-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f3f0; }
.field-label { width: 80px; flex-shrink: 0; font-size: 13px; color: #5a5a6e; }
.field-row .van-field { flex: 1; padding: 0; }
.err-msg { color: #e8573a; font-size: 12px; margin-top: 8px; text-align: center; }
.dialog-actions { display: flex; gap: 12px; margin-top: 20px; }
.dialog-actions .van-button { flex: 1; height: 40px; font-size: 14px; }
.dialog-btn-primary { background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; }
.dialog-btn-cancel { border-color: #d0ccc8 !important; color: #5a5a6e !important; }
</style>
