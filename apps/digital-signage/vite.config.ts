import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'recharts', 'clsx', 'tailwind-merge'],
          'query-vendor': ['@tanstack/react-query', 'axios'],
        },
      },
    },
  },
});