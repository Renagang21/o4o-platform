import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // react-router-dom 중복 인스턴스 방지 (기존 서비스와 동일 정책)
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    // 기존 서비스 포트와 충돌하지 않는 값 (glycopharm 4201 / kpa 4202 계열 회피)
    port: 4207,
  },
})
