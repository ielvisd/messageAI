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

<style>
/* Global iOS Safe Area Support */
/* Use max() to fallback to 44px if env() isn't available */
.q-header {
  /* Use env() if available, fallback to 44px for notched iPhones */
  padding-top: constant(safe-area-inset-top, 44px) !important;
  padding-top: max(44px, env(safe-area-inset-top, 0px)) !important;
  padding-left: constant(safe-area-inset-left, 0px) !important;
  padding-left: env(safe-area-inset-left, 0px) !important;
  padding-right: constant(safe-area-inset-right, 0px) !important;
  padding-right: env(safe-area-inset-right, 0px) !important;
}

.q-footer {
  padding-bottom: constant(safe-area-inset-bottom, 0px) !important;
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  padding-left: constant(safe-area-inset-left, 0px) !important;
  padding-left: env(safe-area-inset-left, 0px) !important;
  padding-right: constant(safe-area-inset-right, 0px) !important;
  padding-right: env(safe-area-inset-right, 0px) !important;
}
</style>
