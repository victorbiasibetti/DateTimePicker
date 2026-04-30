import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@datepicker/core': fileURLToPath(new URL('../../src/engine', import.meta.url)),
      '@datepicker/styles': fileURLToPath(new URL('../../src/styles', import.meta.url)),
    },
  },
})
