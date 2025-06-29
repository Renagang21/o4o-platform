import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../shared'),
      '@shared/editor': path.resolve(__dirname, '../../shared/components/editor'),
      '@shared/editor/fullscreen': path.resolve(__dirname, '../../shared/components/editor/fullscreen'),
      '@shared/admin': path.resolve(__dirname, '../../shared/components/admin'),
      '@shared/theme': path.resolve(__dirname, '../../shared/components/theme'),
      '@shared/ui': path.resolve(__dirname, '../../shared/components/ui'),
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
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'utils': ['zustand', 'axios', 'react-hot-toast'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@vite/client', '@vite/env'],
    force: true, // 강제 의존성 재생성
  },
})

