<template>
  <div class="fund-section">
    <!-- 可用余额 -->
    <div class="balance-card">
      <div class="balance-label">可用余额</div>
      <div class="balance-num">¥{{ balance ?? '--' }}</div>
      <van-button v-if="withdrawEnabled !== 0" round size="small" class="balance-btn" @click="$emit('go-withdraw')">提现</van-button>
      <div v-if="withdrawEnabled === 0" class="withdraw-disabled-tip">提现功能已关闭</div>
    </div>

    <!-- 已绑定：展示账户信息 -->
    <div v-if="account" class="info-card">
      <div class="info-title">结算账户</div>
      <div class="info-row"><span class="info-lbl">类型</span><span class="info-val">{{ typeMap[account.accountType] || account.accountType }}</span></div>
      <div class="info-row"><span class="info-lbl">开户人</span><span class="info-val">{{ account.accountHolder }}</span></div>
      <div class="info-row" v-if="account.cardNumber"><span class="info-lbl">卡号</span><span class="info-val">{{ account.cardNumber }}</span></div>
      <div class="info-row" v-if="account.alipayAccount"><span class="info-lbl">支付宝</span><span class="info-val">{{ account.alipayAccount }}</span></div>
      <div class="info-row" v-if="account.wechatAccount"><span class="info-lbl">微信</span><span class="info-val">{{ account.wechatAccount }}</span></div>
      <div class="info-row" v-if="account.bankName"><span class="info-lbl">开户行</span><span class="info-val">{{ account.bankName }}<span v-if="account.branchBankName"> {{ account.branchBankName }}</span></span></div>
      <van-button round size="small" plain class="modify-btn" @click="showForm = true">修改</van-button>
    </div>

    <!-- 未绑定：绑定表单 -->
    <div v-else class="info-card">
      <div class="info-title">绑定结算账户</div>
      <div class="form-row">
        <span class="form-lbl">账户类型</span>
        <select v-model="form.accountType" class="form-select" @change="onTypeChange">
          <option value="BANK">银行卡</option><option value="ALIPAY">支付宝</option><option value="WECHAT">微信</option>
        </select>
      </div>
      <div class="form-row"><span class="form-lbl">开户人</span><van-field v-model="form.accountHolder" placeholder="请输入开户人姓名" input-align="right" /></div>
      <template v-if="form.accountType === 'BANK'">
        <div class="form-row"><span class="form-lbl">银行卡号</span><van-field v-model="form.cardNumber" type="digit" placeholder="请输入银行卡号" input-align="right" /></div>
        <div class="form-row"><span class="form-lbl">开户行</span><van-field v-model="form.bankName" placeholder="如：中国工商银行" input-align="right" /></div>
        <div class="form-row"><span class="form-lbl">支行</span><van-field v-model="form.branchBankName" placeholder="可选" input-align="right" /></div>
      </template>
      <template v-if="form.accountType === 'ALIPAY'">
        <div class="form-row"><span class="form-lbl">支付宝账号</span><van-field v-model="form.alipayAccount" placeholder="请输入支付宝账号" input-align="right" /></div>
      </template>
      <template v-if="form.accountType === 'WECHAT'">
        <div class="form-row"><span class="form-lbl">微信账号</span><van-field v-model="form.wechatAccount" placeholder="请输入微信账号" input-align="right" /></div>
      </template>
      <div v-if="errMsg" class="err-msg">{{ errMsg }}</div>
      <van-button round block class="fund-btn" @click="handleSave" :loading="saving">保存绑定</van-button>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { getAccount, saveAccount, getBalance } from '../../../api/merchant_fund.js'

const emit = defineEmits(['go-withdraw'])

const typeMap = { BANK: '银行卡', ALIPAY: '支付宝', WECHAT: '微信' }

const account = ref(null)
const balance = ref(null)
const withdrawEnabled = ref(1)
const showForm = ref(false)
const saving = ref(false)
const errMsg = ref('')
const form = ref({ accountType: 'BANK', accountHolder: '', cardNumber: '', alipayAccount: '', wechatAccount: '', bankName: '', branchBankName: '' })

function onTypeChange() {
  // 切换类型时清除对应字段
  form.value.cardNumber = ''
  form.value.alipayAccount = ''
  form.value.wechatAccount = ''
  form.value.bankName = ''
  form.value.branchBankName = ''
}

async function fetchAccount() {
  try {
    const d = await getAccount()
    account.value = d
    withdrawEnabled.value = d.withdrawEnabled
  } catch {
    account.value = null
  }
}

async function fetchBalance() {
  try { balance.value = await getBalance() } catch { /* silent */ }
}

async function handleSave() {
  errMsg.value = ''
  if (!form.value.accountHolder) return showToast('请输入开户人姓名')
  if (form.value.accountType === 'BANK' && !form.value.cardNumber) return showToast('请输入银行卡号')
  if (form.value.accountType === 'ALIPAY' && !form.value.alipayAccount) return showToast('请输入支付宝账号')
  if (form.value.accountType === 'WECHAT' && !form.value.wechatAccount) return showToast('请输入微信账号')
  saving.value = true
  try {
    await saveAccount({ ...form.value })
    showToast('绑定成功')
    await fetchAccount()
    await fetchBalance()
  } catch (e) { errMsg.value = e?.response?.data?.msg || e?.message || '操作失败' }
  finally { saving.value = false }
}

defineExpose({ fetchAccount, fetchBalance })

onMounted(() => { fetchAccount(); fetchBalance() })
</script>
<style scoped>
.fund-section { padding: 0 0 16px; }
.balance-card {
  background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  text-align: center;
  margin-bottom: 12px;
}
.balance-label { font-size: 13px; opacity: 0.8; }
.balance-num { font-size: 28px; font-weight: 700; margin: 6px 0 12px; letter-spacing: -0.5px; }
.balance-btn { background: rgba(255,255,255,0.25) !important; border: none !important; color: #fff !important; padding: 0 20px; height: 32px; font-size: 13px; font-weight: 600; }
.withdraw-disabled-tip { font-size: 12px; opacity: 0.7; margin-top: 8px; }
.info-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 12px; }
.info-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e8573a; display: inline-block; }
.info-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f3f0; }
.info-row:last-of-type { border-bottom: none; }
.info-lbl { width: 68px; font-size: 13px; color: #9a9aae; flex-shrink: 0; }
.info-val { flex: 1; font-size: 13px; color: #1a1a2e; text-align: right; }
.modify-btn { margin-top: 12px; border-color: #e8573a !important; color: #e8573a !important; font-size: 12px; width: 100%; }
.form-row { display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #f5f3f0; }
.form-lbl { width: 68px; font-size: 13px; color: #9a9aae; flex-shrink: 0; }
.form-row .van-field { flex: 1; padding: 0; }
.form-select { flex: 1; border: none; outline: none; font-size: 13px; color: #1a1a2e; background: transparent; text-align: right; padding: 8px 0; }
.err-msg { color: #e8573a; font-size: 12px; margin-top: 8px; text-align: center; }
.fund-btn { margin-top: 16px; height: 42px; font-size: 15px; font-weight: 600; background: linear-gradient(135deg,#e8573a 0%,#f39c12 100%) !important; border: none !important; color: #fff !important; }
</style>
