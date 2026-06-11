<template>
  <div class="tab-merchant">
    <!-- 二级 Tab -->
    <div class="sub-tabs">
      <span v-for="st in subTabs" :key="st.key" class="sub-tab" :class="{ active: activeSub === st.key }" @click="activeSub = st.key">{{ st.label }}</span>
    </div>

    <!-- ═══════════════════ 商家列表 ═══════════════════ -->
    <div v-show="activeSub === 'list'">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <select v-model="listFilter.status" class="filter-select" @change="searchList">
          <option value="">全部</option>
          <option value="1">已开通</option>
          <option value="2">已关闭</option>
        </select>
        <div class="filter-search">
          <van-icon name="search" size="14" color="#c8c4c0" />
          <input v-model="listFilter.keyword" placeholder="搜索店铺名/联系人/手机号" @input="onSearchInput" />
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-wrap">
        <van-loading v-if="listLoading" class="loading-center" size="24" />
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>店铺</th><th>联系人</th><th>联系电话</th><th>状态</th><th>营业状态</th><th>创建时间</th>
              <th v-if="hasAnyActionPerm">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="merchantList.length === 0"><td :colspan="hasAnyActionPerm ? 7 : 6" class="empty-cell">{{ listFilter.keyword ? '未找到匹配的商家' : '暂无商家数据' }}</td></tr>
            <tr v-for="row in merchantList" :key="row.id" class="merchant-row" @click="showMerchantDetail(row)">
              <td>
                <div class="cell-shop">
                  <van-image v-if="row.shopLogo" :src="row.shopLogo" round width="36" height="36" class="shop-logo" />
                  <span v-else class="shop-logo-placeholder">{{ (row.shopName || '店')[0] }}</span>
                  <span class="shop-name">{{ row.shopName || '--' }}</span>
                </div>
              </td>
              <td>{{ row.contactName || '--' }}</td>
              <td>{{ row.contactPhone || '--' }}</td>
              <td><span class="status-tag" :class="statusClass(row.status)">{{ statusText(row.status) }}</span></td>
              <td><span class="shop-status-tag" :class="row.shopStatus === 1 ? 'on' : 'off'">{{ row.shopStatus === 1 ? '营业中' : '已打烊' }}</span></td>
              <td class="cell-time">{{ row.createTime ? fmt(row.createTime) : '--' }}</td>
              <td v-if="hasAnyActionPerm" class="cell-actions">
                <!-- 已开通 → 禁用 -->
                <van-button v-if="row.status === 1 && hasPerm('merchant:disable')" size="small" plain round class="btn-danger" @click.stop="handleToggle(row)">禁用</van-button>
                <!-- 已关闭 → 启用 -->
                <van-button v-if="row.status === 2 && hasPerm('merchant:disable')" size="small" plain round class="btn-success" @click.stop="handleToggle(row)">启用</van-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination-bar" v-if="merchantTotal > 0">
        <van-pagination v-model="listPage" :page-count="listPageCount" mode="simple" @change="loadMerchantList" />
        <span class="page-info">共 {{ merchantTotal }} 条</span>
      </div>
    </div>

    <!-- ═══════════════════ 入驻审核 ═══════════════════ -->
    <div v-show="activeSub === 'apply'">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <select v-model="applyFilter.status" class="filter-select" @change="searchApply">
          <option value="0">待审核</option>
          <option value="1">已通过</option>
          <option value="2">已驳回</option>
        </select>
        <div class="filter-search">
          <van-icon name="search" size="14" color="#c8c4c0" />
          <input v-model="applyFilter.keyword" placeholder="搜索店铺名/联系人/手机号" @input="onApplySearchInput" />
        </div>
      </div>

      <div class="table-wrap">
        <van-loading v-if="applyLoading" class="loading-center" size="24" />
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>店铺名称</th><th>申请人</th><th>联系人</th><th>联系电话</th><th>经营范围</th><th>状态</th><th>驳回原因</th><th>创建时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="applyList.length === 0"><td colspan="9" class="empty-cell">{{ applyFilter.keyword ? '未找到匹配的申请' : '暂无入驻申请' }}</td></tr>
            <tr v-for="row in applyList" :key="row.id">
              <td>
                <div class="cell-shop">
                  <span class="shop-name">{{ row.shopName || '--' }}</span>
                </div>
              </td>
              <td>{{ row.username || '--' }}</td>
              <td>{{ row.contactName || '--' }}</td>
              <td>{{ row.contactPhone || '--' }}</td>
              <td>{{ row.businessScope || '--' }}</td>
              <td><span class="status-tag" :class="applyStatusClass(row.status)">{{ applyStatusText(row.status) }}</span></td>
              <td>{{ row.auditRemark || '--' }}</td>
              <td class="cell-time">{{ row.createTime ? fmt(row.createTime) : '--' }}</td>
              <td class="cell-actions">
                <template v-if="row.status === 0">
                  <van-button size="small" plain round class="btn-primary" @click.stop="openApplyAudit(row)">审核</van-button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination-bar" v-if="applyTotal > 0">
        <van-pagination v-model="applyPage" :page-count="applyPageCount" mode="simple" @change="loadApplyList" />
        <span class="page-info">共 {{ applyTotal }} 条</span>
      </div>
    </div>

    <!-- ═══════════════════ 信息变更审核 ═══════════════════ -->
    <div v-show="activeSub === 'change'">
      <div class="table-wrap">
        <van-loading v-if="changeLoading" class="loading-center" size="24" />
        <table v-else class="data-table">
          <thead>
            <tr><th>店铺名称</th><th>变更字段</th><th>提交时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-if="changeList.length === 0"><td colspan="4" class="empty-cell">暂无待审核变更</td></tr>
            <tr v-for="item in changeList" :key="item.id">
              <td>{{ item.shopName || '--' }}</td>
              <td>
                <span v-for="(f, i) in parseFields(item.changedFields)" :key="i" class="field-badge">{{ fieldLabel(f) }}</span>
              </td>
              <td class="cell-time">{{ item.createTime ? fmt(item.createTime) : '--' }}</td>
              <td class="cell-actions">
                <van-button v-if="hasPerm('merchant:audit:info')" size="small" plain round class="btn-primary" @click="openChangeAudit(item)">审核</van-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination-bar" v-if="changeTotal > 0">
        <van-pagination v-model="changePage" :page-count="changePageCount" mode="simple" @change="loadChanges" />
        <span class="page-info">共 {{ changeTotal }} 条</span>
      </div>
    </div>

    <!-- ═══════════════════ 入驻审核弹窗 ═══════════════════ -->
    <van-dialog v-model:show="showApplyAudit" title="入驻审核" :show-confirm-button="false" closeable close-icon-position="top-left" class="audit-dialog">
      <div class="audit-body" v-if="applyTarget">
        <div class="audit-info-grid">
          <div class="info-row"><span class="info-label">店铺名称</span><span class="info-val">{{ applyTarget.shopName }}</span></div>
          <div class="info-row"><span class="info-label">申请人</span><span class="info-val">{{ applyTarget.username || '--' }}</span></div>
          <div class="info-row"><span class="info-label">联系人</span><span class="info-val">{{ applyTarget.contactName || '--' }}</span></div>
          <div class="info-row"><span class="info-label">联系电话</span><span class="info-val">{{ applyTarget.contactPhone || '--' }}</span></div>
          <div class="info-row"><span class="info-label">经营范围</span><span class="info-val">{{ applyTarget.businessScope || '--' }}</span></div>
          <div class="info-row"><span class="info-label">法人信息</span><span class="info-val">{{ applyTarget.legalPerson || '--' }}</span></div>
          <div class="info-row"><span class="info-label">经营地址</span><span class="info-val">{{ applyTarget.businessAddress || '--' }}</span></div>
          <div class="info-row" v-if="applyTarget.businessLicense">
            <span class="info-label">营业执照</span>
            <van-image :src="applyTarget.businessLicense" width="160" height="100" class="license-preview" @click="doPreview(applyTarget.businessLicense)" />
          </div>
          <div class="info-row" v-if="applyTarget.foodLicense">
            <span class="info-label">食品许可证</span>
            <van-image :src="applyTarget.foodLicense" width="160" height="100" class="license-preview" @click="doPreview(applyTarget.foodLicense)" />
          </div>
          <div class="info-row" v-if="applyTarget.auditRemark">
            <span class="info-label">驳回原因</span>
            <span class="info-val" style="color:#c62828">{{ applyTarget.auditRemark }}</span>
          </div>
        </div>
        <div class="audit-actions">
          <van-button v-if="applyTarget?.status === 0" round plain class="audit-btn" @click="openApplyReject">驳回</van-button>
          <van-button v-if="applyTarget?.status === 0" round class="audit-btn audit-btn-primary" @click="handleApplyApprove">通过入驻</van-button>
        </div>
      </div>
    </van-dialog>

    <!-- 入驻驳回弹窗 -->
    <van-dialog v-model:show="showApplyReject" title="驳回原因" show-cancel-button confirm-button-color="#e8573a" @confirm="confirmApplyReject">
      <van-field v-model="applyRejectMsg" label="驳回原因" type="textarea" :rows="3" autosize placeholder="请填写驳回原因" maxlength="200" />
    </van-dialog>

    <!-- ═══════════════════ 信息变更审核弹窗 ═══════════════════ -->
    <van-dialog v-model:show="showChangeAudit" title="变更审核" :show-confirm-button="false" closeable close-icon-position="top-left" class="audit-dialog change-dialog">
      <div class="audit-body" v-if="changeTarget">
        <div class="change-fields">
          <div class="change-field" v-for="f in changeFieldList" :key="f.key">
            <div class="change-field-label">{{ f.label }}</div>
            <div class="change-compare">
              <div class="change-old">
                旧值：
                <van-image v-if="f.isImg && f.oldVal" :src="f.oldVal" width="80" height="56" class="license-preview" @click="doPreview(f.oldVal)" />
                <span v-else>{{ f.isImg ? '--' : (f.oldVal ?? '--') }}</span>
              </div>
              <van-icon name="arrow" size="14" color="#e8573a" class="change-arrow" />
              <div class="change-new">
                新值：
                <van-image v-if="f.isImg" :src="f.newVal" width="80" height="56" class="license-preview" @click="doPreview(f.newVal)" />
                <span v-else>{{ f.newVal || '--' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="audit-actions">
          <van-button round plain class="audit-btn" @click="openChangeReject">驳回</van-button>
          <van-button round class="audit-btn audit-btn-primary" @click="handleChangeApprove">通过</van-button>
        </div>
      </div>
    </van-dialog>

    <!-- 变更驳回弹窗 -->
    <van-dialog v-model:show="showChangeReject" title="驳回原因" show-cancel-button confirm-button-color="#e8573a" @confirm="confirmChangeReject">
      <van-field v-model="changeRejectMsg" label="驳回原因" type="textarea" :rows="3" autosize placeholder="请填写驳回原因" maxlength="200" />
    </van-dialog>

    <!-- 图片预览 -->
    <van-image-preview v-model:show="previewShow" :images="previewImg ? [previewImg] : []" />

    <!-- ═══════════════════ 商家详情弹窗 ═══════════════════ -->
    <van-dialog v-model:show="showDetail" title="商家详情" closeable close-icon-position="top-left" class="detail-dialog" :show-confirm-button="false">
      <div class="detail-body" v-if="detailData">
        <!-- 店铺基本信息 -->
        <div class="detail-hd">
          <van-image v-if="detailData.shopLogo" :src="detailData.shopLogo" round width="48" height="48" class="detail-logo" />
          <span v-else class="detail-logo-placeholder">{{ (detailData.shopName || '店')[0] }}</span>
          <div class="detail-hd-info">
            <div class="detail-shop-name">{{ detailData.shopName }}</div>
            <div class="detail-shop-status">
              <span class="status-tag" :class="statusClass(detailData.status)">{{ statusText(detailData.status) }}</span>
              <span class="shop-status-tag" :class="detailData.shopStatus === 1 ? 'on' : 'off'">{{ detailData.shopStatus === 1 ? '营业中' : '已打烊' }}</span>
            </div>
          </div>
        </div>

        <!-- 评分 -->
        <div class="detail-section">
          <div class="detail-label">店铺评分</div>
          <div class="score-row">
            <div class="score-item">
              <span class="score-num">{{ detailData.describeScore ?? '--' }}</span>
              <span class="score-label">描述</span>
            </div>
            <div class="score-item">
              <span class="score-num">{{ detailData.serviceScore ?? '--' }}</span>
              <span class="score-label">服务</span>
            </div>
            <div class="score-item">
              <span class="score-num">{{ detailData.logisticsScore ?? '--' }}</span>
              <span class="score-label">物流</span>
            </div>
            <div class="score-item">
              <span class="score-num">{{ detailData.dsrCount ?? 0 }}</span>
              <span class="score-label">评价数</span>
            </div>
          </div>
        </div>

        <!-- 详细信息 -->
        <div class="detail-section">
          <div class="detail-label">基本信息</div>
          <div class="info-grid">
            <div class="info-row"><span class="info-label">店铺ID</span><span class="info-val">{{ detailData.id }}</span></div>
            <div class="info-row"><span class="info-label">用户ID</span><span class="info-val">{{ detailData.userId }}</span></div>
            <div class="info-row"><span class="info-label">店铺描述</span><span class="info-val">{{ detailData.shopDesc || '--' }}</span></div>
            <div class="info-row"><span class="info-label">店铺公告</span><span class="info-val">{{ detailData.shopNotice || '--' }}</span></div>
            <div class="info-row"><span class="info-label">营业时间</span><span class="info-val">{{ detailData.businessHours || '--' }}</span></div>
            <div class="info-row"><span class="info-label">售后信息</span><span class="info-val">{{ detailData.afterSaleInfo || '--' }}</span></div>
            <div class="info-row"><span class="info-label">经营范围</span><span class="info-val">{{ detailData.businessScope || '--' }}</span></div>
            <div class="info-row"><span class="info-label">法人信息</span><span class="info-val">{{ detailData.legalPerson || '--' }}</span></div>
            <div class="info-row"><span class="info-label">经营地址</span><span class="info-val">{{ detailData.businessAddress || '--' }}</span></div>
            <div class="info-row"><span class="info-label">联系人</span><span class="info-val">{{ detailData.contactName || '--' }}</span></div>
            <div class="info-row"><span class="info-label">联系电话</span><span class="info-val">{{ detailData.contactPhone || '--' }}</span></div>
            <div class="info-row"><span class="info-label">联系手机</span><span class="info-val">{{ detailData.verifiedContact || '--' }}</span></div>
          </div>
        </div>

        <!-- 营业执照 -->
        <div class="detail-section" v-if="detailData.businessLicense">
          <div class="detail-label">营业执照</div>
          <van-image :src="detailData.businessLicense" width="160" height="100" class="license-preview" @click="doPreview(detailData.businessLicense)" />
        </div>
      </div>
      <div class="detail-body" v-else>
        <van-loading class="loading-center" size="20" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { showToast, showConfirmDialog, showDialog } from 'vant'
import { useUserStore } from '../../../stores/user.js'
import {
  getMerchantList, getMerchantApplyPage, auditMerchantApply, toggleMerchantStatus,
  getPendingShopChanges, auditShopChange,
} from '../../../api/admin.js'
import { getMerchantInfo } from '../../../api/merchant.js'

const userStore = useUserStore()
function hasPerm(p) { return Array.isArray(userStore.permissions) && userStore.permissions.includes(p) }
const hasAnyActionPerm = computed(() => hasPerm('merchant:audit') || hasPerm('merchant:disable'))

const subTabs = [
  { key: 'list', label: '商家列表' },
  { key: 'apply', label: '入驻审核' },
  { key: 'change', label: '信息变更审核' },
]
const activeSub = ref('list')

// ══════ 商家列表 ══════

const listFilter = ref({ status: '', keyword: '' })
const merchantList = ref([])
const listLoading = ref(false)
const listPage = ref(1)
const merchantTotal = ref(0)
const size = 10
const listPageCount = computed(() => Math.ceil(merchantTotal.value / size) || 1)
let searchTimer = null

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { listPage.value = 1; loadMerchantList() }, 300)
}
function searchList() { listPage.value = 1; loadMerchantList() }

async function loadMerchantList() {
  listLoading.value = true
  try {
    const data = await getMerchantList({ pageNum: listPage.value, pageSize: size, status: listFilter.value.status || undefined, keyword: listFilter.value.keyword || undefined })
    merchantList.value = data?.records || []
    merchantTotal.value = data?.total || 0
  } catch { showToast('加载失败') }
  finally { listLoading.value = false }
}

function statusClass(s) {
  if (s === 0) return 'pending'
  if (s === 1) return 'on'
  return 'off'
}
function statusText(s) {
  if (s === 0) return '待审核'
  if (s === 1) return '已开通'
  return '已关闭'
}

// ── 禁用/启用 ──
async function handleToggle(row) {
  const isDisable = row.status === 1
  try {
    await showConfirmDialog({
      title: isDisable ? '禁用商家' : '启用商家',
      message: isDisable ? '确定要禁用该商家吗？禁用后商家无法登录后台，店铺在用户端不可见' : '确定要启用该商家吗？',
      confirmButtonColor: '#e8573a',
    })
    await toggleMerchantStatus(row.id, isDisable ? 2 : 1)
    showToast(isDisable ? '已禁用' : '已启用')
    loadMerchantList()
  } catch { /* cancelled */ }
}

// ══════ 入驻申请列表 ══════

const applyFilter = ref({ status: '0', keyword: '' })
const applyList = ref([])
const applyLoading = ref(false)
const applyPage = ref(1)
const applyTotal = ref(0)
const applyPageCount = computed(() => Math.ceil(applyTotal.value / size) || 1)
let applySearchTimer = null

function onApplySearchInput() {
  clearTimeout(applySearchTimer)
  applySearchTimer = setTimeout(() => { applyPage.value = 1; loadApplyList() }, 300)
}
function searchApply() { applyPage.value = 1; loadApplyList() }

async function loadApplyList() {
  applyLoading.value = true
  try {
    const params = { pageNum: applyPage.value, pageSize: size, status: applyFilter.value.status }
    if (applyFilter.value.keyword) params.keyword = applyFilter.value.keyword
    const data = await getMerchantApplyPage(params)
    applyList.value = data?.records || []
    applyTotal.value = data?.total || 0
  } catch { showToast('加载失败') }
  finally { applyLoading.value = false }
}

function applyStatusClass(s) {
  if (s === 0) return 'pending'
  if (s === 1) return 'on'
  return 'off'
}
function applyStatusText(s) {
  if (s === 0) return '待审核'
  if (s === 1) return '已通过'
  return '已驳回'
}

// ── 入驻审核 ──
const showApplyAudit = ref(false)
const applyTarget = ref(null)

function openApplyAudit(row) {
  applyTarget.value = row
  showApplyAudit.value = true
}

async function handleApplyApprove() {
  const target = applyTarget.value
  if (!target) return
  try {
    await auditMerchantApply(target.id, 1)
    showToast('入驻审核通过')
    showApplyAudit.value = false
    afterApplyDone(target)
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    if (msg.includes('已审核')) { showToast('该申请已审核'); showApplyAudit.value = false; afterApplyDone(target) }
  }
}

// 入驻驳回
const showApplyReject = ref(false)
const applyRejectMsg = ref('')

function openApplyReject() { applyRejectMsg.value = ''; showApplyReject.value = true }
async function confirmApplyReject() {
  if (!applyRejectMsg.value.trim()) { showToast('请填写驳回原因'); return false }
  const target = applyTarget.value
  try {
    await auditMerchantApply(target.id, 2, applyRejectMsg.value.trim())
    showToast('已驳回')
    showApplyReject.value = false
    showApplyAudit.value = false
    afterApplyDone(target)
    return true
  } catch { return false }
}

function afterApplyDone(item) {
  applyList.value = applyList.value.filter(i => i.id !== item.id)
  if (applyList.value.length === 0 && applyPage.value > 1) { applyPage.value--; loadApplyList() }
}

// ══════ 信息变更审核 ══════

const changeList = ref([])
const changeLoading = ref(false)
const changePage = ref(1)
const changeTotal = ref(0)
const changePageCount = computed(() => Math.ceil(changeTotal.value / size) || 1)

async function loadChanges() {
  changeLoading.value = true
  try {
    const data = await getPendingShopChanges({ pageNum: changePage.value, pageSize: size })
    changeList.value = data?.records || []
    changeTotal.value = data?.total || 0
  } catch { showToast('加载失败') }
  finally { changeLoading.value = false }
}

function parseFields(raw) {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : [])
    return arr
  } catch { return [] }
}

const fieldLabelMap = {
  legalPerson: '法人信息',
  businessAddress: '经营地址',
  contactName: '联系人',
  contactPhone: '联系电话',
  businessLicense: '营业执照',
  foodLicense: '食品许可证',
  shopLogo: '店铺 Logo',
  shopName: '店铺名称',
  shopDesc: '店铺描述',
  shopNotice: '店铺公告',
  businessHours: '营业时间',
  afterSaleInfo: '售后信息',
  businessScope: '经营范围',
  verifiedContact: '联系手机',
}
function fieldLabel(key) { return fieldLabelMap[key] || key }

// ── 变更审核弹窗 ──
const showChangeAudit = ref(false)
const changeTarget = ref(null)
const changeFieldList = ref([])

async function openChangeAudit(item) {
  changeTarget.value = item
  showChangeAudit.value = true
  changeFieldList.value = []
  // 获取商家当前信息作为旧值对照
  let oldData = {}
  try {
    const info = await getMerchantInfo(item.merchantId)
    oldData = info || {}
  } catch { /* 静默 */ }
  const fields = parseFields(item.changedFields)
  changeFieldList.value = fields.map(f => {
    const label = fieldLabelMap[f] || f
    const isImg = f === 'businessLicense' || f === 'foodLicense'
    return { key: f, label, oldVal: oldData[f], newVal: item[f], isImg }
  })
}

async function handleChangeApprove() {
  try {
    await auditShopChange(changeTarget.value.id, 1)
    showToast('变更已通过')
    showChangeAudit.value = false
    afterChangeDone()
  } catch (e) {
    const msg = e?.response?.data?.msg || ''
    if (msg.includes('已审核')) { showToast('该变更已审核'); showChangeAudit.value = false; afterChangeDone() }
  }
}

// 变更驳回
const showChangeReject = ref(false)
const changeRejectMsg = ref('')

function openChangeReject() { changeRejectMsg.value = ''; showChangeReject.value = true }
async function confirmChangeReject() {
  if (!changeRejectMsg.value.trim()) { showToast('请填写驳回原因'); return false }
  try {
    await auditShopChange(changeTarget.value.id, 2, changeRejectMsg.value.trim())
    showToast('已驳回')
    showChangeReject.value = false
    showChangeAudit.value = false
    afterChangeDone()
    return true
  } catch { return false }
}

function afterChangeDone() {
  changeList.value = changeList.value.filter(i => i.id !== changeTarget.value.id)
  if (changeList.value.length === 0 && changePage.value > 1) { changePage.value--; loadChanges() }
}

// ── 图片预览 ──
const previewShow = ref(false)
const previewImg = ref('')
function doPreview(url) { previewImg.value = url; previewShow.value = true }

// ── 商家详情 ──
const showDetail = ref(false)
const detailData = ref(null)

async function showMerchantDetail(row) {
  showDetail.value = true
  detailData.value = null
  try {
    const data = await getMerchantInfo(row.id)
    detailData.value = data
  } catch {
    showToast('加载商家详情失败')
  }
}

// Tab 切换懒加载
watch(activeSub, (val) => {
  if (val === 'apply' && applyList.value.length === 0 && !applyLoading.value) loadApplyList()
  if (val === 'change' && changeList.value.length === 0 && !changeLoading.value) loadChanges()
})

function fmt(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(loadMerchantList)
</script>

<style scoped>
.tab-merchant { font-size: 13px; }
.loading-center { padding: 60px 0; }

/* 二级 Tab */
.sub-tabs {
  display: flex; gap: 24px; margin-bottom: 16px; border-bottom: 1.5px solid #eeeae6;
}
.sub-tab {
  font-size: 13px; font-weight: 500; color: #5a5a6e; cursor: pointer;
  padding: 8px 0; border-bottom: 2px solid transparent; transition: color 0.15s;
}
.sub-tab:hover { color: #1a1a2e; }
.sub-tab.active { color: #1a1a2e; font-weight: 600; border-bottom-color: #e8573a; }

/* 筛选栏 */
.filter-bar {
  display: flex; gap: 10px; margin-bottom: 14px; align-items: center;
}
.filter-select {
  border: 1.5px solid #eeeae6; border-radius: 8px; padding: 7px 10px;
  font-size: 13px; color: #1a1a2e; background: #fff; outline: none;
  min-width: 100px;
}
.filter-search {
  display: flex; align-items: center; gap: 8px;
  background: #fff; border: 1.5px solid #eeeae6; border-radius: 8px;
  padding: 0 12px; flex: 1; max-width: 280px;
}
.filter-search input {
  flex: 1; border: none; outline: none; font-size: 13px;
  padding: 8px 0; background: transparent; color: #1a1a2e;
}
.filter-search input::placeholder { color: #c8c4c0; }

/* 表格 */
.table-wrap { overflow-x: auto; }
.data-table {
  width: 100%; min-width: 820px; border-collapse: collapse;
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.data-table th {
  padding: 11px 10px; text-align: left; font-weight: 600;
  color: #5a5a6e; background: #faf8f6;
  border-bottom: 1px solid #eeeae6; white-space: nowrap; font-size: 12px;
}
.data-table td {
  padding: 10px; color: #1a1a2e;
  border-bottom: 1px solid #f5f3f0; white-space: nowrap;
}
.data-table tbody tr:hover { background: #faf8f6; }
.empty-cell { text-align: center; color: #9a9aae; padding: 40px 0 !important; }
.cell-time { font-size: 12px; color: #5a5a6e; }
.cell-actions { white-space: nowrap; display: flex; gap: 6px; }

/* 店铺列 */
.cell-shop { display: flex; align-items: center; gap: 8px; }
.shop-logo { flex-shrink: 0; }
.shop-logo-placeholder {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%);
  color: #fff; font-size: 15px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.shop-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }

/* 状态标签 */
.status-tag { display: inline-block; font-size: 11px; padding: 2px 10px; border-radius: 10px; font-weight: 500; }
.status-tag.pending { background: #fff3e0; color: #e65100; }
.status-tag.on { background: #e8f8e8; color: #2e7d32; }
.status-tag.off { background: #fdecea; color: #c62828; }

.shop-status-tag { font-size: 11px; font-weight: 500; }
.shop-status-tag.on { color: #2e7d32; }
.shop-status-tag.off { color: #9a9aae; }

/* 变更字段标签 */
.field-badge {
  display: inline-block; font-size: 11px; padding: 1px 8px;
  background: #f0ece8; border-radius: 4px; color: #5a5a6e; margin-right: 4px; font-weight: 500;
}

/* 按钮 */
.btn-primary { border-color: #e8573a !important; color: #e8573a !important; font-size: 12px; padding: 0 10px; }
.btn-danger { border-color: #c62828 !important; color: #c62828 !important; font-size: 12px; padding: 0 10px; }
.btn-success { border-color: #2e7d32 !important; color: #2e7d32 !important; font-size: 12px; padding: 0 10px; }

/* 分页 */
.pagination-bar {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; margin-top: 16px;
}
.page-info { font-size: 12px; color: #9a9aae; }

/* ── 审核弹窗 ── */
.audit-dialog :deep(.van-dialog__header) { font-weight: 600; font-size: 16px; padding: 16px 20px 0; }
.audit-body { padding: 12px 20px 20px; max-height: 500px; overflow-y: auto; }
.audit-info-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.info-row { display: flex; gap: 10px; font-size: 13px; }
.info-label { color: #9a9aae; width: 80px; flex-shrink: 0; }
.info-val { color: #1a1a2e; font-weight: 500; }
.license-preview { border-radius: 6px; overflow: hidden; cursor: pointer; }
.audit-actions { display: flex; gap: 12px; justify-content: center; }
.audit-btn { flex: 1; height: 40px; font-size: 14px; }
.audit-btn-primary {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important;
}
.audit-btn-danger {
  border-color: #c62828 !important; color: #c62828 !important;
}

/* ── 行点击 ── */
.merchant-row { cursor: pointer; }

/* ── 商家详情弹窗 ── */
.detail-dialog :deep(.van-dialog__header) { font-weight: 600; font-size: 16px; padding: 16px 20px 0; }
.detail-body { padding: 16px 20px 20px; max-height: 520px; overflow-y: auto; }
.detail-hd { display: flex; gap: 14px; align-items: center; margin-bottom: 16px; }
.detail-logo { flex-shrink: 0; }
.detail-logo-placeholder {
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%);
  color: #fff; font-size: 18px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.detail-hd-info { flex: 1; min-width: 0; }
.detail-shop-name { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
.detail-shop-status { display: flex; gap: 8px; align-items: center; }
.detail-section { margin-bottom: 16px; }
.detail-label { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; }
.score-row { display: flex; gap: 16px; }
.score-item { text-align: center; min-width: 56px; padding: 8px 0; background: #faf8f6; border-radius: 8px; flex: 1; }
.score-num { display: block; font-size: 18px; font-weight: 700; color: #e8573a; }
.score-label { font-size: 11px; color: #9a9aae; margin-top: 2px; display: block; }
.info-grid { display: flex; flex-direction: column; gap: 8px; }
.info-grid .info-row { font-size: 13px; }

/* 变更审核弹窗 */
.change-dialog :deep(.van-dialog) { width: 500px; }
.change-fields { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.change-field { padding: 10px; background: #faf8f6; border-radius: 8px; }
.change-field-label { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-bottom: 4px; }
.change-field-new { font-size: 13px; color: #5a5a6e; }
.change-compare { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; }
.change-old { flex: 1; color: #9a9aae; text-decoration: line-through; }
.change-new { flex: 1; color: #2e7d32; font-weight: 500; }
.change-arrow { flex-shrink: 0; margin-top: 2px; }
</style>
