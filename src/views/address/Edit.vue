<template>
  <div class="page-address-edit">
    <NavBar :title="isEdit ? '编辑地址' : '新增地址'" />

    <van-form @submit="handleSave" ref="formRef" class="edit-form">
      <van-cell-group inset>
        <van-field
          v-model="form.receiverName"
          name="receiverName"
          label="姓名"
          placeholder="请输入收货人姓名"
          :rules="[{ required: true, message: '请输入收货人姓名' }]"
          clearable
        />
        <van-field
          v-model="form.receiverPhone"
          name="receiverPhone"
          label="电话"
          type="tel"
          placeholder="请输入收货人电话"
          :rules="[
            { required: true, message: '请输入收货人电话' },
            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
          ]"
          clearable
        />
      </van-cell-group>

      <div class="section-title">收货地址</div>
      <van-cell-group inset>
        <van-field
          v-model="form.province"
          name="province"
          label="省份"
          placeholder="请输入省份"
          :rules="[{ required: true, message: '请输入省份' }]"
          clearable
        />
        <van-field
          v-model="form.city"
          name="city"
          label="城市"
          placeholder="请输入城市"
          :rules="[{ required: true, message: '请输入城市' }]"
          clearable
        />
        <van-field
          v-model="form.district"
          name="district"
          label="区县"
          placeholder="请输入区县"
          :rules="[{ required: true, message: '请输入区县' }]"
          clearable
        />
        <van-field
          v-model="form.detailAddress"
          name="detailAddress"
          label="详细地址"
          type="textarea"
          placeholder="请输入详细地址（街道、门牌号等）"
          :rules="[{ required: true, message: '请输入详细地址' }]"
          clearable
          autosize
        />
        <van-field
          v-model="form.zipCode"
          name="zipCode"
          label="邮编"
          placeholder="选填"
          clearable
        />
      </van-cell-group>

      <div class="default-switch">
        <span>设为默认地址</span>
        <van-switch v-model="form.isDefault" :active-value="1" :inactive-value="0" size="22" />
      </div>

      <div class="submit-area">
        <van-button
          round
          block
          type="primary"
          color="linear-gradient(135deg, #e8573a 0%, #f39c12 100%)"
          native-type="submit"
          :loading="saving"
          class="save-btn"
        >保存</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { getAddressDetail, addAddress, updateAddress } from '../../api/address.js'
import NavBar from '../../components/NavBar.vue'

const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const saving = ref(false)

const form = reactive({
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  zipCode: '',
  isDefault: 0,
})

onMounted(async () => {
  const id = route.params.id
  if (id) {
    try {
      const data = await getAddressDetail(id)
      if (data) {
        Object.assign(form, {
          receiverName: data.receiverName || '',
          receiverPhone: data.receiverPhone || '',
          province: data.province || '',
          city: data.city || '',
          district: data.district || '',
          detailAddress: data.detailAddress || '',
          zipCode: data.zipCode || '',
          isDefault: data.isDefault ?? 0,
        })
      }
    } catch {
      showToast('加载地址信息失败')
      router.back()
    }
  }
})

async function handleSave() {
  saving.value = true
  showLoadingToast({ message: '保存中...', forbidClick: true, duration: 0 })
  try {
    const payload = { ...form }
    if (isEdit.value) {
      payload.id = route.params.id
      await updateAddress(payload)
    } else {
      await addAddress(payload)
    }
    closeToast()
    showToast('保存成功')
    router.back()
  } catch {
    closeToast()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page-address-edit {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 40px;
}
.edit-form {
  padding-top: 12px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  padding: 16px 16px 10px;
}
.default-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 16px 0;
  padding: 14px 16px;
  background: #fff;
  border-radius: 10px;
  font-size: 14px;
  color: #1a1a2e;
}
.submit-area {
  padding: 24px 16px;
}
.save-btn {
  height: 44px;
  font-size: 15px;
  font-weight: 600;
}
:deep(.van-cell-group--inset) {
  margin: 0 16px;
  border-radius: 10px;
}
</style>
