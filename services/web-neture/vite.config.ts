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
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
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
