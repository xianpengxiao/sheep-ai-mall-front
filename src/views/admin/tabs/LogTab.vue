<template>
  <div class="log-tab">
    <!-- 日志类型切换 -->
    <div class="log-type-bar">
      <span
        v-for="t in logTypes" :key="t.key"
        class="log-type-item" :class="{ active: logType === t.key }"
        @click="switchType(t.key)"
      >{{ t.label }}</span>
    </div>

    <!-- 筛选栏 -->
    <div class="log-filter">
      <template v-if="logType === 'operate'">
        <select v-model="filters.module" class="log-input">
          <option value="">全部模块</option>
          <option v-for="m in modules" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <input v-model="filters.operatorName" class="log-input" placeholder="操作人" />
        <select v-model="filters.status" class="log-input">
          <option value="">全部结果</option>
          <option value="1">成功</option>
          <option value="0">失败</option>
        </select>
      </template>
      <template v-else>
        <input v-model="filters.account" class="log-input" placeholder="登录账号" />
        <select v-model="filters.status" class="log-input">
          <option value="">全部结果</option>
          <option value="SUCCESS">成功</option>
          <option value="FAIL">失败</option>
        </select>
      </template>
      <input v-model="filters.startTime" class="log-input" type="datetime-local" />
      <input v-model="filters.endTime" class="log-input" type="datetime-local" />
      <button class="log-btn" @click="search">查询</button>
      <button class="log-btn plain" @click="reset">重置</button>
    </div>

    <!-- 操作日志表格 -->
    <div v-if="logType === 'operate'" class="log-table-wrap">
      <table class="log-table">
        <thead>
          <tr>
            <th>时间</th><th>模块</th><th>操作</th><th>操作人</th>
            <th>IP / 归属地</th><th>设备</th><th>耗时</th><th>结果</th><th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ fmtTime(row.createTime) }}</td>
            <td>{{ moduleLabel(row.module) }}</td>
            <td>
              <div class="log-title">{{ row.title }}</div>
              <div class="log-sub">{{ row.requestMethod }} {{ row.requestUri }}</div>
            </td>
            <td>{{ row.operatorName || '-' }}<span class="log-sub">（{{ row.operatorType }}）</span></td>
            <td>
              <div>{{ row.ip || '-' }}</div>
              <div class="log-sub">{{ row.region || '' }}</div>
            </td>
            <td>{{ row.os || '-' }} / {{ row.browser || '-' }}</td>
            <td>{{ row.executionTime != null ? row.executionTime + 'ms' : '-' }}</td>
            <td>
              <span class="log-status" :class="row.status === 1 ? 'ok' : 'fail'">
                {{ row.status === 1 ? '成功' : '失败' }}
              </span>
              <div v-if="row.status === 0 && row.errorMsg" class="log-sub fail-text">{{ row.errorMsg }}</div>
            </td>
            <td><span class="log-detail-link" @click="openDetail(row)">详情</span></td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="9" class="log-empty">暂无日志</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 登录日志表格 -->
    <div v-else class="log-table-wrap">
      <table class="log-table">
        <thead>
          <tr>
            <th>时间</th><th>账号</th><th>登录方式</th>
            <th>IP / 归属地</th><th>设备</th><th>结果</th><th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ fmtTime(row.loginTime) }}</td>
            <td>{{ row.account || '-' }}</td>
            <td>{{ loginTypeLabel(row.loginType) }}</td>
            <td>
              <div>{{ row.ip || '-' }}</div>
              <div class="log-sub">{{ row.region || '' }}</div>
            </td>
            <td>{{ row.os || '-' }} / {{ row.browser || '-' }}</td>
            <td>
              <span class="log-status" :class="row.status === 'SUCCESS' ? 'ok' : 'fail'">
                {{ row.status === 'SUCCESS' ? '成功' : '失败' }}
              </span>
              <div v-if="row.status === 'FAIL' && row.failReason" class="log-sub fail-text">{{ row.failReason }}</div>
            </td>
            <td><span class="log-detail-link" @click="openDetail(row)">详情</span></td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="7" class="log-empty">暂无日志</td></tr>
        </tbody>
      </table>
    </div>

    <van-pagination
      v-if="total > 0"
      v-model="pageNum" :total-items="total" :items-per-page="pageSize"
      class="log-pagination" @change="load"
    />

    <!-- 日志详情弹窗 -->
    <van-popup v-model:show="showDetail" position="center" class="log-detail-popup" closeable round>
      <div class="log-detail-body">
        <div class="log-detail-title">{{ logType === 'operate' ? '操作日志详情' : '登录日志详情' }}</div>
        <div v-for="f in detailFields" :key="f.label" class="log-detail-row">
          <span class="log-detail-label">{{ f.label }}</span>
          <span class="log-detail-value" :class="{ pre: f.pre }">{{ f.value || '-' }}</span>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { pageOperateLogs, pageLoginLogs } from '../../../api/adminLog.js'

const logTypes = [
  { key: 'operate', label: '操作日志' },
  { key: 'login', label: '登录日志' },
]
const modules = [
  { value: 'auth', label: '认证' },
  { value: 'merchant', label: '商家' },
  { value: 'goods', label: '商品' },
  { value: 'order', label: '订单' },
  { value: 'aftersale', label: '售后' },
  { value: 'fund', label: '资金' },
  { value: 'cs', label: '客服' },
  { value: 'config', label: '配置' },
]

const logType = ref('operate')
const rows = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = 10
const loading = ref(false)
const filters = reactive({ module: '', operatorName: '', account: '', status: '', startTime: '', endTime: '' })

function switchType(key) {
  logType.value = key
  pageNum.value = 1
  load()
}

function search() {
  pageNum.value = 1
  load()
}

function reset() {
  Object.keys(filters).forEach(k => { filters[k] = '' })
  search()
}

function toServerTime(v) {
  // datetime-local 值 "2026-10-26T14:30" → "2026-10-26 14:30:00"
  return v ? v.replace('T', ' ') + (v.length === 16 ? ':00' : '') : ''
}

async function load() {
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value, pageSize,
      startTime: toServerTime(filters.startTime),
      endTime: toServerTime(filters.endTime),
    }
    let data
    if (logType.value === 'operate') {
      Object.assign(params, {
        module: filters.module || undefined,
        operatorName: filters.operatorName || undefined,
        status: filters.status === '' ? undefined : Number(filters.status),
      })
      data = await pageOperateLogs(params)
    } else {
      Object.assign(params, {
        account: filters.account || undefined,
        status: filters.status || undefined,
      })
      data = await pageLoginLogs(params)
    }
    rows.value = data?.records || []
    total.value = data?.total || 0
  } catch (e) {
    showToast(e?.response?.data?.msg || '日志加载失败')
  } finally {
    loading.value = false
  }
}

function fmtTime(t) {
  return t ? String(t).replace('T', ' ').slice(0, 19) : '-'
}

function moduleLabel(m) {
  return modules.find(x => x.value === m)?.label || m || '-'
}

function loginTypeLabel(t) {
  return { PASSWORD: '密码', SMS_CODE: '短信验证码', EMAIL_CODE: '邮箱验证码' }[t] || t || '-'
}

// ── 日志详情弹窗 ──
const showDetail = ref(false)
const detailRow = ref(null)

function openDetail(row) {
  detailRow.value = row
  showDetail.value = true
}

/** 详情字段：行数据 → 有序字段列表（pre=true 的字段保留换行/JSON 原样展示） */
const detailFields = computed(() => {
  const r = detailRow.value
  if (!r) return []
  if (logType.value === 'operate') {
    return [
      { label: '时间', value: fmtTime(r.createTime) },
      { label: '模块 / 动作', value: `${moduleLabel(r.module)} / ${r.action}` },
      { label: '操作', value: r.title },
      { label: '操作人', value: `${r.operatorName || '-'}（${r.operatorType || '-'}，ID:${r.operatorId ?? '-'}）` },
      { label: '请求', value: `${r.requestMethod || ''} ${r.requestUri || ''}` },
      { label: '请求参数', value: r.requestParams, pre: true },
      { label: '自定义内容', value: r.content, pre: true },
      { label: 'IP / 归属地', value: `${r.ip || '-'} ${r.region || ''}` },
      { label: '设备', value: `${r.device || '-'} / ${r.os || '-'} / ${r.browser || '-'}` },
      { label: '耗时', value: r.executionTime != null ? r.executionTime + ' ms' : '-' },
      { label: '结果', value: r.status === 1 ? '成功' : '失败' },
      { label: '失败原因', value: r.errorMsg, pre: true },
    ]
  }
  return [
    { label: '时间', value: fmtTime(r.loginTime) },
    { label: '账号', value: r.account },
    { label: '用户ID', value: r.userId != null ? String(r.userId) : '-' },
    { label: '登录方式', value: loginTypeLabel(r.loginType) },
    { label: '结果', value: r.status === 'SUCCESS' ? '成功' : '失败' },
    { label: '失败原因', value: r.failReason, pre: true },
    { label: 'IP / 归属地', value: `${r.ip || '-'} ${r.region || ''}` },
    { label: '设备', value: `${r.device || '-'} / ${r.os || '-'} / ${r.browser || '-'}` },
  ]
})

onMounted(load)
</script>

<style scoped>
.log-tab { padding: 12px 16px; }
.log-type-bar { display: flex; gap: 8px; margin-bottom: 12px; }
.log-type-item {
  padding: 6px 18px; border-radius: 16px; font-size: 13px; cursor: pointer;
  background: #f5f3f0; color: #5a5a6e;
}
.log-type-item.active { background: #e8573a; color: #fff; }
.log-filter {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center;
}
.log-input {
  height: 32px; padding: 0 10px; border: 1px solid #e5e1dc; border-radius: 6px;
  font-size: 13px; background: #fff; color: #333;
}
.log-btn {
  height: 32px; padding: 0 16px; border: none; border-radius: 6px; cursor: pointer;
  background: #e8573a; color: #fff; font-size: 13px;
}
.log-btn.plain { background: #fff; color: #5a5a6e; border: 1px solid #e5e1dc; }
.log-table-wrap { overflow-x: auto; background: #fff; border-radius: 8px; }
.log-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.log-table th {
  text-align: left; padding: 10px 12px; color: #9a9aae; font-weight: 500;
  border-bottom: 1px solid #f0ece8; white-space: nowrap;
}
.log-table td { padding: 10px 12px; border-bottom: 1px solid #f7f5f2; color: #333; vertical-align: top; }
.log-title { font-weight: 500; }
.log-sub { font-size: 11px; color: #9a9aae; margin-top: 2px; word-break: break-all; }
.log-status { font-weight: 600; }
.log-status.ok { color: #07c160; }
.log-status.fail { color: #ee0a24; }
.fail-text { color: #ee0a24; }
.log-empty { text-align: center; color: #9a9aae; padding: 32px 0; }
.log-pagination { margin-top: 12px; justify-content: flex-end; }
.log-pagination :deep(.van-pagination__item) { border: none; background: transparent; color: #5a5a6e; }
.log-pagination :deep(.van-pagination__item--active) { color: #e8573a; font-weight: 600; }

/* ── 详情 ── */
.log-detail-link { color: #1989fa; cursor: pointer; font-size: 12px; }
.log-detail-popup { max-width: 640px; width: 90vw; max-height: 80vh; }
.log-detail-body { padding: 20px 18px; overflow-y: auto; max-height: 76vh; }
.log-detail-title { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 12px; }
.log-detail-row {
  display: flex; gap: 10px; padding: 6px 0; font-size: 13px;
  border-bottom: 1px dashed #f0ece8;
}
.log-detail-label { flex-shrink: 0; width: 92px; color: #9a9aae; }
.log-detail-value { flex: 1; color: #333; word-break: break-all; }
.log-detail-value.pre { white-space: pre-wrap; font-family: monospace; font-size: 12px; }
</style>
