import { defineConfig, mergeConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { sharedViteConfig } from '../../vite.config.shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(mergeConfig(sharedViteConfig, {
  base: '/signage/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@o4o/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@o4o/types': path.resolve(__dirname, '../../packages/types/src'),
      '@o4o/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@o4o/auth-context': path.resolve(__dirname, '../../packages/auth-context/src'),
    },
  },
  server: {
    port: 3005,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
}));