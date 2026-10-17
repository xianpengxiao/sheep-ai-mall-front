import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 开发服务器本身也走 HTTPS（使用与后端相同的自签名证书）
    https: {
      pfx: fs.readFileSync('./certs/sheep-admin.p12'),
      passphrase: 'sheep123456',
    },
    proxy: {
      '/api': {
        target: 'https://localhost:8443',
        changeOrigin: true,
        secure: false, // 后端使用自签名证书，关闭代理对证书链的校验
        // SSE 流式代理：禁用缓冲，确保事件实时推送到前端
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // 对 SSE/流式响应禁用 nginx 风格缓冲和压缩
            delete proxyRes.headers['content-length']
            proxyRes.headers['cache-control'] = 'no-cache'
            proxyRes.headers['x-accel-buffering'] = 'no'
          })
        },
      },
    },
  },
})
