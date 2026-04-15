import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // react-router-dom 중복 인스턴스 방지
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 4201,
  },
})
