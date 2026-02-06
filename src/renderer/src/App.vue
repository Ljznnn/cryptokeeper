<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import {onMounted} from 'vue'
import { useAuthStore } from './store/authStore'
import {useWorkspaceStore} from "./store/workspaceStore";

const { checkMasterPasswordStatus } = useAuthStore()
const workspaceStore = useWorkspaceStore()

onMounted(async () => {
  await checkMasterPasswordStatus()
})
</script>

<style>

</style>
