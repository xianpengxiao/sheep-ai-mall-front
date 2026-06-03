<template>
  <div class="page-order">
    <div class="nav-bar-sticky">
      <NavBar title="确认订单" />
    </div>

    <!-- ═══════ 加载中 ═══════ -->
    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <!-- ═══════ 订单内容 ═══════ -->
    <template v-else-if="items.length > 0">
      <!-- 📍 收货地址（点击选择） -->
      <div class="section address-section" @click="showAddressPicker = true">
        <div class="section-title">
          <van-icon name="location-o" /> 收货信息
          <van-icon name="arrow" class="section-arrow" />
        </div>
        <div v-if="selectedAddress" class="address-card-clickable">
          <div class="addr-meta">
            <span class="addr-name">{{ selectedAddress.receiverName }}</span>
            <span class="addr-phone">{{ selectedAddress.receiverPhone }}</span>
            <van-tag v-if="selectedAddress.isDefault === 1" plain class="addr-tag">默认</van-tag>
          </div>
          <div class="addr-detail">{{ fullAddress(selectedAddress) }}</div>
        </div>
        <div v-else-if="addresses.length === 0" class="address-empty" @click.stop="goAddAddress">
          <van-icon name="plus" /> 添加收货地址
        </div>
        <div v-else class="address-empty" @click.stop="showAddressPicker = true">
          <van-icon name="location-o" /> 请选择收货地址
        </div>
      </div>

      <!-- 📦 商品列表 -->
      <div class="section">
        <div class="section-title">
          <van-icon name="shop-o" /> 商品清单
        </div>
        <div class="order-items">
          <div v-for="item in items" :key="item.skuId" class="order-item">
            <van-image
              :src="item.skuImage || item.spuImage"
              width="64"
              height="64"
              fit="cover"
              class="item-thumb"
            />
            <div class="item-info">
              <div class="item-name van-multi-ellipsis--l2">{{ item.spuName }}</div>
              <div class="item-spec" v-if="item.specInfo">{{ formatSpecs(item.specInfo) }}</div>
            </div>
            <div class="item-amount">
              <div class="item-price">&yen;{{ formatPrice(item.price) }}</div>
              <div class="item-qty">&times; {{ item.quantity }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 📋 结算明细表 -->
      <div class="section settlement-section">
        <div class="section-title">
          <van-icon name="bill-o" /> 结算明细
        </div>
        <div class="settlement-table">
          <div class="settlement-row">
            <span class="settlement-label">商品合计</span>
            <span class="settlement-value">&yen;{{ formatPrice(subtotal) }}</span>
          </div>
          <div class="settlement-row">
            <span class="settlement-label">运费</span>
            <span class="settlement-value shipping-free">免运费</span>
          </div>
          <div class="settlement-row">
            <span class="settlement-label">优惠</span>
            <span class="settlement-value discount">- &yen;0.00</span>
          </div>
          <div class="settlement-divider"></div>
          <div class="settlement-row total-row">
            <span class="settlement-label">应付总额</span>
            <span class="settlement-value total">&yen;{{ formatPrice(subtotal) }}</span>
          </div>
        </div>
      </div>

      <!-- 📝 备注 -->
      <div class="section">
        <van-field
          v-model="remark"
          label="备注"
          placeholder="选填，给商家的留言"
          input-align="right"
          clearable
        />
      </div>

      <!-- 提交按钮 -->
      <div class="submit-wrap">
        <div class="submit-preview">
          <span class="submit-label">合计：</span>
          <span class="submit-total">&yen;{{ formatPrice(subtotal) }}</span>
        </div>
        <van-button
          round
          type="primary"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          class="submit-btn"
          :loading="submitting"
          @click="handleSubmit"
        >提交订单</van-button>
      </div>

      <!-- 📍 地址选择弹窗 -->
      <van-action-sheet v-model:show="showAddressPicker" title="选择收货地址" close-icon-position="top-left">
        <div class="addr-picker-list">
          <div
            v-for="addr in addresses"
            :key="addr.id"
            class="addr-picker-item"
            :class="{ active: selectedAddress?.id === addr.id }"
            @click="selectAddress(addr)"
          >
            <div class="addr-picker-info">
              <div class="addr-picker-meta">
                <span class="addr-name">{{ addr.receiverName }}</span>
                <span class="addr-phone">{{ addr.receiverPhone }}</span>
                <van-tag v-if="addr.isDefault === 1" plain class="addr-tag">默认</van-tag>
              </div>
              <div class="addr-detail">{{ fullAddress(addr) }}</div>
            </div>
            <div class="addr-picker-right">
              <van-icon name="edit" size="16" class="addr-picker-edit" @click.stop="goEditAddress(addr)" />
              <van-icon v-if="selectedAddress?.id === addr.id" name="success" color="#e8573a" size="18" />
            </div>
          </div>
          <div class="addr-picker-add" @click="goAddAddress">
            <van-icon name="plus" /> 新增收货地址
          </div>
        </div>
      </van-action-sheet>
    </template>

    <!-- ═══════ 无商品 ═══════ -->
    <div v-else class="state-wrap">
      <van-empty description="未获取到订单商品">
        <van-button
          size="small"
          round
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          @click="goCart"
        >返回购物车</van-button>
      </van-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { getCartList } from '../api/cart.js'
import { getAddressList } from '../api/address.js'
import NavBar from '../components/NavBar.vue'

const router = useRouter()
const route = useRoute()

// ── 表单 ──
const remark = ref('')

// ── 状态 ──
const loading = ref(false)
const submitting = ref(false)
const items = ref([])

// ── 地址 ──
const addresses = ref([])
const selectedAddress = ref(null)
const showAddressPicker = ref(false)

// ── 小计 ──
const subtotal = computed(() => {
  return items.value.reduce((sum, item) => {
    return sum + Number(item.price) * item.quantity
  }, 0)
})

// ── 工具 ──
function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

function formatSpecs(specInfo) {
  if (!specInfo) return ''
  if (typeof specInfo === 'string') return specInfo
  return Object.values(specInfo).join(' / ')
}

// ── 地址工具 ──
function fullAddress(addr) {
  if (!addr) return ''
  return `${addr.province || ''}${addr.city || ''}${addr.district || ''}${addr.detailAddress || ''}`
}

async function fetchAddresses() {
  try {
    const list = await getAddressList()
    addresses.value = list || []
    // 自动选中默认地址，无默认则选第一个
    if (!selectedAddress.value || !(list || []).some(a => a.id === selectedAddress.value.id)) {
      const def = (list || []).find(a => a.isDefault === 1)
      selectedAddress.value = def || (list || [])[0] || null
    }
  } catch {
    // 静默
  }
}

function selectAddress(addr) {
  selectedAddress.value = addr
  showAddressPicker.value = false
}

function goAddAddress() {
  showAddressPicker.value = false
  router.push('/address/edit')
}
function goEditAddress(addr) {
  showAddressPicker.value = false
  router.push(`/address/edit/${addr.id}`)
}

// ── 过滤出选中商品 ──
function filterItems(list, skuIds) {
  const selected = new Set(skuIds)
  const result = []
  // 在 store 中查找选中项的 quantity
  for (const item of list) {
    if (selected.has(item.skuId)) {
      result.push(item)
    }
  }
  return result
}

// ── 加载数据 ──
async function fetchOrderItems() {
  const skuIdsStr = route.query.skuIds
  if (!skuIdsStr) {
    loading.value = false
    return
  }
  const skuIds = skuIdsStr.split(',').map(Number).filter(Boolean)
  if (skuIds.length === 0) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    // 从购物车列表获取商品信息
    const userStore = (await import('../stores/user.js')).useUserStore()
    const userId = userStore.memberInfo?.userId
    if (!userId) return

    const list = await getCartList(userId)
    items.value = filterItems(list || [], skuIds)
  } catch (e) {
    console.error('[Order] 加载失败:', e)
    showToast('加载订单信息失败')
  } finally {
    loading.value = false
  }
}

// ── 提交订单 ──
async function handleSubmit() {
  if (!selectedAddress.value) {
    showToast('请选择收货地址')
    return
  }

  submitting.value = true
  showLoadingToast({ message: '提交中...', forbidClick: true, duration: 0 })

  try {
    const { createOrder } = await import('../api/order.js')
    const addr = selectedAddress.value
    const orderData = {
      receiverName: addr.receiverName,
      receiverPhone: addr.receiverPhone,
      receiverAddress: fullAddress(addr),
      remark: remark.value || undefined,
      items: items.value.map(item => ({
        spuId: item.spuId,
        skuId: item.skuId,
        quantity: item.quantity,
      })),
    }
    const result = await createOrder(orderData)
    closeToast()
    // result.id 被 request.js 大整数保护自动转为字符串
    const orderId = result?.id || ''
    router.replace({
      name: 'Payment',
      query: { orderId, totalAmount: subtotal.value },
    })
  } catch (e) {
    closeToast()
    console.error('[Order] 提交失败:', e)
  } finally {
    submitting.value = false
  }
}

// ── 导航 ──
function goCart() {
  router.replace('/cart')
}

// ── 生命周期 ──
onMounted(() => {
  fetchOrderItems()
  fetchAddresses()
})
onActivated(() => {
  fetchOrderItems()
  fetchAddresses()
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   订单确认页 — 暖色调复古风格
   ══════════════════════════════════════════════════════════════ */

.page-order {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 80px;
}
.nav-bar-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}

/* ── 状态容器 ── */
.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

/* ── 区块 ── */
.section {
  background: #fff;
  margin: 10px 12px 0;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0ece8;
}

/* ── 地址选择 ── */
.section-arrow {
  margin-left: auto;
  color: #c8c4c0;
  font-size: 14px;
}
.address-section {
  cursor: pointer;
}
.address-card-clickable {
  padding: 4px 0;
}
.addr-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.addr-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}
.addr-phone {
  font-size: 13px;
  color: #5a5a6e;
}
.addr-tag {
  font-size: 10px;
  color: #e8573a;
  border-color: #e8573a;
}
.addr-detail {
  font-size: 13px;
  color: #5a5a6e;
  line-height: 1.4;
  margin-top: 6px;
}
.address-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 0;
  color: #9a9aae;
  font-size: 14px;
  cursor: pointer;
}

/* ── 地址选择弹窗 ── */
.addr-picker-list {
  max-height: 60vh;
  overflow-y: auto;
  padding: 8px 0 20px;
}
.addr-picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.addr-picker-item:active {
  background: #f5f3f0;
}
.addr-picker-item.active {
  background: rgba(232,87,58,0.04);
}
.addr-picker-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.addr-picker-edit {
  color: #c8c4c0;
  cursor: pointer;
  padding: 4px;
}
.addr-picker-edit:active {
  color: #e8573a;
}
.addr-picker-info {
  flex: 1;
  min-width: 0;
}
.addr-picker-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.addr-picker-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  margin: 8px 16px 0;
  border-radius: 10px;
  border: 1.5px dashed #e0dcd8;
  color: #e8573a;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.addr-picker-add:active {
  background: rgba(232,87,58,0.06);
  border-color: #e8573a;
}

/* ── 商品清单 ── */
.order-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.item-thumb {
  flex-shrink: 0;
  border-radius: 8px;
  background: #f0ece8;
}
.item-info {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.35;
}
.item-spec {
  font-size: 12px;
  color: #bababa;
  margin-top: 4px;
}
.item-amount {
  flex-shrink: 0;
  text-align: right;
}
.item-price {
  font-size: 15px;
  font-weight: 700;
  color: #d63031;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
.item-qty {
  font-size: 12px;
  color: #9a9aae;
  margin-top: 2px;
}

/* ── 结算明细表（核心样式） ── */
.settlement-section {
  margin-bottom: 60px;
}
.settlement-table {
  padding: 4px 0;
}
.settlement-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}
.settlement-label {
  font-size: 14px;
  color: #5a5a6e;
}
.settlement-value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
.shipping-free {
  color: #2ecc71;
  font-size: 13px;
}
.discount {
  color: #9a9aae;
}
.settlement-divider {
  height: 1px;
  background: #f0ece8;
  margin: 4px 0;
}
.total-row {
  padding: 14px 0 4px;
}
.total-row .settlement-label {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}
.total-row .settlement-value.total {
  font-size: 20px;
  font-weight: 700;
  color: #d63031;
}

/* ── 底部提交 ── */
.submit-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 -1px 6px rgba(0,0,0,0.04);
  z-index: 100;
}
.submit-preview {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.submit-label {
  font-size: 14px;
  color: #5a5a6e;
}
.submit-total {
  font-size: 20px;
  font-weight: 700;
  color: #d63031;
  font-family: 'DM Sans', 'Inter', sans-serif;
}
.submit-btn {
  min-width: 120px;
  height: 40px;
  font-size: 14px;
  font-weight: 600;
  border: none;
}

/* ── 响应式 ── */
@media (min-width: 640px) {
  .section {
    margin: 12px 24px 0;
  }
}
</style>
