import request from '../utils/request.js'

/** 知识库文档分页查询（管理员可查全量，商家仅自己的文档） */
export function getKnowledgePage(params) {
  return request.get('/ai/knowledge/page', { params })
}

/** 新增文档（merchantId 仅管理员可用） */
export function createKnowledge(data) {
  return request.post('/ai/knowledge', data)
}

/** 修改文档 */
export function updateKnowledge(id, data) {
  return request.put(`/ai/knowledge/${id}`, data)
}

/** 启用/禁用文档（0=禁用 1=启用） */
export function toggleKnowledge(id, enabled) {
  return request.put(`/ai/knowledge/${id}/enabled`, null, { params: { enabled } })
}

/** 删除文档 */
export function deleteKnowledge(id) {
  return request.delete(`/ai/knowledge/${id}`)
}

/**
 * 上传 Markdown 文件新增文档（multipart）
 * @param file md 文件
 * @param extra 可选：title/category/keywords/merchantId（merchantId 仅管理员可用）
 */
export function uploadKnowledge(file, extra = {}) {
  const formData = new FormData()
  formData.append('file', file)
  Object.entries(extra).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') formData.append(k, v)
  })
  return request.post('/ai/knowledge/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
