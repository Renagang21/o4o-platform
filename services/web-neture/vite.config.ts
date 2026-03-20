import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
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
});
