<template>
  <el-text>当前空间:</el-text>
  <el-select
    v-model="props.currentSpaceId"
    placeholder="选择空间"
    no-data-text="无可用空间"
    style="width: 120px"
    @change="$emit('space-change', $event)"
    >
    <el-option
      v-for="space in props.workspaces"
      :key="space.id"
      :label="space.name"
      :value="space.id">
    </el-option>
    <template #footer>
      <el-button type="primary" @click="$emit('create-space')">
        <el-icon>
          <Plus/>
        </el-icon>
        新建空间
      </el-button>
    </template>
  </el-select>
</template>

<script setup lang="ts">
import {Plus} from '@element-plus/icons-vue'

const props = defineProps(['workspaces', 'currentSpaceId'])
// 定义 emits
const emit = defineEmits(['space-change', 'create-space'])
</script>
