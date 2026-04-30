import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@datepicker/core': fileURLToPath(new URL('../../src/engine', import.meta.url)),
      '@datepicker/styles': fileURLToPath(new URL('../../src/styles', import.meta.url)),
    },
  },
})
