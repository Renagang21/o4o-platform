/**
 * Auth Runtime E2E — Fresh Login
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1: 시나리오 A
 *
 * 로그인 성공 시:
 * - /login 이탈 (dashboard/admin/operator로 이동)
 * - /auth/me 중복 호출 없음 (최대 1회)
 * - loading freeze 없음
 * - user state 정상 (nav/profile 표시)
 *
 * 환경변수 필요 (서비스별 분리 — helpers/auth.helpers.ts 상단 계약 참조):
 *   E2E_{KPA|KCOS|NETURE|GLYCO}_ADMIN_EMAIL / _PASSWORD
 *   (docs/local/TEST-ACCOUNTS.local.md 참조)
 */

import { test, expect } from '@playwright/test';
import {
  ALL_SERVICES,
  getServiceCredentials,
  expectAuthenticated,
  loginAs,
  trackAuthMeRequests,
  clearAuthTokens,
  waitForLoadingComplete,
} from './helpers/auth.helpers';

for (const svc of ALL_SERVICES) {
  test.describe(`[${svc.name}] Fresh Login`, () => {
    test.beforeEach(async ({ page }) => {
      // 토큰 초기화
      await page.goto(svc.baseUrl, { waitUntil: 'domcontentloaded' });
      await clearAuthTokens(page);
    });

    test('로그인 성공 → 인증 토큰 저장 (또는 /login 이탈)', async ({ page }) => {
      const { email, password } = getServiceCredentials(svc);
      const ok = await loginAs(page, svc.baseUrl, svc.loginPath, email, password);

      expect(ok, `[${svc.name}] 로그인 폼 입력 실패`).toBe(true);

      const url = page.url();
      // K-Cosmetics는 lazy session 전략 — 로그인 후 자동 redirect 없음.
      // 따라서 redirect 여부가 아니라 **토큰 저장**을 로그인 성공의 증거로 삼는다.
      //
      // 이전 판정은 `!url.includes('/login') || tokenStored` 였다. OR 이라서
      // "토큰은 없지만 URL 만 바뀐" 상태도 통과할 수 있었다. 토큰을 필수로 바꾼다.
      const tokenStored = await page.evaluate(() => !!localStorage.getItem('o4o_accessToken'));

      expect(
        tokenStored,
        `[${svc.name}] 로그인 후 accessToken 미저장 — 로그인 실패 (url=${url})`,
      ).toBe(true);
    });

    test('로그인 후 /auth/me 중복 호출 없음', async ({ page }) => {
      const { email, password } = getServiceCredentials(svc);
      const tracker = trackAuthMeRequests(page);

      await loginAs(page, svc.baseUrl, svc.loginPath, email, password);

      // 안정화 대기
      await page.waitForTimeout(2000);

      const count = tracker.count();
      // 로그인 응답이 user를 포함하므로 /auth/me는 0회 또는 최대 1회
      expect(
        count,
        `[${svc.name}] 로그인 직후 /auth/me ${count}회 — 중복 호출 의심`,
      ).toBeLessThanOrEqual(1);
    });

    test('로그인 후 loading freeze 없음', async ({ page }) => {
      const { email, password } = getServiceCredentials(svc);
      await loginAs(page, svc.baseUrl, svc.loginPath, email, password);

      await waitForLoadingComplete(page, 6000);

      const spinnerVisible = await page
        .locator('[class*="animate-spin"], [class*="spinner"]')
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);

      expect(spinnerVisible, `[${svc.name}] 로그인 후 6초째 스피너 표시 — loading freeze`).toBe(false);
    });

    /**
     * WO-O4O-KPA-AUTH-RUNTIME-E2E-LOGIN-REGRESSION-ROOT-CAUSE-AND-CI-CLOSURE-V1
     *
     * 이전 판정은 `expect(url).not.toMatch(/\/login/)` 하나였고, 실측 결과
     * 4개 중 3개 서비스에서 **로그아웃 상태로도 통과**했다. URL 문자열이 아니라
     * 인증 상태(토큰 · /auth/me · authenticated UI · 거부 화면 부재)로 판정한다.
     */
    test('로그인 후 dashboard 접근 가능 (인증 상태로 판정)', async ({ page }) => {
      const { email, password } = getServiceCredentials(svc);
      await loginAs(page, svc.baseUrl, svc.loginPath, email, password);

      // protected route 접근
      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await waitForLoadingComplete(page, 8000);
      await page.waitForTimeout(1000);

      await expectAuthenticated(page, svc, `로그인 후 ${svc.protectedPath} 접근`);
    });
  });
}
