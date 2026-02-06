<template>
  <div class="flex flex-col h-full">
    <header class="bg-white shadow px-4 py-3 flex justify-between items-center">
      <div>
        <el-page-header @back="backToMain" title="返回"></el-page-header>
      </div>
    </header>

    <main class="flex-1 overflow-auto bg-gray-50 p-4">
      <el-tabs v-model="activeTab" type="card">
        <!-- 基本设置 -->
        <el-tab-pane label="基本设置" name="basic">
          <el-card>
            <template #header>
              <h3>⚙️ 基本设置</h3>
            </template>
            <el-form :model="settingsForm" label-width="120px">
              <el-form-item label="默认空间">
                <el-select v-model="settingsForm.defaultSpaceId" placeholder="请选择默认空间" no-data-text="无可用空间" class="w-full" >
                  <el-option
                    v-for="space in workspaceStore.spaces"
                    :key="space.id"
                    :label="space.name"
                    :value="space.id">
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="主密码">
                <el-button @click="showChangePasswordDialog" type="primary" plain>修改</el-button>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveSettings">保存设置</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>

        <!-- 数据统计 -->
        <el-tab-pane label="数据统计" name="stats">
          <el-card>
            <template #header>
              <h3>📊 数据统计</h3>
            </template>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- 空间统计 -->
              <el-card class="text-center">
                <div class="text-3xl font-bold text-blue-600 mb-2">{{ actualSpaceCount }}</div>
                <div class="text-lg text-gray-600">空间总数</div>
              </el-card>

              <!-- 密码本统计 -->
              <el-card class="text-center">
                <div class="text-3xl font-bold text-green-600 mb-2">{{ actualPasswordBookCount }}</div>
                <div class="text-lg text-gray-600">密码本总数</div>
              </el-card>

              <!-- 密码统计 -->
              <el-card class="text-center">
                <div class="text-3xl font-bold text-purple-600 mb-2">{{ actualPasswordCount }}</div>
                <div class="text-lg text-gray-600">密码总数</div>
              </el-card>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- 关于 -->
        <el-tab-pane label="关于" name="about">
          <el-card>
            <template #header>
              <h3>ℹ️ 关于 CryptoKeeper</h3>
            </template>
            <div class="space-y-4">
              <div>
                <h4 class="text-lg font-medium mb-2">🔐 安全特性</h4>
                <ul class="list-disc list-inside space-y-1 text-gray-700">
                  <li>AES-256-GCM 加密算法</li>
                  <li>HKDF 标准密钥派生</li>
                  <li>PBKDF2 密码强化（15万次迭代）</li>
                  <li>恒定时间密码比较防时序攻击</li>
                  <li>智能密码强度检测</li>
                  <li>防暴力破解锁定机制</li>
                  <li>安全内存管理</li>
                </ul>
              </div>

              <div>
                <h4 class="text-lg font-medium mb-2">📊 技术栈</h4>
                <ul class="list-disc list-inside space-y-1 text-gray-700">
                  <li>Electron 跨平台桌面应用</li>
                  <li>Vue 3 + TypeScript 前端框架</li>
                  <li>Node.js crypto 原生加密模块</li>
                  <li>SQLite 本地数据存储</li>
                </ul>
              </div>

              <div>
                <h4 class="text-lg font-medium mb-2">🔗 项目信息</h4>
                <ul class="list-disc list-inside space-y-1 text-gray-700">
                  <li>GitHub: <a href="https://github.com/Ljznnn/cryptokeeper" class="text-blue-600 hover:underline" target="_blank">https://github.com/your-username/cryptokeeper</a></li>
                  <li>版本: 1.0.0</li>
                  <li>许可证: MIT</li>
                </ul>
              </div>

              <div>
                <h4 class="text-lg font-medium mb-2">⚠️ 安全警告</h4>
                <p class="text-gray-700">
                  本软件提供本地密码管理功能，请妥善保管您的主密码。
                  主密码一旦丢失将无法恢复任何数据。
                  建议定期备份重要密码数据。
                </p>
              </div>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </main>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="changePasswordDialogVisible"
      title="修改主密码"
      width="500px"
      :before-close="handleCloseDialog">
      <el-form
        :model="passwordForm"
        :rules="passwordRules"
        ref="passwordFormRef"
        label-width="100px">
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password>
          </el-input>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseDialog">取消</el-button>
          <el-button
            type="primary"
            @click="handleChangePassword"
            :loading="changingPassword">
            确认修改
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {useWorkspaceStore} from "@renderer/store/workspaceStore";
import {useSettingsStore} from '@renderer/store/settingsStore'
import { passwordCrypto } from '@renderer/utils/cryptoUtils'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const settingsStore = useSettingsStore()
const passwordFormRef = ref()
const changingPassword = ref(false)
const changePasswordDialogVisible = ref(false)
const activeTab = ref('basic')

const settingsForm = ref({
  defaultSpaceId: ''
})

const passwordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

const passwordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        const strength = passwordCrypto.evaluatePasswordStrength(value);
        if (value.length < 12) {
          callback(new Error('密码长度至少12位'))
        } else if (!strength.isValid) {
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

onMounted(async () => {
  // 加载现有设置
  const settings = settingsStore.settings
  if (settings.defaultSpaceId) {
    settingsForm.value.defaultSpaceId = settings.defaultSpaceId
  }

  // 确保工作区数据已加载
  await workspaceStore.initWorkspace();

  // 加载统计数据
  await loadStats();
})

// 保存设置
const saveSettings = async () => {
  try {
    const success = await settingsStore.updateSetting('defaultSpaceId', settingsForm.value.defaultSpaceId)
    if (success) {
      ElMessage.success('设置已保存')
    } else {
      ElMessage.error('保存设置失败')
    }
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存设置失败')
  }
}

// 显示修改密码对话框
const showChangePasswordDialog = () => {
  changePasswordDialogVisible.value = true
}

// 关闭对话框
const handleCloseDialog = () => {
  changePasswordDialogVisible.value = false
  // 清空表单
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  // 重置表单验证状态
  if (passwordFormRef.value) {
    passwordFormRef.value.resetFields()
  }
}

// 修改主密码
const handleChangePassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      changingPassword.value = true
      try {
        // 评估新密码强度
        const strength = passwordCrypto.evaluatePasswordStrength(passwordForm.newPassword);
        if (!strength.isValid) {
          ElMessage.warning('请设置更强的密码后再继续');
          return;
        }

        // 由于安全考虑，这里直接设置新密码（不需要旧密码验证）
        // 在实际应用中可能需要更复杂的验证机制
        const result = await window.api.setMasterPassword(passwordForm.newPassword)

        if (result.success) {
          ElMessage.success('主密码修改成功')
          handleCloseDialog()
        } else {
          ElMessage.error(result.message || '修改密码失败')
        }
      } catch (error) {
        console.error('修改密码失败:', error)
        ElMessage.error('修改密码过程中出现错误')
      } finally {
        changingPassword.value = false
      }
    }
  })
}

// 返回主界面
const backToMain = () => {
  router.push('/')
}

// 计算属性
const totalPasswordBooksCount = computed(() => {
  let count = 0;
  if (workspaceStore.spaces && Array.isArray(workspaceStore.spaces)) {
    workspaceStore.spaces.forEach(space => {
      if (space.pwBooks && Array.isArray(space.pwBooks)) {
        count += space.pwBooks.length;
      }
    });
  }
  return count;
});

const totalPasswordsCount = computed(() => {
  let count = 0;
  if (workspaceStore.spaces && Array.isArray(workspaceStore.spaces)) {
    workspaceStore.spaces.forEach(space => {
      if (space.pwBooks && Array.isArray(space.pwBooks)) {
        space.pwBooks.forEach(book => {
          if (book.pws && Array.isArray(book.pws)) {
            count += book.pws.length;
          }
        });
      }
    });
  }
  return count;
});

// 直接从数据库获取统计数据
const statsData = ref({
  spaceCount: 0,
  passwordBookCount: 0,
  passwordCount: 0
});

// 获取统计信息
const loadStats = async () => {
  try {
    const response = await window.api.getStats();
    if (response.success) {
      statsData.value = response.data;
    } else {
      console.error('获取统计数据失败:', response.message);
    }
  } catch (error) {
    console.error('获取统计数据时出错:', error);
  }
};

// 替换计算属性，使用数据库获取的统计数据
const actualSpaceCount = computed(() => statsData.value.spaceCount);
const actualPasswordBookCount = computed(() => statsData.value.passwordBookCount);
const actualPasswordCount = computed(() => statsData.value.passwordCount);
</script>
