/**
 * Auth Runtime E2E — Playwright config
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1
 *
 * 대상: 4개 배포 서비스의 공통 auth runtime regression 검증
 * 실행: npx playwright test --config=e2e/auth-runtime/playwright.config.ts
 *
 * 자격증명: 없음 — Google-only 재정의(WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1)로 서비스별 관리자 email/password
 * 환경변수 계약은 은퇴했고, 그 GitHub repository secret 6개도 2026-10-02 삭제됐다
 * (WO-O4O-PRODUCTION-SECRET-ENVIRONMENT-MIGRATION-AND-COLLABORATOR-SAFETY-CLOSURE-V1). 남은 환경변수는 E2E_API_BASE_URL(선택) 뿐.
 * 이유는 helpers/auth.helpers.ts 상단 주석 참조. (변수 이름을 여기 적지 않는다 — e2e-auth-runtime.yml 의 재도입 차단 grep 대상)
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
