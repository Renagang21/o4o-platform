import { defineConfig, mergeConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { sharedViteConfig } from '../../vite.config.shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(mergeConfig(sharedViteConfig, {
  base: '/funding/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@o4o/types': path.resolve(__dirname, '../../packages/types/src'),
      '@o4o/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@o4o/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@o4o/auth-client': path.resolve(__dirname, '../../packages/auth-client/src'),
      '@o4o/auth-context': path.resolve(__dirname, '../../packages/auth-context/src'),
      '@o4o/crowdfunding-types': path.resolve(__dirname, '../../packages/crowdfunding-types/src'),
    },
  },
  server: {
    port: 3003,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined, // 기본 청킹 사용 (vendor 분리 비활성화)
      },
    },
  },
}));