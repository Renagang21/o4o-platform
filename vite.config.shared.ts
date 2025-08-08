import { UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 모든 프론트엔드 앱에서 공통으로 사용하는 Vite 설정
 */
export const sharedViteConfig: UserConfig = {
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
    })
  ],
  resolve: {
    alias: {
      // React 19 호환성을 위한 alias - 모든 React imports가 동일한 인스턴스를 사용하도록
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'global': 'globalThis',
  },
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'esbuild',
    target: 'esnext', // React 19 호환성을 위해 최신 타겟 사용
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
      extensions: ['.js', '.cjs'],
    },
    rollupOptions: {
      output: {
        // 테스트 파일 제외
        manualChunks: (id) => {
          // 테스트 파일은 번들에 포함하지 않음
          if (id.includes('__tests__') || id.includes('.test.') || id.includes('.spec.')) {
            return 'test-excluded';
          }
          
          if (id.includes('node_modules')) {
            // React 관련 - Radix UI도 포함시켜서 순서 보장
            if ((id.includes('react') && !id.includes('react-')) || id.includes('@radix-ui')) {
              return 'vendor-react';
            }
            // 기타 UI 라이브러리
            if (id.includes('lucide-react') || 
                id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-ui';
            }
            // 폼 관련
            if (id.includes('react-hook-form') || id.includes('@hookform') || 
                id.includes('zod')) {
              return 'vendor-forms';
            }
            // React Query
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            // 유틸리티
            if (id.includes('date-fns') || id.includes('axios') || 
                id.includes('js-cookie')) {
              return 'vendor-utils';
            }
            // Socket.io
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
            // 차트 라이브러리
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
          }
        }
      },
      // 테스트 파일 제외 설정
      external: (id) => {
        return id.includes('__tests__') || id.includes('.test.') || id.includes('.spec.');
      }
    },
    chunkSizeWarningLimit: 500
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-router-dom',
      '@tanstack/react-query',
      'react-hot-toast'
    ],
    exclude: ['@vite/client', '@vite/env'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // SSR 관련 설정
  ssr: {
    noExternal: ['react', 'react-dom'],
  }
}