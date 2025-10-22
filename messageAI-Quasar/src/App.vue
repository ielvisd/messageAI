<template>
  <div v-if="!authInitialized" class="fullscreen flex flex-center">
    <div class="text-center">
      <q-spinner-dots size="60px" color="primary" />
      <div class="q-mt-md text-h6">Loading...</div>
      <div class="text-caption text-grey-6">Initializing authentication</div>
    </div>
  </div>
  <router-view v-else />
</template>

<script setup lang="ts">
import { authInitialized } from './state/auth'
// Auth is now initialized in the boot file (src/boot/auth.ts)
// This ensures it happens before router navigation
</script>
