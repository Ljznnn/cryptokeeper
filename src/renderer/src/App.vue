<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { useAuthStore } from './store/authStore'

const { checkMasterPasswordStatus } = useAuthStore()

onMounted(async () => {
  await checkMasterPasswordStatus()
})
</script>

<style></style>
