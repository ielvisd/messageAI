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
import { useDeepLink } from './composables/useDeepLink'

// Auth is now initialized in the boot file (src/boot/auth.ts)
// This ensures it happens before router navigation

// Set up deep linking for native apps
useDeepLink()
</script>

<style>
/* Global iOS Safe Area Support */
/* Quasar components now handle safe areas natively, so we only need minimal overrides */
.q-header {
  /* Let the browser handle safe area insets naturally - no forced minimums */
  padding-top: env(safe-area-inset-top, 0px) !important;
  padding-left: env(safe-area-inset-left, 0px) !important;
  padding-right: env(safe-area-inset-right, 0px) !important;
}

.q-footer {
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  padding-left: env(safe-area-inset-left, 0px) !important;
  padding-right: env(safe-area-inset-right, 0px) !important;
}
</style>
