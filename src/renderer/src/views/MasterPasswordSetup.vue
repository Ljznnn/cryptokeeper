<template>
  <div class="flex items-center justify-center min-h-screen background-container">
    <el-card class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h2>设置主密码</h2>
          <p class="text-sm text-gray-600 mt-1">请设置一个高强度的主密码来保护您的数据</p>
        </div>
      </template>
      <el-form :model="passwordForm" ref="passwordFormRef" :rules="passwordRules" label-width="auto">
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
            @input="onPasswordInput">
          </el-input>
        <!-- 密码强度指示器 -->
          <div v-if="passwordStrength" class="mt-2">
            <div class="flex items-center mb-1">
              <span class="text-sm mr-2">密码强度:</span>
              <el-progress
                :percentage="passwordStrength.score * 25"
                :stroke-width="6"
                :color="getStrengthColor(passwordStrength.score)">
              </el-progress>
              <span class="ml-2 text-sm font-medium" :class="getStrengthClass(passwordStrength.score)">
                {{ getStrengthText(passwordStrength.score) }}
              </span>
            </div>

            <!-- 安全建议 -->
            <div v-if="passwordStrength.feedback.warning" class="text-orange-600 text-sm mb-1">
              ⚠️ {{ passwordStrength.feedback.warning }}
            </div>

            <div v-if="passwordStrength.feedback.suggestions.length > 0 && !useWeakPasswordMode" class="text-blue-600 text-sm">
              <div class="font-medium mb-1">改进建议:</div>
              <ul class="list-disc list-inside space-y-1">
                <li v-for="suggestion in passwordStrength.feedback.suggestions" :key="suggestion">
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password>
          </el-input>
        </el-form-item>

        <div v-if="authStore.errorMessage" class="text-red-500 mb-3">{{ authStore.errorMessage }}</div>

        <!-- 弱密码模式选项 -->
        <div class="mb-4">
          <el-checkbox
            v-model="useWeakPasswordMode"
            @change="onWeakPasswordModeChange">
            允许使用弱密码（不推荐）
          </el-checkbox>
          <p class="text-xs text-gray-500 mt-1">
            启用后可忽略密码强度要求，但会降低数据安全性。
            建议始终使用高强度密码来保护您的敏感信息。
          </p>
        </div>

        <el-form-item>
          <el-button
            type="primary"
            class="w-full"
            :disabled="!isPasswordStrongEnough"
            @click="handleSetMasterPassword">
            {{ isPasswordStrongEnough ? '设置主密码' : '密码强度不足' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import {reactive, ref, computed} from 'vue'
import { useAuthStore } from '@renderer/store/authStore'
import {ElMessage, ElMessageBox} from "element-plus";
import {useRouter} from "vue-router";
import { passwordCrypto } from '@renderer/utils/cryptoUtils';

const router = useRouter()
const authStore = useAuthStore()
const passwordFormRef = ref()
const passwordStrength = ref(null)
const useWeakPasswordMode = ref(false)

const passwordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

// 计算密码是否足够强壮
const isPasswordStrongEnough = computed(() => {
  if (passwordStrength.value == null) {
    return true; // 弱密码模式下始终允许
  }
  return passwordStrength.value?.isValid === true;
});

// 密码输入事件处理
const onPasswordInput = () => {
  if (useWeakPasswordMode.value) {
    passwordStrength.value = null;
    return;
  }
  if (passwordForm.newPassword) {
    passwordStrength.value = passwordCrypto.evaluatePasswordStrength(passwordForm.newPassword);
  } else {
    passwordStrength.value = null;
  }
};

// 弱密码模式切换
const onWeakPasswordModeChange = () => {
  if (useWeakPasswordMode.value) {
    ElMessageBox.confirm(
      '您已启用弱密码模式。这会降低您的数据安全性，建议仅在测试环境中使用。',
      '弱密码模式警告',
      {
        confirmButtonText: '我了解风险',
        type: 'warning',
        showCancelButton: false
      }
    );
    passwordStrength.value = null;
    passwordFormRef.value.clearValidate();
  } else {
    onPasswordInput() //触发表单校验
  }
};

// 获取强度颜色
const getStrengthColor = (score) => {
  const colors = ['#f56c6c', '#e6a23c', '#409eff', '#67c23a', '#67c23a'];
  return colors[score] || colors[0];
};

// 获取强度文本
const getStrengthText = (score) => {
  const texts = ['很弱', '弱', '一般', '强', '很强'];
  return texts[score] || texts[0];
};

// 获取强度CSS类
const getStrengthClass = (score) => {
  const classes = ['text-red-600', 'text-orange-600', 'text-blue-600', 'text-green-600', 'text-green-600'];
  return classes[score] || classes[0];
};

const passwordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (useWeakPasswordMode.value) {
          callback(); // 弱密码模式下忽略警告
        }
        if (!passwordStrength.value?.isValid) {
          callback(new Error('密码强度不足，请参考建议进行改进'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const handleSetMasterPassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await completeSetMasterPassword();
      } catch (error) {
        console.log(error)
        ElMessage.error('设置密码失败出现错误')
      }
    }
  })
}

// 完成主密码设置的辅助函数
const completeSetMasterPassword = async () => {
  const success = await authStore.setMasterPassword(passwordForm.newPassword, passwordForm.confirmPassword)

  if (success) {
    if (useWeakPasswordMode.value) {
      ElMessage.warning('主密码设置成功！但您使用了弱密码模式，安全性较低。');
    } else {
      ElMessage.success('主密码设置成功！');
    }

    // 设置成功后跳转到主界面
    await router.push('/')
  } else {
    ElMessage.error('设置密码失败')
  }
}
</script>
<style scoped>
.background-container {
  background-image: url(/images/login_bg.png);
  background-size: cover;
  background-position: center;
  min-height: 100vh;
}
</style>