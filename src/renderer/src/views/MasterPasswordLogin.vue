<template>
  <div class="flex items-center justify-center min-h-screen background-container">
    <el-card class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h2>请输入主密码</h2>
          <p class="text-sm text-gray-600 mt-1">输入您的主密码来访问密码库</p>
        </div>
      </template>
      <el-form @submit.prevent="handleSubmit">
        <el-form-item label="主密码">
          <el-input
            v-model="masterPassword"
            type="password"
            placeholder="输入主密码"
            show-password
            autofocus
            :disabled="isLocked"
          >
          </el-input>
        </el-form-item>

        <!-- 锁定状态显示 -->
        <div v-if="isLocked" class="mb-4">
          <el-alert
            title="账户暂时锁定"
            type="warning"
            :description="`由于多次密码错误，账户已被锁定。请在 ${lockoutTime} 后重试。`"
            show-icon
          >
          </el-alert>

          <div class="mt-3 text-center">
            <el-countdown :value="authStore.lockoutUntil" format="mm:ss" @finish="onLockoutFinish">
              <template #title>
                <span class="text-sm text-gray-600">解锁倒计时:</span>
              </template>
            </el-countdown>
          </div>
        </div>

        <!-- 错误信息和尝试次数 -->
        <div v-if="authStore.errorMessage && !isLocked" class="text-red-500 mb-3">
          {{ authStore.errorMessage }}
        </div>

        <div v-if="authStore.failedAttempts > 0 && !isLocked" class="text-sm text-gray-600 mb-3">
          已尝试 {{ authStore.failedAttempts }}/{{ authStore.maxFailedAttempts }} 次
          <span v-if="authStore.failedAttempts >= 3" class="text-orange-600 font-medium">
            • 注意：连续错误将导致账户锁定
          </span>
        </div>

        <el-form-item>
          <el-button type="primary" class="w-full" :disabled="isLocked" @click="handleSubmit">
            {{ isLocked ? '账户已锁定' : '解锁' }}
          </el-button>
        </el-form-item>

        <!-- 安全提示 -->
        <el-alert
          v-if="!isLocked"
          title="安全提醒"
          type="info"
          description="为保护您的数据安全，连续输错密码将会临时锁定账户"
          show-icon
          class="mt-4"
        >
        </el-alert>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@renderer/store/authStore'
import { Router, useRouter } from 'vue-router'

const authStore = useAuthStore()
const masterPassword = ref('')
const router: Router = useRouter()
let intervalId: number | null = null

// 计算是否被锁定
const isLocked = computed(() => {
  return authStore.isLockedOut()
})

// 计算锁定剩余时间
const lockoutTime = computed(() => {
  const remainingSeconds = authStore.getLockoutRemainingTime()
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return `${minutes}分${seconds}秒`
})

// 锁定结束回调
const onLockoutFinish = () => {
  // 重新检查锁定状态
  authStore.isLockedOut()
}

// 定期检查锁定状态
const startLockoutCheck = () => {
  intervalId = window.setInterval(() => {
    if (authStore.isLockedOut()) {
      // 仍在锁定中，继续检查
      return
    } else {
      // 锁定已解除
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }
  }, 1000)
}

const handleSubmit = async () => {
  if (isLocked.value) {
    return // 被锁定时不处理提交
  }

  // 验证现有密码
  const success = await authStore.verifyMasterPassword(masterPassword.value)
  if (success) {
    // 密码验证成功后的处理
    console.log('主密码验证成功')
    masterPassword.value = '' // 清空输入框
    // 跳转到主界面
    await router.push('/')
  } else {
    // 验证失败，如果开始锁定则启动检查
    if (authStore.isLockedOut()) {
      startLockoutCheck()
    }
  }
}

// 组件挂载时检查初始锁定状态
onMounted(() => {
  if (authStore.isLockedOut()) {
    startLockoutCheck()
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>
<style scoped>
.background-container {
  background-image: url(/images/login_bg.png);
  background-size: cover;
  background-position: center;
  min-height: 100vh;
}
</style>
