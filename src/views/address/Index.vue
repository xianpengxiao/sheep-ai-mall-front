<template>
  <div class="page-address">
    <NavBar title="收货地址" />

    <div v-if="loading" class="state-wrap">
      <van-loading size="32" color="#e8573a">加载中...</van-loading>
    </div>

    <template v-else-if="list.length > 0">
      <div class="address-list">
        <div
          v-for="item in list"
          :key="item.id"
          class="address-card"
          :class="{ 'is-default': item.isDefault === 1 }"
          @click="goEdit(item.id)"
        >
          <div class="address-top">
            <div class="address-user">
              <span class="address-name">{{ item.receiverName }}</span>
              <span class="address-phone">{{ item.receiverPhone }}</span>
              <van-tag v-if="item.isDefault === 1" plain class="default-tag">默认</van-tag>
            </div>
            <div class="address-actions" @click.stop>
              <van-icon name="delete" size="18" @click="handleDelete(item)" />
            </div>
          </div>
          <div class="address-detail">
            {{ item.province }}{{ item.city }}{{ item.district }}{{ item.detailAddress }}
          </div>
          <div class="address-bottom" @click.stop>
            <span
              v-if="item.isDefault !== 1"
              class="set-default-btn"
              @click="handleSetDefault(item)"
            >设为默认</span>
            <span v-else class="default-hint">✓ 默认地址</span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="state-wrap">
      <van-empty description="暂无收货地址">
        <van-button
          size="small"
          round
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          @click="goEdit()"
        >新增地址</van-button>
      </van-empty>
    </div>

    <div class="add-bar">
      <van-button
        round
        block
        color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
        icon="plus"
        @click="goEdit()"
      >新增收货地址</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getAddressList, deleteAddress, setDefaultAddress } from '../../api/address.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()

const loading = ref(false)
const list = ref([])

async function fetchList() {
  loading.value = true
  try {
    const data = await getAddressList()
    list.value = data || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function handleSetDefault(item) {
  try {
    await setDefaultAddress(item.id)
    showToast('已设为默认地址')
    fetchList()
  } catch {
    showToast('设置失败')
  }
}

async function handleDelete(item) {
  try {
    await showConfirmDialog({
      title: '提示',
      message: `确认删除「${item.receiverName}」的地址吗？`,
      confirmButtonColor: '#e8573a',
    })
    await deleteAddress(item.id)
    showToast('已删除')
    fetchList()
  } catch (e) {
    if (e?.toString().includes('cancel')) return
  }
}

function goEdit(id) {
  router.push(id ? `/address/edit/${id}` : '/address/edit')
}

onMounted(() => fetchList())
onActivated(() => fetchList())
</script>

<style scoped>
.page-address {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 80px;
}
.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.address-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.address-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  border: 1.5px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
.address-card:active {
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  background: #fcfcfa;
}
.address-card.is-default {
  border-color: rgba(232,87,58,0.2);
  background: rgba(232,87,58,0.02);
}
.address-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.address-user {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.address-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}
.address-phone {
  font-size: 13px;
  color: #5a5a6e;
}
.default-tag {
  font-size: 10px;
  color: #e8573a;
  border-color: #e8573a;
}
.address-actions {
  display: flex;
  gap: 14px;
  color: #9a9aae;
  cursor: pointer;
}
.address-actions .van-icon:active {
  color: #e8573a;
}
.address-detail {
  font-size: 13px;
  color: #5a5a6e;
  line-height: 1.4;
  margin-top: 8px;
}
.address-bottom {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0ece8;
}
.set-default-btn {
  font-size: 12px;
  color: #e8573a;
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
}
.set-default-btn:active {
  opacity: 0.6;
}
.default-hint {
  font-size: 12px;
  color: #e8573a;
  font-weight: 500;
}
.add-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -1px 6px rgba(0,0,0,0.04);
}
.add-bar .van-button {
  height: 42px;
  font-size: 14px;
  font-weight: 600;
}
</style>
