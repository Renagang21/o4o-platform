import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
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
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@tanstack/react-query', 'zustand', 'react-hook-form'],
          'utils-vendor': ['axios', 'date-fns', 'clsx'],
          'editor-vendor': ['marked', 'dompurify'],
        },
      },
    },
  },
});