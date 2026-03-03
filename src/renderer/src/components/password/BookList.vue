<template>
  <div class="book-list">
    <el-menu :default-active="currentBookId" class="border-none">
      <el-menu-item
        v-for="book in books"
        :key="book.id"
        :index="book.id"
        @click="$emit('select-book', book)"
        class="book-menu-item"
      >
        <div class="book-content">
          <div class="book-header">
            <el-icon class="book-icon"><Notebook /></el-icon>
            <span class="book-name">{{ book.name }}</span>
          </div>

          <!-- 密码本说明 -->
          <div v-if="book.desc">
            <el-text type="info" truncated>{{ book.desc }}</el-text>
          </div>

          <div class="book-actions">
            <el-dropdown @click.stop @command="handleCommand">
              <el-icon class="more-icon"><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', book: book }">
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'delete', book: book }">
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Notebook, MoreFilled } from '@element-plus/icons-vue'
import * as Types from '../../models/types'

interface Props {
  books: Types.PasswordBook[]
}

const props = withDefaults(defineProps<Props>(), {
  books: () => []
})

const emit = defineEmits<{
  (e: 'select-book', book: Types.PasswordBook): void
  (e: 'delete-book', book: Types.PasswordBook): void
  (e: 'edit-book', book: Types.PasswordBook): void
  (e: 'no-book'): void
}>()

const currentBookId = ref('')

// 自动选中第一个
watch(
  () => props.books,
  (newList) => {
    if (newList.length > 0) {
      const firstItem = newList[0]
      currentBookId.value = firstItem.id
      emit('select-book', firstItem)
    } else {
      emit('no-book')
    }
  },
  { immediate: true }
)

const handleCommand = (command: { action: string; book: Types.PasswordBook }) => {
  if (command.action === 'edit') {
    emit('edit-book', command.book)
  } else if (command.action === 'delete') {
    emit('delete-book', command.book)
  }
}
</script>

<style scoped>
.book-list :deep(.el-menu-item) {
  position: relative;
  padding: 0 !important;
}

.book-menu-item {
  height: auto !important;
  line-height: normal !important;
}

.book-content {
  width: 100%;
  padding: 12px 20px;
  position: relative;
}

.book-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.book-icon {
  margin-right: 8px;
  color: #409eff;
  font-size: 16px;
}

.book-name {
  font-weight: 500;
  color: #303133;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc-text {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  padding: 2px 0;
}

/* 自定义 tooltip 样式 */
:deep(.book-desc-tooltip) {
  max-width: 200px !important;
}

.book-actions {
  position: absolute;
  right: 10px;
  top: 12px;
  display: none;
}

.book-list :deep(.el-menu-item:hover) .book-actions {
  display: block;
}

.more-icon {
  cursor: pointer;
  font-size: 16px;
  color: #909399;
}

.book-list :deep(.el-menu-item.is-active) {
  background-color: #ecf5ff !important;
}

.book-list :deep(.el-menu-item.is-active) .book-name {
  color: #409eff;
  font-weight: 600;
}

.book-list :deep(.el-menu-item.is-active) .book-icon {
  color: #409eff;
}
</style>
