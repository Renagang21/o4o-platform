import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      filename: 'dist/bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/styles': path.resolve(__dirname, './src/styles')
    }
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React 관련
            if (id.includes('react') && !id.includes('react-')) {
              return 'vendor-react';
            }
            // UI 라이브러리
            if (id.includes('@radix-ui') || id.includes('lucide-react') || 
                id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-ui';
            }
            // 폼 관련
            if (id.includes('react-hook-form') || id.includes('@hookform') || 
                id.includes('zod')) {
              return 'vendor-forms';
            }
            // Tiptap 에디터 - 모든 Tiptap 패키지 분리
            if (id.includes('@tiptap')) {
              return 'vendor-editor';
            }
            // 차트
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // 유틸리티
            if (id.includes('date-fns') || id.includes('axios') || 
                id.includes('js-cookie')) {
              return 'vendor-utils';
            }
            // React Query
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            // 기타 큰 라이브러리들
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
})