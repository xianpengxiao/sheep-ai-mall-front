import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import * as Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 全局注册所有 Vant 组件
Object.values(Vant).forEach((comp) => {
  if (comp.install) app.use(comp)
})

app.use(pinia)
app.use(router)
app.mount('#app')
