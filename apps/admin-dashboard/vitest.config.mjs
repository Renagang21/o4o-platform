import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/e2e/**',
      '**/*.spec.ts'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Match the production Vite alias for browser-safe source utility imports.
      '@o4o/forum-core': path.resolve(__dirname, '../../packages/forum-core'),
    }
  }
});
