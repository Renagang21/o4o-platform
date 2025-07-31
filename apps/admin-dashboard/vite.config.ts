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
      '@o4o/types': path.resolve(__dirname, '../../packages/types/dist'),
      '@o4o/utils': path.resolve(__dirname, '../../packages/utils/dist'),
      '@o4o/ui': path.resolve(__dirname, '../../packages/ui/dist'),
      '@o4o/auth-client': path.resolve(__dirname, '../../packages/auth-client/dist'),
      '@o4o/auth-context': path.resolve(__dirname, '../../packages/auth-context/dist')
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
      '@o4o/types', 
      '@o4o/utils', 
      '@o4o/ui', 
      '@o4o/auth-client', 
      '@o4o/auth-context'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    ...sharedViteConfig.build,
    outDir: 'dist',
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
            // 차트
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // 기타 큰 라이브러리들
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
          }
        }
      }
    }
  }
}))