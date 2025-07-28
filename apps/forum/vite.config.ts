import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { sharedViteConfig } from '../../vite.config.shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(fileURLToPath(import.meta.url), '..');

export default defineConfig(mergeConfig(sharedViteConfig, {
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@o4o/types': resolve(__dirname, '../../packages/types/src'),
      '@o4o/utils': resolve(__dirname, '../../packages/utils/src'),
      '@o4o/ui': resolve(__dirname, '../../packages/ui/src'),
      '@o4o/auth-client': resolve(__dirname, '../../packages/auth-client/src'),
      '@o4o/auth-context': resolve(__dirname, '../../packages/auth-context/src'),
      '@o4o/forum-types': resolve(__dirname, '../../packages/forum-types/src'),
    },
  },
  server: {
    port: 3004,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
}));