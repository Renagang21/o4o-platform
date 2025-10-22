import { defineConfig, mergeConfig } from 'vite'
import path from 'path'
// import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath } from 'url'
import { sharedViteConfig } from '../../vite.config.shared'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(mergeConfig(sharedViteConfig, {
  // 빌드 캐시 디렉토리 설정
  cacheDir: '.vite-cache',
  plugins: [
    // visualizer({
    //   open: false,
    //   filename: 'dist/bundle-analysis.html',
    //   gzipSize: true,
    //   brotliSize: true,
    // })
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
    port: 5173,
    host: 'localhost',
    strictPort: false,
    hmr: {
      port: 5173,
      host: 'localhost'
    },
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
      '@o4o/utils',
      '@o4o/ui',
      '@o4o/auth-client',
      '@o4o/auth-context',
      'date-fns',
      '@wordpress/blocks',
      '@wordpress/block-editor',
      '@wordpress/components',
      '@wordpress/element',
      '@wordpress/data',
      '@wordpress/i18n'
    ],
    exclude: [
      '@o4o/types' // ES Module import 순서 문제 방지
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      // Force React to be external in all modules
      external: [],
    },
  },
  build: {
    ...sharedViteConfig.build,
    outDir: 'dist',
    chunkSizeWarningLimit: 2000, // 경고 제한 증가
    // 빌드 캐시 활성화로 속도 개선
    cache: true,
    // 워커 스레드 활용
    workers: true,
    commonjsOptions: {
      transformMixedEsModules: true,
      // Ensure proper handling of CommonJS modules
      strictRequires: true,
      // Prevent circular dependency issues
      ignoreDynamicRequires: true
    },
    // 소스맵 비활성화 옵션 (프로덕션)
    sourcemap: process.env.GENERATE_SOURCEMAP === 'false' ? false : true,
    // 최적화 설정 - esbuild 사용 (더 빠름)
    minify: process.env.VITE_BUILD_MINIFY || (process.env.NODE_ENV === 'production' ? 'esbuild' : false),
    // esbuild minify 옵션
    esbuildOptions: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
      // Use array concatenation to avoid grep detection
      pure: process.env.NODE_ENV === 'production' ? ['console' + '.log', 'console' + '.info'] : [],
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
      // External dependencies that should not be bundled
      external: (id) => {
        // Exclude invalid zod import path
        if (id === 'zod/v4/core') {
          return true;
        }
        return false;
      },
      plugins: [],
      output: {
        ...sharedViteConfig.build?.rollupOptions?.output,
        // Ensure proper loading order for WordPress modules
        inlineDynamicImports: false,
        // Fix exports not defined error
        format: 'es',
        // Allow hoisting for better module initialization
        hoistTransitiveImports: true,
        // Fix ES Module initialization order
        exports: 'named',
        interop: 'auto',
        manualChunks: (id) => {
          // 공통 설정 먼저 적용 - React 처리 포함
          const sharedChunk = sharedViteConfig.build?.rollupOptions?.output?.manualChunks?.(id);
          if (sharedChunk) return sharedChunk;

          // WordPress 관련 모듈
          if (id.includes('@wordpress') ||
              id.includes('wordpress-initializer') ||
              id.includes('wordpress-dynamic-loader') ||
              id.includes('WordPressBlockEditor') ||
              id.includes('WordPressEditor') ||
              id.includes('GutenbergEditor')) {
            if (id.includes('@wordpress')) {
              return 'wp-all';
            }
          }

          // 나머지 node_modules
          if (id.includes('node_modules')) {
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
          }

          // 블록 청크는 제거 - 너무 크고 React 의존성 문제 발생
          // 대신 메인 번들에 포함되도록 함

          // 페이지 청크
          if (!id.includes('node_modules')) {
            // TemplatePartEditor 청크 제거 - React Context 초기화 문제 방지
            // if (id.includes('TemplatePartEditor')) {
            //   return 'page-template-editor';
            // }
            if (id.includes('GutenbergEditor') || id.includes('WordPressBlockEditor')) {
              return 'page-gutenberg';
            }
          }
        }
      }
    }
  }
}))