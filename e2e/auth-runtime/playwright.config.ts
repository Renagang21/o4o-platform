/**
 * Auth Runtime E2E — Playwright config
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1
 *
 * 대상: 4개 배포 서비스의 공통 auth runtime regression 검증
 * 실행: npx playwright test --config=e2e/auth-runtime/playwright.config.ts
 *
 * 자격증명: docs/local/TEST-ACCOUNTS.local.md 참조
 * 환경변수 설정:
 *   E2E_ADMIN_EMAIL=...
 *   E2E_ADMIN_PASSWORD=...
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,  // auth state 공유, 순차 실행
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../../test-results/auth-runtime', open: 'never' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 45_000,
});
