// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/pages': path.resolve(__dirname, './src/pages'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          styled: ['styled-components'],
          utils: ['axios']
        }
      }
    },
    // 이미지 최적화를 위한 asset 설정
    assetsDir: 'assets',
    assetsInlineLimit: 4096, // 4KB 미만의 이미지는 base64로 인라인
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'styled-components', 'axios'],
    exclude: ['sharp'] // 서버 전용 패키지 제외
  },
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  }
})
