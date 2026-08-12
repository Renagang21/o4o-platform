import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    // 기존 서비스 포트(4201~4207) 회피
    port: 4208,
  },
})
