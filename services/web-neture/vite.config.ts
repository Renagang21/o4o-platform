import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// WO-O4O-COLLABORATOR-LOCAL-DEV-SAFETY-AND-SETUP-ALIGNMENT-V1:
// dev server 에서 API URL 이 없으면 로컬 API 를 주입한다. src/lib/apiBaseUrl.ts 뿐 아니라
// 공통 package(content-editor · o4o-ai-components)의 운영 URL fallback 까지 막기 위해 env 단계에서 채운다.
// production build(`vite build`)는 건드리지 않는다 — 배포 빌드는 Dockerfile ARG 로 명시 주입.
const LOCAL_DEV_API_BASE_URL = 'http://localhost:3002';

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    const env = loadEnv(mode, __dirname, 'VITE_');
    if (!env.VITE_API_BASE_URL) {
      process.env.VITE_API_BASE_URL = env.VITE_API_URL || LOCAL_DEV_API_BASE_URL;
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Map forum-core to dist (build fix)
        '@o4o/forum-core': path.resolve(__dirname, '../../packages/forum-core/dist'),
      },
      // WO-NETURE-OPERATOR-ROUTER-DEDUPE-FIX-V1:
      // @o4o/ui (devDeps react-router-dom v6) vs web-neture (v7) 중복 인스턴스 방지
      // 모든 import를 consumer 앱 기준 단일 인스턴스로 resolve
      dedupe: ['react', 'react-dom', 'react-router-dom'],
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        external: [
          // Server-only modules that should not be bundled
          'express',
          'typeorm',
          'pg',
          'mysql',
          'sqlite3',
        ],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // React core
              if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
                return 'vendor-react';
              }
              // TipTap editor (heavy)
              if (id.includes('@tiptap') || id.includes('prosemirror')) {
                return 'vendor-tiptap';
              }
              // UI libraries
              if (id.includes('lucide-react')) {
                return 'vendor-ui';
              }
            }
          },
        },
      },
    },
  };
});
