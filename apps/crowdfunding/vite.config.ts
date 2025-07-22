import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
    outDir: 'dist',
    sourcemap: true,
  },
});