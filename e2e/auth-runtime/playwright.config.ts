/**
 * Auth Runtime E2E — Playwright config
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1
 *
 * 대상: 4개 배포 서비스의 공통 auth runtime regression 검증
 * 실행: npx playwright test --config=e2e/auth-runtime/playwright.config.ts
 *
 * 자격증명: docs/local/TEST-ACCOUNTS.local.md 참조
 * 환경변수 설정 — **서비스별 분리** (공용 E2E_ADMIN_* 는 폐기):
 *   E2E_KPA_ADMIN_EMAIL    / E2E_KPA_ADMIN_PASSWORD
 *   E2E_KCOS_ADMIN_EMAIL   / E2E_KCOS_ADMIN_PASSWORD
 *   E2E_NETURE_ADMIN_EMAIL / E2E_NETURE_ADMIN_PASSWORD
 *   E2E_GLYCO_ADMIN_EMAIL  / E2E_GLYCO_ADMIN_PASSWORD
 * 이유는 helpers/auth.helpers.ts 상단 credential 계약 주석 참조.
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
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 45_000,
});
