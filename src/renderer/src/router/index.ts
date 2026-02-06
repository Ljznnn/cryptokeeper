import { createRouter, createWebHashHistory } from 'vue-router'
import MasterPasswordSetup from '../views/MasterPasswordSetup.vue'
import MasterPasswordLogin from '../views/MasterPasswordLogin.vue'
import MainView from '../views/MainView.vue'
import RecycleBinView from '../views/RecycleBinView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  {
    path: '/',
    name: 'Main',
    component: MainView
  },
  {
    path: '/setup',
    name: 'Setup',
    component: MasterPasswordSetup
  },
  {
    path: '/login',
    name: 'Login',
    component: MasterPasswordLogin
  },
  {
    path: '/recycle',
    name: 'Recycle',
    component: RecycleBinView
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 添加导航守卫
router.beforeEach((to, from, next) => {
  // 这里可以添加路由守卫逻辑
  next()
})

export default router