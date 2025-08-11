import { defineConfig, mergeConfig } from 'vite'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath } from 'url'
import { sharedViteConfig } from '../../vite.config.shared'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(mergeConfig(sharedViteConfig, {
  plugins: [
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
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@o4o/types': path.resolve(__dirname, '../../packages/types/dist/index.js'),
      '@o4o/utils': path.resolve(__dirname, '../../packages/utils/dist/index.js'),
      '@o4o/ui': path.resolve(__dirname, '../../packages/ui/dist/index.js'),
      '@o4o/auth-client': path.resolve(__dirname, '../../packages/auth-client/dist/index.js'),
      '@o4o/auth-context': path.resolve(__dirname, '../../packages/auth-context/dist/index.js')
    }
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: [
      'admin.neture.co.kr',
      'www.neture.co.kr',
      'shop.neture.co.kr',
      'forum.neture.co.kr',
      'signage.neture.co.kr',
      'funding.neture.co.kr',
      'neture.co.kr',
      'localhost'
    ]
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@tanstack/react-query',
      '@o4o/types', 
      '@o4o/utils', 
      '@o4o/ui', 
      '@o4o/auth-client', 
      '@o4o/auth-context'
    ],
    exclude: [],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    ...sharedViteConfig.build,
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      ...sharedViteConfig.build?.rollupOptions,
      output: {
        ...sharedViteConfig.build?.rollupOptions?.output,
        manualChunks: (id) => {
          // 공통 설정 먼저 적용
          const sharedChunk = sharedViteConfig.build?.rollupOptions?.output?.manualChunks?.(id);
          if (sharedChunk) return sharedChunk;
          
          if (id.includes('node_modules')) {
            // Tiptap 에디터 - 모든 Tiptap 패키지 분리
            if (id.includes('@tiptap')) {
              return 'vendor-editor';
            }
            // 기타 큰 라이브러리들
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
          }
          
          // 큰 페이지들을 별도 청크로 분리
          if (id.includes('/src/pages/')) {
            if (id.includes('TemplatePartEditor') || id.includes('GutenbergEditor') || id.includes('GutenbergPage')) {
              return 'editor-pages';
            }
            if (id.includes('Content') || id.includes('MediaLibrary')) {
              return 'content-pages';
            }
            if (id.includes('Settings') || id.includes('ProductForm') || id.includes('OrderDetail')) {
              return 'admin-pages';
            }
          }
          
          // Gutenberg/Editor 관련 코드 분리
          if (id.includes('/src/') && (id.includes('gutenberg') || id.includes('editor') || id.includes('blocks'))) {
            return 'editor-core';
          }
        }
      }
    }
  }
}))