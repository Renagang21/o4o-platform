/** Credential-free PC/mobile surface and denial checks for maintained origins.
 * Real OAuth and ordinary account state validation are separate evidence.
 * Run manually: pnpm exec playwright test --config=e2e/auth-runtime/playwright.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  expect: { timeout: 20_000 },
  testMatch: '*.spec.ts',
  fullyParallel: false,  // auth state 공유, 순차 실행
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    // HTML 리포트는 test artifacts 출력 폴더(test-results) 밖에 둔다.
    // 안쪽에 두면 리포트 생성 시 폴더를 비우면서 trace/screenshot 이 사라진다 (Playwright Configuration Error).
    ['html', { outputFolder: '../../playwright-report/auth-runtime', open: 'never' }],
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
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  timeout: 45_000,
});
