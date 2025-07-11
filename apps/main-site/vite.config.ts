import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@o4o/ui': path.resolve(__dirname, '../../packages/ui'),
      '@o4o/types': path.resolve(__dirname, '../../packages/types'),
      '@o4o/config': path.resolve(__dirname, '../../packages/config'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.VITE_DEV_SERVER_PORT || '3000'),
    strictPort: false,
    allowedHosts: [
      'neture.co.kr',
      'localhost',
      '127.0.0.1'
    ]
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
  },
  optimizeDeps: {
    exclude: ['@vite/client', '@vite/env'],
    force: true, // 강제 의존성 재생성
  },
})

