<template>
  <el-card>
    <template #header>
      <div class="flex justify-between items-center">
        <h3>密码列表</h3>
        <div class="flex gap-2">
          <el-button type="primary" @click="$emit('add-password')">
            <el-icon>
              <Plus />
            </el-icon>
            添加密码
          </el-button>
        </div>
      </div>
    </template>
    <div v-if="props.passwords.length === 0" class="text-center py-8 text-gray-500">
      <el-icon style="font-size: 32px">
        <InfoFilled />
      </el-icon>
      <p class="mt-2">
        {{ '暂无密码，请添加密码' }}
      </p>
    </div>
    <div v-else>
      <el-table :data="localPasswords" stripe style="width: 100%" row-key="id">
        <el-table-column prop="username" label="用户名"></el-table-column>
        <el-table-column prop="password" label="密码">
          <template #default="scope">
            <div class="flex flex-row items-center">
              <span class="mr-1">{{ scope.row.mask }}</span>
              <el-button link @click="copyPassword(scope.row.password, scope.row.iv)">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="desc" label="描述" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="240">
          <template #default="scope">
            <el-button
              size="small"
              type="success"
              @click="$emit('edit-password', scope.row)"
              circle
            >
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              size="small"
              type="primary"
              :disabled="!scope.row.url"
              @click="openExternal(scope.row.url)"
              circle
            >
              <el-icon><Link /></el-icon>
            </el-button>
            <el-button size="small" type="danger" @click="$emit('del-password', scope.row)" circle>
              <el-icon><Delete /></el-icon>
            </el-button>
            <el-button
              size="small"
              @click="moveUp(scope.$index)"
              :disabled="scope.$index === 0"
              circle
              ><el-icon><ArrowUpBold /></el-icon
            ></el-button>
            <el-button
              size="small"
              @click="moveDown(scope.$index)"
              :disabled="scope.$index === localPasswords.length - 1"
              circle
              ><el-icon><ArrowDownBold /></el-icon
            ></el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import {
  InfoFilled,
  Plus,
  CopyDocument,
  Link,
  Delete,
  Edit,
  ArrowUpBold,
  ArrowDownBold
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '@renderer/store/workspaceStore'
import { ref, watch } from 'vue'
import * as Types from '../../models/types'

const props = defineProps(['passwords', 'spaceId', 'bookId'])
const emit = defineEmits(['add-password', 'edit-password', 'del-password'])

const localPasswords = ref<Types.Password[]>([])

// 监听父组件传入的密码数据变化
watch(
  () => props.passwords,
  (newPasswords) => {
    localPasswords.value = [...newPasswords]
  },
  { immediate: true, deep: true }
)

const { decryptPassword, openExternal } = useWorkspaceStore()

// 复制密码
const copyPassword = async (password: string, iv: string) => {
  const original = await decryptPassword(password, iv)
  await navigator.clipboard.writeText(original)
  ElMessage.success('复制成功!')
}

// 处理拖拽排序（简化版本 - 通过点击上下箭头实现排序）
const moveUp = (index: number) => {
  if (index > 0) {
    const temp = localPasswords.value[index]
    localPasswords.value[index] = localPasswords.value[index - 1]
    localPasswords.value[index - 1] = temp
    updateSortOrder()
  }
}

const moveDown = (index: number) => {
  if (index < localPasswords.value.length - 1) {
    const temp = localPasswords.value[index]
    localPasswords.value[index] = localPasswords.value[index + 1]
    localPasswords.value[index + 1] = temp
    updateSortOrder()
  }
}

// 更新排序到数据库
const updateSortOrder = async () => {
  try {
    const sortOrders = localPasswords.value.map((password, index) => ({
      id: password.id,
      sortOrder: index
    }))

    const result = await window.api.batchUpdatePasswordSort(props.spaceId, props.bookId, sortOrders)

    if (!result.success) {
      ElMessage.error(result.message || '更新排序失败')
      // 如果更新失败，重新从父组件获取数据
      localPasswords.value = [...props.passwords]
    }
  } catch (error) {
    console.error('更新排序出错:', error)
    ElMessage.error('更新排序失败')
    localPasswords.value = [...props.passwords]
  }
}
</script>

<style scoped>
.drag-handle:hover {
  color: #409eff !important;
}
</style>
