<template>
  <van-dialog
    v-model:show="visible"
    title="修改头像"
    :show-confirm-button="false"
    closeable
    close-icon-position="top-left"
  >
    <div class="dialog-body">
      <div class="avatar-preview-wrap" v-if="preview">
        <van-image round width="96" height="96" :src="preview" class="avatar-preview" />
      </div>
      <div class="avatar-placeholder" v-else>
        <van-icon name="photograph" size="40" color="#c8c4c0" />
        <span class="placeholder-text">选择图片</span>
      </div>
      <input ref="fileInputRef" type="file" accept="image/*" class="file-input-hidden" @change="onFileSelected" />
      <van-button round block class="dialog-btn select-btn" @click="fileInputRef?.click()">选择图片</van-button>
      <van-button round block class="dialog-btn save-btn" @click="handleSave" :loading="loading" :disabled="!file">保存头像</van-button>
    </div>
  </van-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showToast } from 'vant'
import { updateAvatar } from '../api/member.js'

const props = defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const fileInputRef = ref(null)
const file = ref(null)
const preview = ref('')
const loading = ref(false)

function onFileSelected(e) {
  const f = e.target.files?.[0]
  if (!f) return
  file.value = f
  const reader = new FileReader()
  reader.onload = (ev) => { preview.value = ev.target?.result || '' }
  reader.readAsDataURL(f)
}

async function handleSave() {
  if (!preview.value) return showToast('请先选择图片')
  loading.value = true
  try {
    await updateAvatar(preview.value)
    emit('saved', preview.value)
    showToast('头像已更新')
    visible.value = false
    file.value = null
    preview.value = ''
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
.avatar-preview-wrap {
  margin-bottom: 20px;
}
.avatar-preview {
  border: 3px solid #f0ece8;
}
.avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 24px 0;
}
.placeholder-text {
  font-size: 13px;
  color: #c8c4c0;
}
.file-input-hidden {
  display: none;
}
.dialog-btn {
  margin-top: 12px;
  height: 40px;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
}
.select-btn {
  background: #f5f3f0 !important;
  color: #5a5a6e !important;
  border: 1px solid #e0dcd8 !important;
}
.save-btn {
  margin-top: 8px;
}
</style>
