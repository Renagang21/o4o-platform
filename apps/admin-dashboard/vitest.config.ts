/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Exclude E2E test files to prevent conflicts with Playwright
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/cypress/**',
      '**/*.{playwright,e2e}.{js,ts}',
      '**/e2e/**',           // E2E 폴더 전체 제외
      '**/*.spec.ts',        // .spec.ts 파일 제외 (Playwright용)
      '**/*.e2e.{js,ts}',    // .e2e.js/ts 파일 제외
      '**/test-results/**',  // Playwright 테스트 결과 제외
      '**/playwright-report/**', // Playwright 리포트 제외
      '**/coverage/**',      // Coverage 폴더 제외
      '**/*.config.{js,ts}', // 설정 파일들 제외
      '**/tests/e2e/**'      // 다른 형태의 E2E 테스트 폴더도 제외
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
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