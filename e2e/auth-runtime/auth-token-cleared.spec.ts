/**
 * Auth Runtime E2E — Token Cleared Event
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1: 시나리오 D
 *
 * auth:token-cleared 이벤트 발생 시:
 * - user state null 처리
 * - stale auth UI 제거
 * - 이후 protected route 접근 차단
 *
 * 환경변수 필요 (서비스별 분리):
 *   E2E_{KPA|KCOS|NETURE|GLYCO}_ADMIN_EMAIL / _PASSWORD
 *
 * WO-O4O-KPA-AUTH-RUNTIME-E2E-LOGIN-REGRESSION-ROOT-CAUSE-AND-CI-CLOSURE-V1
 * 로그인 실패를 skip 으로 흡수하지 않는다 (연쇄 오탐 차단).
 */

import { test, expect } from '@playwright/test';
import {
  ALL_SERVICES,
  loginAndAssertAuthenticated,
  dispatchTokenClearedEvent,
  clearAuthTokens,
} from './helpers/auth.helpers';

for (const svc of ALL_SERVICES) {
  test.describe(`[${svc.name}] Token Cleared Event`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(svc.baseUrl, { waitUntil: 'domcontentloaded' });
      await clearAuthTokens(page);
    });

    test('auth:token-cleared 이벤트 → SPA 내 user state 클리어 (React 상태 검증)', async ({ page }) => {
      /**
       * auth:token-cleared 이벤트 발행 시:
       * - React state: setUser(null) 호출
       * - RoleGuard: isAuthenticated=false → <Navigate to="/login" /> (SPA redirect)
       * - 결과: URL이 /login으로 변경 (full page reload 없이)
       *
       * 서비스의 HTTP-only 쿠키 세션이 있어도 SPA 레벨에서는
       * user state가 null이므로 즉시 /login redirect 발생해야 한다.
       */
      // 선행 조건: 로그인 성공 + 보호 화면에서 실제 인증 상태.
      // (loginAndAssertAuthenticated 는 protected route 이동 후 auth 로딩 완료까지 대기한다 —
      //  K-Cosmetics checkSession() 완료 보장이 이벤트 발행 전 필요하다.)
      // 이전 구현은 로그인 실패·dashboard 접근 실패를 skip 으로 흡수해 결함을 숨겼다.
      await loginAndAssertAuthenticated(page, svc);

      // auth:token-cleared 이벤트 발행 (토큰 클리어 + 이벤트 dispatch)
      await dispatchTokenClearedEvent(page);

      // React state 업데이트 + SPA redirect 대기
      // /login redirect를 active하게 대기 (고정 timeout 대신 event-driven).
      // KPA AdminAuthGuard는 URL 유지 + access-denied 카드 → waitForURL timeout (catch) 후 card assertion.
      await page.waitForURL(/\/login/, { timeout: 7000 }).catch(() => {});

      const urlAfter = page.url();
      // SPA 레벨에서 RoleGuard가 /login으로 redirect해야 함
      // KPA AdminAuthGuard: URL 유지 + access-denied 카드 (로그인하기 버튼)
      const hasAccessDenied = await page
        .locator('button:has-text("로그인하기"), :has-text("접근 권한이 없습니다")')
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      const hasLoginForm = await page
        .locator('input[type="email"]')
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);

      const isBlocked =
        urlAfter.includes('/login') ||
        urlAfter === svc.baseUrl + '/' ||
        urlAfter === svc.baseUrl ||
        hasAccessDenied ||
        hasLoginForm;

      expect(
        isBlocked,
        `[${svc.name}] token-cleared 후 SPA redirect 없음: ${urlAfter} (accessDenied: ${hasAccessDenied})`,
      ).toBe(true);
    });

    test('auth:token-cleared 이벤트 → stale loading freeze 없음', async ({ page }) => {
      // 선행 조건: 로그인 성공 + 보호 화면에서 실제 인증 상태
      await loginAndAssertAuthenticated(page, svc);

      // 이벤트 발행 후 UI 동결 없는지 확인
      await dispatchTokenClearedEvent(page);
      await page.waitForTimeout(3000);

      // 스피너가 고착되면 freeze
      const spinnerVisible = await page
        .locator('[class*="animate-spin"], [class*="spinner"]')
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);

      expect(spinnerVisible, `[${svc.name}] token-cleared 후 3초째 스피너 — loading freeze`).toBe(false);
    });
  });
}
