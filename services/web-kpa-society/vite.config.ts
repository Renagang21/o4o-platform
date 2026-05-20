import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@o4o/account-ui': path.resolve(__dirname, '../../packages/account-ui/src'),
      '@o4o/lms-client': path.resolve(__dirname, '../../packages/lms-client/src'),
    },
    // react-router-dom v6(앱) vs v7(root) 중복 인스턴스 방지
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-o4o': ['@o4o/ui', '@o4o/auth-utils', '@o4o/types'],
          'vendor-common': ['lucide-react', '@tanstack/react-query', 'axios'],
        },
      },
    },
  },
});
