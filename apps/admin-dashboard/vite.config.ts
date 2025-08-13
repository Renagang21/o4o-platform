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
            // WordPress Block Editor를 기능별로 세분화
            if (id.includes('@wordpress/block-editor')) {
              // 핵심 컴포넌트
              if (id.includes('block-list') || 
                  id.includes('block-tools') || 
                  id.includes('writing-flow') ||
                  id.includes('observe-typing')) {
                return 'wp-block-editor-core';
              }
              // UI 컴포넌트
              if (id.includes('block-inspector') || 
                  id.includes('block-toolbar') || 
                  id.includes('inserter') ||
                  id.includes('block-settings')) {
                return 'wp-block-editor-ui';
              }
              // 포맷팅 관련
              if (id.includes('rich-text') || 
                  id.includes('url-input') || 
                  id.includes('link-control') ||
                  id.includes('format-library')) {
                return 'wp-block-editor-formats';
              }
              // 미디어 관련
              if (id.includes('media-upload') || 
                  id.includes('media-placeholder') ||
                  id.includes('image-editor')) {
                return 'wp-block-editor-media';
              }
              // 컬러 및 테마 - 다른 모듈과 병합하여 초기화 문제 해결
              if (id.includes('colors') || 
                  id.includes('color-palette') ||
                  id.includes('color-picker') ||
                  id.includes('gradient')) {
                return 'wp-block-editor-misc';  // colors를 misc에 병합
              }
              // 타이포그래피
              if (id.includes('font') || 
                  id.includes('typography') ||
                  id.includes('text-size') ||
                  id.includes('line-height')) {
                return 'wp-block-editor-typography';
              }
              // 레이아웃 및 공간
              if (id.includes('spacing') || 
                  id.includes('dimensions') ||
                  id.includes('padding') ||
                  id.includes('margin') ||
                  id.includes('gap')) {
                return 'wp-block-editor-spacing';
              }
              // 테두리 및 그림자
              if (id.includes('border') || 
                  id.includes('shadow') ||
                  id.includes('radius') ||
                  id.includes('outline')) {
                return 'wp-block-editor-borders';
              }
              // 전역 스타일 시스템
              if (id.includes('global-styles') || 
                  id.includes('style-provider') ||
                  id.includes('style-engine') ||
                  id.includes('styles-provider') ||
                  id.includes('theme-json')) {
                return 'wp-block-editor-global-styles';
              }
              // 템플릿 시스템
              if (id.includes('template') || 
                  id.includes('template-part') ||
                  id.includes('template-areas') ||
                  id.includes('page-template')) {
                return 'wp-block-editor-templates';
              }
              // 블록 라이브러리 (기본 블록들)
              if (id.includes('library') || 
                  id.includes('block-library') ||
                  id.includes('default-blocks') ||
                  id.includes('core-blocks')) {
                return 'wp-block-editor-library';
              }
              // 드래그 앤 드롭
              if (id.includes('drag') || 
                  id.includes('drop') ||
                  id.includes('draggable') ||
                  id.includes('sortable') ||
                  id.includes('movable')) {
                return 'wp-block-editor-dnd';
              }
              // 키보드 단축키
              if (id.includes('keyboard') || 
                  id.includes('shortcut') ||
                  id.includes('keybind') ||
                  id.includes('hotkey')) {
                return 'wp-block-editor-keyboard';
              }
              // 실행 취소/다시 실행
              if (id.includes('undo') || 
                  id.includes('redo') ||
                  id.includes('history')) {
                return 'wp-block-editor-history';
              }
              // 접근성
              if (id.includes('a11y') || 
                  id.includes('accessibility') ||
                  id.includes('aria') ||
                  id.includes('screen-reader')) {
                return 'wp-block-editor-a11y';
              }
              // 블록 네비게이션
              if (id.includes('navigation') || 
                  id.includes('navigator') ||
                  id.includes('tree-view') ||
                  id.includes('outline')) {
                return 'wp-block-editor-navigation';
              }
              // 복사/붙여넣기
              if (id.includes('copy') || 
                  id.includes('paste') ||
                  id.includes('clipboard')) {
                return 'wp-block-editor-clipboard';
              }
              // 블록 변형 및 패턴
              if (id.includes('block-variation') || 
                  id.includes('block-pattern') || 
                  id.includes('block-styles') ||
                  id.includes('block-transforms')) {
                return 'wp-block-editor-patterns';
              }
              // 유틸리티 및 헬퍼
              if (id.includes('utils') || 
                  id.includes('hooks') || 
                  id.includes('higher-order') ||
                  id.includes('hoc')) {
                return 'wp-block-editor-utils';
              }
              // Store 및 상태 관리
              if (id.includes('store') || 
                  id.includes('reducer') || 
                  id.includes('actions') ||
                  id.includes('selectors')) {
                return 'wp-block-editor-store';
              }
              // 블록 프리뷰
              if (id.includes('preview') || 
                  id.includes('block-preview') ||
                  id.includes('live-preview')) {
                return 'wp-block-editor-preview';
              }
              // 실험적 기능
              if (id.includes('experimental') || 
                  id.includes('__experimental') ||
                  id.includes('unstable') ||
                  id.includes('__unstable')) {
                return 'wp-block-editor-experimental';
              }
              // 블록 에디터 API
              if (id.includes('api') || 
                  id.includes('registry') ||
                  id.includes('provider') ||
                  id.includes('context')) {
                return 'wp-block-editor-api';
              }
              // 블록 변환
              if (id.includes('transform') || 
                  id.includes('convert') ||
                  id.includes('migration')) {
                return 'wp-block-editor-transforms';
              }
              // 블록 속성
              if (id.includes('attributes') || 
                  id.includes('supports') ||
                  id.includes('metadata')) {
                return 'wp-block-editor-attributes';
              }
              // 인라인 편집
              if (id.includes('inline') || 
                  id.includes('editable') ||
                  id.includes('contenteditable')) {
                return 'wp-block-editor-inline';
              }
              // 블록 메뉴 및 설정
              if (id.includes('menu') || 
                  id.includes('dropdown') ||
                  id.includes('popover') ||
                  id.includes('tooltip')) {
                return 'wp-block-editor-menus';
              }
              // 블록 선택 및 포커스
              if (id.includes('selection') || 
                  id.includes('focus') ||
                  id.includes('caret') ||
                  id.includes('cursor')) {
                return 'wp-block-editor-selection';
              }
              // 파일 업로드
              if (id.includes('upload') || 
                  id.includes('dropzone') ||
                  id.includes('file-input')) {
                return 'wp-block-editor-upload';
              }
              // 나머지 (아직 분류되지 않은 것들)
              return 'wp-block-editor-misc';
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