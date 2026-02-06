<template>
  <div class="flex flex-col h-full">
    <header class="bg-white shadow px-4 py-3 flex justify-between items-center">
      <div>
        <el-page-header @back="backToMain" title="返回"></el-page-header>
      </div>
    </header>

    <main class="flex-1 overflow-auto bg-gray-50 p-4">
      <el-card>
        <template #header>
          <h3>回收站</h3>
        </template>
        <div v-if="deletedItems.length === 0" class="text-center py-8 text-gray-500">
          <el-icon style="font-size: 32px;"><Delete /></el-icon>
          <p class="mt-2">回收站为空</p>
        </div>
        <div v-else>
          <el-table :data="deletedItems" style="width: 100%">
            <el-table-column prop="name" label="名称"></el-table-column>
            <el-table-column label="删除时间">
              <template #default="scope">
                {{ new Date(scope.row.deletedAt).toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button size="small" @click="restoreItem(scope.row.id)">恢复</el-button>
                <el-button size="small" type="danger" @click="permanentDelete(scope.row.id)">彻底删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const deletedItems = ref([])

// 加载回收站项目
const loadDeletedItems = async () => {
  try {
    deletedItems.value = await window.api.getDeletedItems()
  } catch (error) {
    console.error('加载回收站失败:', error)
  }
}

// 恢复项目
const restoreItem = async (itemId) => {
  try {
    const result = await window.api.restoreItem(itemId)
    if (result.success) {
      ElMessage.success(result.message)
      // 重新加载回收站项目
      await loadDeletedItems()
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    console.error('恢复项目失败:', error)
    ElMessage.error('恢复项目失败')
  }
}

// 彻底删除项目
const permanentDelete = async (itemId) => {
  try {
    const result = await window.api.permanentDelete(itemId)
    if (result.success) {
      ElMessage.success(result.message)
      // 重新加载回收站项目
      await loadDeletedItems()
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    console.error('彻底删除项目失败:', error)
    ElMessage.error('彻底删除项目失败')
  }
}

// 返回主界面
const backToMain = () => {
  router.push('/')
}

onMounted(() => {
  loadDeletedItems()
})
</script>
