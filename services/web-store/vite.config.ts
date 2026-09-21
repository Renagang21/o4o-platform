import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@o4o/account-ui': path.resolve(__dirname, '../../packages/account-ui/src'),
      '@o4o/lms-client': path.resolve(__dirname, '../../packages/lms-client/src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: { port: 4210 },
});
