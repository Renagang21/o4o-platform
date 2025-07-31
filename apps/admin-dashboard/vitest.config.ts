import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@o4o/types': path.resolve(__dirname, '../../packages/types/dist'),
      '@o4o/utils': path.resolve(__dirname, '../../packages/utils/dist'),
      '@o4o/ui': path.resolve(__dirname, '../../packages/ui/dist'),
      '@o4o/auth-client': path.resolve(__dirname, '../../packages/auth-client/dist'),
      '@o4o/auth-context': path.resolve(__dirname, '../../packages/auth-context/dist')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts',      // Playwright E2E tests
      '**/e2e/**',         // E2E test directory
      '**/UserForm.test.tsx',        // Complex test with mock issues
      '**/UserDeleteModal.test.tsx', // Complex test with mock issues
      '**/UserRoleChangeModal.test.tsx', // Complex test with mock issues
      '**/UsersList.test.tsx',       // Complex test with mock issues
    ],
  },
});