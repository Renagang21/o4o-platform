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
 * 환경변수 필요:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 *   (docs/local/TEST-ACCOUNTS.local.md 참조)
 */

import { test, expect } from '@playwright/test';
import {
  ALL_SERVICES,
  getAdminCredentials,
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
      const { email, password } = getAdminCredentials();
      const ok = await loginAs(page, svc.baseUrl, svc.loginPath, email, password);

      expect(ok, `[${svc.name}] 로그인 폼 입력 실패`).toBe(true);

      const url = page.url();
      // K-Cosmetics는 lazy session 전략 — 로그인 후 자동 redirect 없음.
      // 대신 토큰이 localStorage에 저장되었는지 확인.
      const tokenStored = await page.evaluate(() => !!localStorage.getItem('o4o_accessToken'));

      const isLoginSuccess = !url.includes('/login') || tokenStored;
      expect(
        isLoginSuccess,
        `[${svc.name}] 로그인 후 /login 잔류 + 토큰 미저장 — 로그인 실패`,
      ).toBe(true);
    });

    test('로그인 후 /auth/me 중복 호출 없음', async ({ page }) => {
      const { email, password } = getAdminCredentials();
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
      const { email, password } = getAdminCredentials();
      await loginAs(page, svc.baseUrl, svc.loginPath, email, password);

      await waitForLoadingComplete(page, 6000);

      const spinnerVisible = await page
        .locator('[class*="animate-spin"], [class*="spinner"]')
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);

      expect(spinnerVisible, `[${svc.name}] 로그인 후 6초째 스피너 표시 — loading freeze`).toBe(false);
    });

    test('로그인 후 dashboard 접근 가능', async ({ page }) => {
      const { email, password } = getAdminCredentials();
      await loginAs(page, svc.baseUrl, svc.loginPath, email, password);

      // protected route 접근
      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const url = page.url();
      // /login으로 다시 튕겨나가지 않아야 함
      expect(url, `[${svc.name}] 로그인 후 dashboard 접근 시 /login 리다이렉트`).not.toMatch(/\/login/);
    });
  });
}
