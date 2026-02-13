import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@o4o/operator-core': path.resolve(__dirname, '../../packages/operator-core/src'),
    },
  },
  server: {
    port: 4101,
  },
})
