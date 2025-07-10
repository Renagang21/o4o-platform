/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Exclude E2E test files to prevent conflicts with Playwright
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/*.{playwright,e2e}.{js,ts}',
      '**/e2e/**',           // E2E 폴더 전체 제외
      '**/*.spec.ts',        // .spec.ts 파일 제외 (Playwright용)
      '**/*.e2e.{js,ts}'     // .e2e.js/ts 파일 제외
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.config.js',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@o4o/ui': path.resolve(__dirname, '../../packages/ui'),
      '@o4o/lib': path.resolve(__dirname, '../../packages/lib'),
      '@o4o/types': path.resolve(__dirname, '../../packages/types'),
    },
  },
})