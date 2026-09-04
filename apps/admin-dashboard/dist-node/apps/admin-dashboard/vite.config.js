import { defineConfig, mergeConfig } from 'vite';
import path from 'path';
// import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath } from 'url';
import { sharedViteConfig } from '../../vite.config.shared';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
            // Workspace packages - map to dist directory, not index.js file
            // This allows subpath imports like '@o4o/block-renderer/metadata'
            '@o4o/types': path.resolve(__dirname, '../../packages/types/dist'),
            '@o4o/utils': path.resolve(__dirname, '../../packages/utils/dist'),
            '@o4o/ui': path.resolve(__dirname, '../../packages/ui/dist'),
            '@o4o/auth-client': path.resolve(__dirname, '../../packages/auth-client/dist'),
            // WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1:
            //   role prefix → canonical service_key 변환(resolveCanonicalServiceKey) SSOT 재사용.
            //   security-core 는 전 파일이 `import type` 뿐이라 런타임 의존이 없다(브라우저 안전).
            //   build:packages 체인에 없는 패키지라 dist 를 전제하지 않고 src 를 직접 가리킨다
            //   (@o4o/types 등 기존 tsconfig paths 와 동일 패턴).
            '@o4o/security-core': path.resolve(__dirname, '../../packages/security-core/src'),
            '@o4o/auth-context': path.resolve(__dirname, '../../packages/auth-context/dist'),
            '@o4o/block-renderer': path.resolve(__dirname, '../../packages/block-renderer/dist'),
            '@o4o/slide-app': path.resolve(__dirname, '../../packages/slide-app/dist'),
            // Forum app packages - map to source directories for lazy loading
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   '@o4o/forum-core-yaksa' alias 제거 — 유일 소비처였던 /yaksa/communities
            //   동적 import 3건과 packages/forum-yaksa 를 같은 커밋에서 함께 제거했다.
            '@o4o/forum-core': path.resolve(__dirname, '../../packages/forum-core'),
            // Pharmacy AI Insight - map to source for lazy loading
            '@o4o/pharmacy-ai-insight': path.resolve(__dirname, '../../packages/pharmacy-ai-insight/src'),
            // AI Prompts - map to dist for subpath imports (@o4o/ai-prompts/admin)
            '@o4o/ai-prompts': path.resolve(__dirname, '../../packages/ai-prompts/dist'),
            '@o4o/content-editor': path.resolve(__dirname, '../../packages/content-editor/dist'),
            // Force React to use single version
            'react': path.resolve(__dirname, '../../node_modules/react'),
            'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
            'react/jsx-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-runtime'),
            'react/jsx-dev-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-dev-runtime'),
            'react-router-dom': path.resolve(__dirname, '../../node_modules/react-router-dom')
        },
        // Dedupe React and React Router to prevent multiple versions
        dedupe: ['react', 'react-dom', 'react-router-dom']
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
            '@o4o/ui'
            // (제거됨) '@wordpress/*' 6종 — WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1
            //   설치되지 않은 패키지를 pre-bundle 대상으로 지정하던 dead 항목이다
            //   (package.json · lockfile · source import 모두 0건).
        ],
        exclude: [
            '@o4o/types', // ES Module import 순서 문제 방지
            '@o4o/auth-client', // Workspace package - pre-bundling 방지 (항상 최신 빌드 사용)
            '@o4o/auth-context', // Workspace package - pre-bundling 방지
            '@o4o/block-renderer', // Workspace package - pre-bundling 방지
            '@o4o/slide-app', // Workspace package - pre-bundling 방지
            '@o4o/pharmacy-ai-insight', // Pharmacy AI Insight - source imports
            '@o4o/forum-core' // Forum app packages - source imports
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
        commonjsOptions: {
            transformMixedEsModules: true,
            // Ensure proper handling of CommonJS modules
            strictRequires: true,
            // Prevent circular dependency issues
            ignoreDynamicRequires: true
        },
        // 소스맵 - 개발환경에서만 생성
        sourcemap: process.env.NODE_ENV === 'development',
        // minify는 프로덕션에서 esbuild 사용 (더 빠름)
        minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
        // esbuild minify 옵션
        esbuildOptions: {
            drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
            target: 'es2020'
        },
        /*
          (제거됨) modulePreload.resolveDependencies — WordPress 청크 제외 필터
          WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1
    
          필터 대상이던 `wp-*` · `@wordpress` chunk 는 대응 manualChunks 분기가
          은퇴하면서 더 이상 생성되지 않는다(빌드 산출물 실측 0건).
          필터를 제거해도 preload 대상 집합이 동일하다.
        */
        rollupOptions: {
            ...sharedViteConfig.build?.rollupOptions,
            // External dependencies that should not be bundled
            external: (id) => {
                // Exclude invalid zod import path
                if (id === 'zod/v4/core') {
                    return true;
                }
                // Exclude backend/Node.js modules that forum-core imports
                if (id === 'express' || id === 'typeorm') {
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
                    const output = sharedViteConfig.build?.rollupOptions?.output;
                    const sharedChunk = typeof output?.manualChunks === 'function' ? output.manualChunks(id) : undefined;
                    if (sharedChunk)
                        return sharedChunk;
                    /*
                      (제거됨) `wp-all` manualChunks 분기 — WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1
                      해당 패키지가 설치돼 있지 않아 한 번도 매칭된 적이 없다
                      (빌드 산출물에 `wp-*` chunk 0건).
                    */
                    // 나머지 node_modules
                    if (id.includes('node_modules')) {
                        if (id.includes('socket.io')) {
                            return 'vendor-socket';
                        }
                    }
                    // 블록 청크는 제거 - 너무 크고 React 의존성 문제 발생
                    // 대신 메인 번들에 포함되도록 함
                    // (제거됨) 페이지 청크 — legacy editor 전용 분기
                    //   WO-O4O-POST-LEGACY-EDITOR-API-BUILD-AND-ORPHAN-RESIDUE-CLEANUP-V1
                    //   주석 처리돼 있던 `page-template-editor`(TemplatePartEditor) 분기와
                    //   살아 있던 `page-gutenberg`(GutenbergEditor · WordPressBlockEditor) 분기를
                    //   함께 제거했다. 세 파일 모두 legacy editor 은퇴로 저장소에 존재하지 않아
                    //   은퇴 직후 빌드에서도 매칭된 chunk 는 0 이었다.
                }
            }
        }
    }
}));
