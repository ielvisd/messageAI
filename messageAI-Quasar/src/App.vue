<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { initAuth } from './state/auth'

onMounted(() => {
  void initAuth()
})
</script>
