import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VueMcp } from 'vite-plugin-vue-mcp'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    VueMcp({
      printUrl: true,
      updateCursorMcpJson: true
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
