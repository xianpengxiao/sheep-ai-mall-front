<template>
  <div class="sub-page">
    <div class="sub-toolbar">
      <div class="sub-search"><input v-model="merchantId" placeholder="商家ID" @keyup.enter="handleSearch" /></div>
      <select v-model="statusFilter" class="status-select" @change="handleSearch">
        <option value="">全部状态</option><option value="0">待审核</option><option value="1">待打款</option><option value="2">已打款</option><option value="3">已驳回</option>
      </select>
      <van-button round size="small" class="sub-search-btn" @click="handleSearch">搜索</van-button>
    </div>
    <div class="sub-table-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <table v-else class="data-table">
        <thead><tr><th>ID</th><th>提现单号</th><th>店铺名称</th><th>提现金额</th><th>手续费</th><th>实际到账</th><th>账户类型</th><th>账户信息</th><th>状态</th><th>驳回原因</th><th>审核人</th><th>审核时间</th><th>申请时间</th><th v-if="hasAuditPerm">操作</th></tr></thead>
        <tbody>
          <tr v-if="list.length === 0"><td colspan="14" class="empty-cell">暂无数据</td></tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.id }}</td><td>{{ row.withdrawNo }}</td><td>{{ row.shopName }}</td>
            <td class="cell-amount">{{ row.amount ?? '--' }}</td><td class="cell-amount">{{ row.fee ?? '--' }}</td><td class="cell-amount">{{ row.actualAmount ?? '--' }}</td>
            <td>{{ {BANK:'银行卡',ALIPAY:'支付宝',WECHAT:'微信'}[row.accountType] || row.accountType || '--' }}</td>
            <td>{{ row.accountInfo || '--' }}</td>
            <td><span :class="'ws-' + row.status">{{ {0:'待审核',1:'待打款',2:'已打款',3:'已驳回'}[row.status] || row.status }}</span></td>
            <td>{{ row.rejectReason || '--' }}</td><td>{{ row.auditUserName || '--' }}</td>
            <td class="cell-time">{{ row.auditTime || '--' }}</td><td class="cell-time">{{ row.createTime }}</td>
            <td v-if="hasAuditPerm" class="cell-actions">
              <van-button v-if="row.status === 0" size="mini" round plain class="btn-act" @click="openAudit(row)">审核</van-button>
              <van-button v-if="row.status === 1" size="mini" round plain class="btn-unban" @click="handleConfirm(row)">确认打款</van-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="sub-pagination" v-if="total > 0">
      <van-pagination v-model="page" :page-count="pageCount" mode="simple" @change="loadData" />
      <span class="page-info">共 {{ total }} 条</span>
    </div>

    <van-dialog v-model:show="showAudit" title="审核提现" :show-confirm-button="false" closeable close-icon-position="top-left">
      <div class="dialog-body">
        <div class="audit-info">提现金额：<strong class="cell-amount">{{ auditRow?.amount }}</strong> | 店铺：{{ auditRow?.shopName }}</div>
        <div class="field-row"><span class="field-label">审核结果</span>
          <van-radio-group v-model="auditPass" direction="horizontal" class="audit-radio">
            <van-radio :name="1">通过</van-radio>
            <van-radio :name="3">驳回</van-radio>
          </van-radio-group>
        </div>
        <div class="field-row" v-if="auditPass === 3"><span class="field-label">驳回原因</span><van-field v-model="rejectReason" placeholder="请填写驳回原因（必填）" /></div>
        <div v-if="auditErr" class="err-msg">{{ auditErr }}</div>
        <div class="dialog-actions">
          <van-button round class="dialog-btn-cancel" @click="showAudit = false">取消</van-button>
          <van-button round class="dialog-btn-primary" @click="handleAudit" :loading="auditing">确定</van-button>
        </div>
      </div>
    </van-dialog>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { getWithdrawPage, auditWithdraw, confirmWithdraw } from '../../../../api/fund.js'
import { useUserStore } from '../../../../stores/user.js'
const us = useUserStore()
const hasAuditPerm = computed(() => Array.isArray(us.permissions) && (us.permissions.includes('fund:withdraw:audit')))
const merchantId = ref(''); const statusFilter = ref('')
const page = ref(1); const total = ref(0); const size = 10
const list = ref([]); const loading = ref(false)
const pageCount = computed(() => Math.ceil(total.value / size) || 1)
const showAudit = ref(false); const auditing = ref(false); const auditPass = ref(1); const rejectReason = ref(''); const auditErr = ref(''); const auditRow = ref(null)
async function loadData() {
  loading.value = true
  try {
    const params = { pageNum: page.value, pageSize: size }
    if (merchantId.value) params.merchantId = merchantId.value
    if (statusFilter.value !== '') params.status = Number(statusFilter.value)
    const r = await getWithdrawPage(params); list.value = r?.records || []; total.value = r?.total || 0
  } catch { list.value = []; total.value = 0 }
  finally { loading.value = false }
}
function handleSearch() { page.value = 1; loadData() }
function openAudit(row) { auditRow.value = row; auditPass.value = 1; rejectReason.value = ''; auditErr.value = ''; showAudit.value = true }
async function handleAudit() {
  if (auditPass.value === 3 && !rejectReason.value) return showToast('驳回时请填写驳回原因')
  auditing.value = true; auditErr.value = ''
  try { await auditWithdraw(auditRow.value.id, { status: auditPass.value, rejectReason: rejectReason.value || undefined }); showToast(auditPass.value === 1 ? '审核通过' : '已驳回'); showAudit.value = false; loadData() }
  catch (e) { auditErr.value = e?.response?.data?.msg || e?.message || '操作失败' }
  finally { auditing.value = false }
}
async function handleConfirm(row) {
  try { await showConfirmDialog({ title: '确认打款', message: `确定已完成线下转账（金额：${row.amount}）？`, confirmButtonColor: '#e8573a' }); await confirmWithdraw(row.id); showToast('已确认打款'); loadData() }
  catch { /* */ }
}
onMounted(loadData)
</script>
<style scoped>
.sub-page { font-size: 13px; }
.sub-toolbar { display: flex; gap: 10px; margin-bottom: 14px; align-items: center; }
.sub-search { display: flex; align-items: center; background: #fff; border: 1.5px solid #eeeae6; border-radius: 10px; padding: 0 12px; max-width: 180px; }
.sub-search input { flex: 1; border: none; outline: none; font-size: 13px; padding: 8px 0; background: transparent; color: #1a1a2e; }
.sub-search input::placeholder { color: #c8c4c0; }
.status-select { border: 1.5px solid #eeeae6; border-radius: 10px; padding: 7px 8px; font-size: 12px; color: #1a1a2e; background: #fff; outline: none; }
.sub-search-btn { height: 34px; font-size: 13px; font-weight: 500; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 16px; }
.sub-table-wrap { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.data-table { width: 100%; min-width: 1200px; border-collapse: collapse; }
.data-table th { padding: 11px 8px; text-align: left; font-weight: 600; color: #5a5a6e; background: #faf8f6; border-bottom: 1px solid #eeeae6; white-space: nowrap; font-size: 12px; }
.data-table td { padding: 9px 8px; color: #1a1a2e; border-bottom: 1px solid #f5f3f0; white-space: nowrap; font-size: 12px; }
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 11px; color: #9a9aae; }
.cell-amount { font-weight: 600; color: #e8573a; }
.loading-center { padding: 60px 0; }
.sub-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; }
.page-info { font-size: 12px; color: #9a9aae; }
.cell-actions { display: flex; gap: 4px; }
.ws-0 { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #fff3e0; color: #f39c12; font-weight: 500; }
.ws-1 { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #e3f2fd; color: #1565c0; font-weight: 500; }
.ws-2 { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #e8f8ee; color: #07c160; font-weight: 500; }
.ws-3 { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #f0ece8; color: #9a9aae; font-weight: 500; }
.btn-act { border-color: #e8573a !important; color: #e8573a !important; font-size: 11px; padding: 0 8px; height: 24px; }
.btn-unban { border-color: #2e7d32 !important; color: #2e7d32 !important; font-size: 11px; padding: 0 8px; height: 24px; }
.dialog-body { padding: 12px 20px 20px; }
.audit-info { text-align: center; font-size: 14px; color: #1a1a2e; padding: 8px 0 14px; border-bottom: 1px solid #f5f3f0; margin-bottom: 8px; }
.field-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f3f0; }
.field-label { width: 72px; flex-shrink: 0; font-size: 13px; color: #5a5a6e; }
.field-row .van-field { flex: 1; padding: 0; }
.audit-radio { flex: 1; display: flex; gap: 16px; }
.err-msg { color: #e8573a; font-size: 12px; margin-top: 8px; text-align: center; }
.dialog-actions { display: flex; gap: 12px; margin-top: 20px; }
.dialog-actions .van-button { flex: 1; height: 40px; font-size: 14px; }
.dialog-btn-primary { background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; }
.dialog-btn-cancel { border-color: #d0ccc8 !important; color: #5a5a6e !important; }
</style>
