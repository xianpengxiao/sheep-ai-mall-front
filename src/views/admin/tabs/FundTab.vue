<template>
  <div class="fund-tab">
    <div class="fund-sub-tabs">
      <span v-for="st in subTabs" :key="st.key" class="fund-sub-tab" :class="{ active: subActive === st.key }" @click="subActive = st.key">{{ st.label }}</span>
    </div>
    <div class="fund-content">
      <SettlementAccount v-if="subActive === 'account'" />
      <CommissionConfig v-if="subActive === 'commission'" />
      <CommissionLog v-if="subActive === 'commissionLog'" />
      <WithdrawAudit v-if="subActive === 'withdraw'" />
      <FundFlow v-if="subActive === 'flow'" />
      <ReportTab v-if="subActive === 'report'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SettlementAccount from './fund/SettlementAccount.vue'
import CommissionConfig from './fund/CommissionConfig.vue'
import CommissionLog from './fund/CommissionLog.vue'
import WithdrawAudit from './fund/WithdrawAudit.vue'
import FundFlow from './fund/FundFlow.vue'
import ReportTab from './fund/ReportTab.vue'

const subTabs = [
  { key: 'account', label: '商家结算账户管理' },
  { key: 'commission', label: '佣金规则配置' },
  { key: 'commissionLog', label: '订单分佣明细' },
  { key: 'withdraw', label: '提现审核列表' },
  { key: 'flow', label: '全局资金流水' },
  { key: 'report', label: '财务对账报表' },
]
const subActive = ref('account')
</script>

<style scoped>
.fund-tab { min-height: 60vh; }
.fund-sub-tabs { display: flex; gap: 20px; padding: 0 0 12px; border-bottom: 1.5px solid #eeeae6; margin-bottom: 16px; }
.fund-sub-tab { font-size: 13px; font-weight: 500; color: #5a5a6e; cursor: pointer; padding: 6px 0 8px; border-bottom: 2px solid transparent; transition: color 0.2s; user-select: none; }
.fund-sub-tab:hover { color: #1a1a2e; }
.fund-sub-tab.active { color: #1a1a2e; font-weight: 600; border-bottom-color: #e8573a; }
</style>
