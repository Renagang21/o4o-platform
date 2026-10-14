/** 사용자 승인과 공유 runtime 직렬화 확인 후 로컬에서만 실행하는 운영 세션 검사. */
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// 기본 workflow/CI에 세션 생성·폐기를 유입하지 않는다. 승인 flag는 자동 설정하지 않는다.
if (process.env.CI || process.env.E2E_APPROVED_AUTH_LIVE_SMOKE !== '1') {
  throw new Error('승인된 운영 smoke 창에서만 E2E_APPROVED_AUTH_LIVE_SMOKE=1로 실행하세요. CI 실행은 금지됩니다.');
}
export default defineConfig({
  ...baseConfig,
  testMatch: 'admin-route-retirement.live-smoke.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
});
