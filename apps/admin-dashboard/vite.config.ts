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
      '@o4o/auth-context': path.resolve(__dirname, '../../packages/auth-context/dist/index.js'),
      // Force React to use single version
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-dev-runtime')
    },
    // Dedupe React to prevent multiple versions
    dedupe: ['react', 'react-dom']
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
    exclude: [
      '@wordpress/blocks',
      '@wordpress/block-editor',
      '@wordpress/components',
      '@wordpress/element',
      '@wordpress/data',
      '@wordpress/i18n'
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
    chunkSizeWarningLimit: 1000,
    // 최적화 설정 추가
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        // Remove console methods in production
        pure_funcs: ['console' + '.log', 'console' + '.info'],
      },
      mangle: {
        safari10: true,
      },
    },
    // modulepreload 설정 추가 - WordPress 청크 제외
    modulePreload: {
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        // WordPress 관련 청크는 modulepreload에서 제외
        return deps.filter(dep => 
          !dep.includes('wp-') && 
          !dep.includes('page-gutenberg') &&
          !dep.includes('@wordpress')
        )
      }
    },
    rollupOptions: {
      ...sharedViteConfig.build?.rollupOptions,
      output: {
        ...sharedViteConfig.build?.rollupOptions?.output,
        // Ensure proper loading order for WordPress modules
        inlineDynamicImports: false,
        manualChunks: (id) => {
          // 공통 설정 먼저 적용
          const sharedChunk = sharedViteConfig.build?.rollupOptions?.output?.manualChunks?.(id);
          if (sharedChunk) return sharedChunk;
          
          // WordPress 관련 모듈은 절대 초기 번들에 포함되지 않도록 함
          if (id.includes('@wordpress') || 
              id.includes('wordpress-initializer') ||
              id.includes('wordpress-dynamic-loader') ||
              id.includes('WordPressBlockEditor') ||
              id.includes('WordPressEditor') ||
              id.includes('GutenbergEditor') ||
              id.includes('blocks/') && !id.includes('node_modules')) {
            // WordPress Block Editor - 단순화된 청킹 전략으로 초기화 문제 해결
            if (id.includes('@wordpress/block-editor')) {
              // Store와 핵심 상태 관리는 최우선
              if (id.includes('store') || 
                  id.includes('reducer') || 
                  id.includes('actions') ||
                  id.includes('selectors')) {
                return 'wp-block-editor-store';
              }
              // 유틸리티와 기본 기능들은 두 번째 우선순위
              if (id.includes('utils') || 
                  id.includes('hooks') || 
                  id.includes('higher-order') ||
                  id.includes('hoc')) {
                return 'wp-block-editor-utils';
              }
              // 나머지 모든 블록 에디터 모듈을 하나로 통합
              // 이렇게 하면 모듈 간 의존성과 초기화 순서 문제가 해결됨
              return 'wp-block-editor-main';
            }
            if (id.includes('@wordpress/blocks')) {
              return 'wp-blocks-core';
            }
            if (id.includes('@wordpress/components')) {
              return 'wp-components';
            }
            if (id.includes('@wordpress/data')) {
              return 'wp-data';
            }
            if (id.includes('@wordpress/element') || 
                id.includes('@wordpress/hooks') || 
                id.includes('@wordpress/compose')) {
              return 'wp-core';
            }
            if (id.includes('@wordpress/i18n')) {
              return 'wp-i18n';
            }
            if (id.includes('@wordpress/api-fetch')) {
              return 'wp-api';
            }
            return 'wp-misc';
          }
          
          if (id.includes('node_modules')) {
            // WordPress 패키지들을 개별 청크로 더 세분화
            if (id.includes('@wordpress')) {
              // 가장 기본이 되는 패키지들 - 다른 모든 WP 패키지가 의존
              if (id.includes('@wordpress/element') || 
                  id.includes('@wordpress/hooks') || 
                  id.includes('@wordpress/compose') ||
                  id.includes('@wordpress/private-apis')) {
                return 'wp-core';
              }
              // i18n은 독립적
              if (id.includes('@wordpress/i18n')) {
                return 'wp-i18n';
              }
              // data는 core에 의존하지만 독립적으로 로드 가능
              if (id.includes('@wordpress/data') || id.includes('@wordpress/redux-routine')) {
                return 'wp-data';
              }
              // api-fetch는 data와 분리
              if (id.includes('@wordpress/api-fetch')) {
                return 'wp-api';
              }
              // 블록 관련 - data에 의존
              if (id.includes('@wordpress/blocks')) {
                return 'wp-blocks-core';
              }
              // 컴포넌트 관련 - element/hooks에 의존
              if (id.includes('@wordpress/components')) {
                return 'wp-components';
              }
              // 블록 에디터 - 모든 것에 의존
              if (id.includes('@wordpress/block-editor')) {
                return 'wp-block-editor';
              }
              // 기타 WordPress 패키지들
              return 'wp-misc';
            }
            // Tiptap 에디터 - 모든 Tiptap 패키지 분리
            if (id.includes('@tiptap')) {
              return 'vendor-tiptap';
            }
            // Monaco 에디터
            if (id.includes('monaco-editor')) {
              return 'vendor-monaco';
            }
            // 기타 큰 라이브러리들
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
          }
          
          // 블록별 청크 분리 - Cover, Group, Columns 등 큰 블록들
          if (id.includes('blocks/cover')) {
            return 'block-cover';
          }
          if (id.includes('blocks/group')) {
            return 'block-group';
          }
          if (id.includes('blocks/columns')) {
            return 'block-columns';
          }
          if (id.includes('blocks/cpt-acf-loop')) {
            return 'block-cpt-loop';
          }
          
          // 페이지별 청크 분리
          if (id.includes('TemplatePartEditor')) {
            return 'page-template-editor';
          }
          if (id.includes('GutenbergEditor') || id.includes('WordPressBlockEditor')) {
            return 'page-gutenberg';
          }
        }
      }
    }
  }
}))