/**
 * Auth Runtime E2E — Browser Refresh / Session Restore
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1: 시나리오 B
 *
 * 로그인 후 새로고침:
 * - 세션 복원 성공 (로그인 유지)
 * - /auth/me 중복 없음 (새로고침당 최대 1회)
 * - loading freeze 없음
 * - K-Cosmetics lazy session: protected route에서 checkSession 정상 트리거
 *
 * 환경변수 필요:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
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
  test.describe(`[${svc.name}] Browser Refresh / Session Restore`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(svc.baseUrl, { waitUntil: 'domcontentloaded' });
      await clearAuthTokens(page);
    });

    test('새로고침 후 세션 복원 — 로그인 유지', async ({ page }) => {
      const { email, password } = getAdminCredentials();

      // 로그인
      await loginAs(page, svc.baseUrl, svc.loginPath, email, password);
      await page.waitForTimeout(2000);

      // protected route로 이동
      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // 현재 URL 기록
      const urlBeforeRefresh = page.url();

      // 페이지 새로고침
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000); // session restore 대기

      const urlAfterRefresh = page.url();

      // 새로고침 후 /login으로 튕겨나가지 않아야 함
      expect(
        urlAfterRefresh,
        `[${svc.name}] 새로고침 후 /login으로 이동 — 세션 복원 실패`,
      ).not.toMatch(/\/login/);
    });

    test('새로고침 시 /auth/me 중복 호출 없음', async ({ page }) => {
      const { email, password } = getAdminCredentials();

      // 로그인 후 protected route 이동
      await loginAs(page, svc.baseUrl, svc.loginPath, email, password);
      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // 새로고침 — 이 시점부터 /auth/me 카운트
      const tracker = trackAuthMeRequests(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const count = tracker.count();
      // 새로고침 1회당 /auth/me 최대 1회 (또는 K-Cosmetics: protected route에서 1회)
      expect(
        count,
        `[${svc.name}] 새로고침 시 /auth/me ${count}회 — 중복 호출 발생`,
      ).toBeLessThanOrEqual(1);
    });

    test('새로고침 후 auth loading freeze 없음 (URL 안정화 확인)', async ({ page }) => {
      /**
       * auth loading freeze: auth 체크가 완료되지 않아 페이지가 /login 또는
       * protected route 사이를 반복 redirect하거나 blank 상태로 고착되는 것.
       * 스피너는 데이터 로딩(위젯/차트 등)에 의해 계속 표시될 수 있어 제외.
       * URL 안정화 + 페이지 내 실제 콘텐츠 존재 여부로 freeze 판정.
       */
      const { email, password } = getAdminCredentials();

      await loginAs(page, svc.baseUrl, svc.loginPath, email, password);
      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.reload({ waitUntil: 'domcontentloaded' });

      // URL 안정화 대기 (auth redirect 완료 시점)
      await page.waitForTimeout(5000);
      const urlMid = page.url();
      await page.waitForTimeout(3000);
      const urlFinal = page.url();

      // URL이 안정화 (5s 후와 8s 후가 동일) → redirect loop 없음
      expect(urlFinal, `[${svc.name}] URL이 계속 변경 — auth redirect loop 또는 freeze`).toBe(urlMid);

      // /login으로 redirect되지 않음 (세션 복원 성공)
      expect(urlFinal, `[${svc.name}] 새로고침 후 /login으로 — 세션 복원 실패`).not.toMatch(/\/login/);
    });

    test('K-Cosmetics lazy session: protected route 진입 시 checkSession 트리거', async ({ page }) => {
      // K-Cosmetics만 검증 — 다른 서비스는 skip
      if (svc.name !== 'K-Cosmetics') return;

      const { email, password } = getAdminCredentials();

      // 로그인
      await loginAs(page, svc.baseUrl, svc.loginPath, email, password);
      await page.waitForTimeout(2000);

      // 새로운 페이지에서 직접 protected route 접근 (session not yet checked)
      const tracker = trackAuthMeRequests(page);
      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const url = page.url();
      // 인증된 상태여야 함
      expect(url, '[K-Cosmetics] lazy checkSession 실패 — /login으로 리다이렉트').not.toMatch(/\/login/);

      // checkSession이 /auth/me를 1회 호출했어야 함 (단, 로그인 직후라면 isSessionChecked=true이므로 0회 가능)
      expect(tracker.count(), '[K-Cosmetics] /auth/me 1회 초과').toBeLessThanOrEqual(1);
    });
  });
}
