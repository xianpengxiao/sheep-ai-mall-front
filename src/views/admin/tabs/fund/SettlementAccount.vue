<template>
  <div class="sub-page">
    <div class="sub-toolbar">
      <div class="sub-search">
        <van-icon name="search" size="14" color="#c8c4c0" />
        <input v-model="keyword" placeholder="店铺名称关键词..." @keyup.enter="handleSearch" />
        <van-icon v-if="keyword" name="close" size="12" color="#c8c4c0" class="search-clear" @click="clearSearch" />
      </div>
      <van-button round size="small" class="sub-search-btn" @click="handleSearch">搜索</van-button>
    </div>
    <div class="sub-table-wrap">
      <van-loading v-if="loading" class="loading-center" size="24" />
      <table v-else class="data-table">
        <thead><tr>
          <th>ID</th><th>商家ID</th><th>店铺名称</th><th>账户类型</th><th>开户人</th>
          <th>银行卡号</th><th>支付宝</th><th>微信</th><th>开户行</th>
          <th>结算费率(%)</th><th>结算周期</th><th>提现权限</th><th>绑定状态</th><th>创建时间</th>
          <th v-if="hasPerm('fund:account:edit')">操作</th>
        </tr></thead>
        <tbody>
          <tr v-if="list.length === 0"><td colspan="15" class="empty-cell">暂无数据</td></tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.id }}</td><td>{{ row.merchantId }}</td><td>{{ row.shopName }}</td>
            <td>{{ {BANK:'银行卡',ALIPAY:'支付宝',WECHAT:'微信'}[row.accountType] || row.accountType || '--' }}</td>
            <td>{{ row.accountHolder || '--' }}</td>
            <td>{{ row.cardNumber || '--' }}</td><td>{{ row.alipayAccount || '--' }}</td><td>{{ row.wechatAccount || '--' }}</td>
            <td>{{ row.bankName || '--' }}</td><td>{{ row.settlementRate ?? '--' }}</td><td>{{ row.settlementCycle || '--' }}</td>
            <td><span :class="row.withdrawEnabled === 1 ? 'tag-green' : 'tag-red'">{{ row.withdrawEnabled === 1 ? '启用' : '禁用' }}</span></td>
            <td><span :class="row.bindingStatus === 1 ? 'tag-green' : 'tag-gray'">{{ row.bindingStatus === 1 ? '已绑定' : '未绑定' }}</span></td>
            <td class="cell-time">{{ row.createTime }}</td>
            <td v-if="hasPerm('fund:account:edit')"><van-button size="mini" round plain class="btn-act" @click="openEdit(row)">编辑</van-button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="sub-pagination" v-if="total > 0">
      <van-pagination v-model="page" :page-count="pageCount" mode="simple" @change="loadData" />
      <span class="page-info">共 {{ total }} 条</span>
    </div>
    <van-dialog v-model:show="showEdit" title="编辑结算账户" :show-confirm-button="false" closeable close-icon-position="top-left">
      <div class="dialog-body">
        <div class="field-row"><span class="field-label">结算费率(%)</span><van-field v-model="editForm.settlementRate" type="digit" placeholder="0~100" input-align="right" /></div>
        <div class="field-row"><span class="field-label">结算周期</span><van-field v-model="editForm.settlementCycle" placeholder="T+1 或 T+7" input-align="right" /></div>
        <div class="field-row"><span class="field-label">提现权限</span><van-field v-model="editForm.withdrawEnabledText" readonly is-link @click="showWp = true" input-align="right" /></div>
        <div class="dialog-actions">
          <van-button round class="dialog-btn-cancel" @click="showEdit = false">取消</van-button>
          <van-button round class="dialog-btn-primary" @click="handleSave" :loading="saving">保存</van-button>
        </div>
      </div>
    </van-dialog>
    <van-action-sheet v-model:show="showWp" title="选择提现权限">
      <div class="sheet-list"><div class="sheet-item" @click="setWp('1')">启用</div><div class="sheet-item" @click="setWp('0')">禁用</div></div>
    </van-action-sheet>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { getSettlementAccountPage, getSettlementAccount, updateSettlementAccount } from '../../../../api/fund.js'
import { useUserStore } from '../../../../stores/user.js'
const us = useUserStore()
function hasPerm(p) { return Array.isArray(us.permissions) && us.permissions.includes(p) }
const keyword = ref(''); const page = ref(1); const total = ref(0); const size = 10
const list = ref([]); const loading = ref(false)
const pageCount = computed(() => Math.ceil(total.value / size) || 1)
const showEdit = ref(false); const saving = ref(false); const showWp = ref(false)
const editForm = ref({ settlementRate: '', settlementCycle: '', withdrawEnabled: '', withdrawEnabledText: '' })
const editingId = ref(null)
function setWp(v) { editForm.value.withdrawEnabled = v; editForm.value.withdrawEnabledText = v === '1' ? '启用' : '禁用'; showWp.value = false }
async function loadData() {
  loading.value = true
  try { const r = await getSettlementAccountPage({ pageNum: page.value, pageSize: size, keyword: keyword.value }); list.value = r?.records || []; total.value = r?.total || 0 }
  catch { list.value = []; total.value = 0 }
  finally { loading.value = false }
}
function handleSearch() { page.value = 1; loadData() }
function clearSearch() { keyword.value = ''; page.value = 1; loadData() }
async function openEdit(row) {
  editingId.value = row.merchantId
  try { const d = await getSettlementAccount(row.merchantId); editForm.value = { settlementRate: String(d.settlementRate ?? ''), settlementCycle: d.settlementCycle || '', withdrawEnabled: String(d.withdrawEnabled ?? ''), withdrawEnabledText: d.withdrawEnabled === 1 ? '启用' : '禁用' } }
  catch { editForm.value = { settlementRate: String(row.settlementRate ?? ''), settlementCycle: row.settlementCycle || '', withdrawEnabled: String(row.withdrawEnabled ?? ''), withdrawEnabledText: row.withdrawEnabled === 1 ? '启用' : '禁用' } }
  showEdit.value = true
}
async function handleSave() {
  const data = {}
  if (editForm.value.settlementRate !== '') { const n = Number(editForm.value.settlementRate); if (n < 0 || n > 100) return showToast('费率须在0~100之间'); data.settlementRate = n }
  if (editForm.value.settlementCycle) data.settlementCycle = editForm.value.settlementCycle
  if (editForm.value.withdrawEnabled !== '') data.withdrawEnabled = Number(editForm.value.withdrawEnabled)
  if (Object.keys(data).length === 0) return showToast('请至少修改一个字段')
  saving.value = true
  try { await updateSettlementAccount(editingId.value, data); showToast('保存成功'); showEdit.value = false; loadData() }
  catch { /* */ } finally { saving.value = false }
}
onMounted(loadData)
</script>
<style scoped>
.sub-page { font-size: 13px; }
.sub-toolbar { display: flex; gap: 10px; margin-bottom: 14px; }
.sub-search { display: flex; align-items: center; gap: 6px; background: #fff; border: 1.5px solid #eeeae6; border-radius: 10px; padding: 0 12px; max-width: 280px; }
.sub-search input { flex: 1; border: none; outline: none; font-size: 13px; padding: 8px 0; background: transparent; color: #1a1a2e; }
.sub-search input::placeholder { color: #c8c4c0; }
.search-clear { cursor: pointer; }
.sub-search-btn { height: 34px; font-size: 13px; font-weight: 500; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; padding: 0 16px; }
.sub-table-wrap { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.data-table { width: 100%; min-width: 1200px; border-collapse: collapse; }
.data-table th { padding: 11px 8px; text-align: left; font-weight: 600; color: #5a5a6e; background: #faf8f6; border-bottom: 1px solid #eeeae6; white-space: nowrap; font-size: 12px; }
.data-table td { padding: 9px 8px; color: #1a1a2e; border-bottom: 1px solid #f5f3f0; white-space: nowrap; font-size: 12px; }
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 11px; color: #9a9aae; }
.loading-center { padding: 60px 0; }
.sub-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; }
.page-info { font-size: 12px; color: #9a9aae; }
.tag-green { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #e8f8ee; color: #07c160; font-weight: 500; }
.tag-red { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #fde8e5; color: #e8573a; font-weight: 500; }
.tag-gray { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #f0ece8; color: #9a9aae; font-weight: 500; }
.btn-act { border-color: #e8573a !important; color: #e8573a !important; font-size: 11px; padding: 0 8px; height: 24px; }
.dialog-body { padding: 12px 20px 20px; }
.field-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f3f0; }
.field-label { width: 80px; flex-shrink: 0; font-size: 13px; color: #5a5a6e; }
.field-row .van-field { flex: 1; padding: 0; }
.dialog-actions { display: flex; gap: 12px; margin-top: 20px; }
.dialog-actions .van-button { flex: 1; height: 40px; font-size: 14px; }
.dialog-btn-primary { background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; }
.dialog-btn-cancel { border-color: #d0ccc8 !important; color: #5a5a6e !important; }
.sheet-list { padding: 8px 16px 24px; }
.sheet-item { padding: 12px 0; text-align: center; font-size: 14px; color: #1a1a2e; cursor: pointer; border-bottom: 1px solid #f0ece8; }
.sheet-item:last-child { border-bottom: none; }
.sheet-item:active { background: #f5f3f0; }
</style>
