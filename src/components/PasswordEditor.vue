<template>
  <van-dialog
    v-model:show="visible"
    title="修改密码"
    :show-confirm-button="false"
    closeable
    close-icon-position="top-left"
  >
    <div class="dialog-body">
      <van-field v-model="form.oldPassword" type="password" label="旧密码" placeholder="请输入旧密码" />
      <van-field v-model="form.newPassword" type="password" label="新密码" placeholder="请输入新密码" />
      <van-field
        v-model="form.confirmPwd" type="password" label="确认密码" placeholder="请再次输入新密码"
        :rules="[{ validator: () => !form.newPassword || form.confirmPwd === form.newPassword, message: '两次密码不一致' }]"
      />
      <van-button round block class="dialog-btn" @click="handleSave" :loading="loading">保存</van-button>
    </div>
  </van-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { showToast } from 'vant'
import { updatePassword } from '../api/member.js'

const props = defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const loading = ref(false)
const form = reactive({ oldPassword: '', newPassword: '', confirmPwd: '' })

async function handleSave() {
  if (!form.oldPassword || !form.newPassword) return showToast('请填写完整')
  if (form.newPassword !== form.confirmPwd) return showToast('两次密码不一致')
  loading.value = true
  try {
    await updatePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    showToast('密码已修改')
    emit('saved')
    visible.value = false
    form.oldPassword = ''
    form.newPassword = ''
    form.confirmPwd = ''
  } catch { /* toast 由拦截器处理 */ }
  finally { loading.value = false }
}
</script>

<style scoped>
.dialog-body {
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dialog-btn {
  margin-top: 12px;
  height: 40px;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  width: 100%;
}
</style>
