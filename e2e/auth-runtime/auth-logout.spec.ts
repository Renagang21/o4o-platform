/**
 * Auth Runtime E2E — Logout
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1: 시나리오 C
 *
 * 로그아웃 성공 시:
 * - user state 클리어
 * - protected route 차단
 * - stale auth 없음
 *
 * 환경변수 필요 (서비스별 분리):
 *   E2E_{KPA|KCOS|NETURE|GLYCO}_ADMIN_EMAIL / _PASSWORD
 *
 * WO-O4O-KPA-AUTH-RUNTIME-E2E-LOGIN-REGRESSION-ROOT-CAUSE-AND-CI-CLOSURE-V1
 * 로그인 실패 시 skip 하지 않는다. logout 검증은 **로그인 성공을 선행 단언**한 뒤에만
 * 의미가 있으므로, 공통 setup(`loginAndAssertAuthenticated`)에서 강제한다.
 */

import { test, expect } from '@playwright/test';
import {
  ALL_SERVICES,
  loginAndAssertAuthenticated,
  clearAuthTokens,
  logoutViaApi,
  clickLogoutViaUI,
} from './helpers/auth.helpers';

for (const svc of ALL_SERVICES) {
  test.describe(`[${svc.name}] Logout`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(svc.baseUrl, { waitUntil: 'domcontentloaded' });
      await clearAuthTokens(page);
    });

    test('로그아웃 → SPA 내 user state 클리어 (React 상태 검증)', async ({ page }) => {
      /**
       * 서비스는 HTTP-only 쿠키 세션 병행 — localStorage 클리어만으로는
       * 서버 세션이 남아 full reload 후 인증이 복원될 수 있음 (정상 보안 동작).
       * 이 테스트는 SPA 내에서 로그아웃 호출이 React user state를
       * null로 처리하는지 확인한다 (full reload 없이).
       */
      // 선행 조건: 로그인 성공 + 보호 화면에서 실제 인증 상태 (실패 시 여기서 중단)
      await loginAndAssertAuthenticated(page, svc);

      // UI 로그아웃 시도 — 드롭다운 트리거 → 로그아웃 버튼 클릭 2단계
      const { success: loggedOut, method } = await clickLogoutViaUI(page);
      console.log(`[${svc.name}] UI logout: success=${loggedOut}, method=${method}`);

      if (loggedOut) {
        // SPA 내 로그아웃 → React가 setUser(null) → RoleGuard redirect
        await page.waitForTimeout(2000);
        const urlAfter = page.url();
        // 로그아웃 후 /login 또는 홈으로 이동했어야 함
        const redirectedOut =
          urlAfter.includes('/login') ||
          urlAfter === svc.baseUrl + '/' ||
          urlAfter === svc.baseUrl;
        expect(redirectedOut, `[${svc.name}] 로그아웃 후 SPA redirect 없음: ${urlAfter}`).toBe(true);
      } else {
        // 인증 상태는 이미 선행 단언으로 확인했다. 따라서 트리거 미발견은
        // "로그인이 안 됐을 수도 있다" 가 아니라 **로그아웃 UI 결함**이다.
        // 이전 구현은 여기서 토큰 존재만 확인하고 통과시켜 결함을 숨겼다.
        expect(
          loggedOut,
          `[${svc.name}] 인증 상태인데 UI 로그아웃 경로 없음 (method: ${method})`,
        ).toBe(true);
      }
    });

    test('로그아웃 후 localStorage 토큰 삭제', async ({ page }) => {
      // 선행 조건: 로그인 성공 + 보호 화면에서 실제 인증 상태 (실패 시 여기서 중단)
      await loginAndAssertAuthenticated(page, svc);

      const { success: loggedOut, method } = await clickLogoutViaUI(page);
      console.log(`[${svc.name}] UI logout: success=${loggedOut}, method=${method}`);
      if (!loggedOut) {
        // UI logout 실패 시 API 직접 호출로 fallback (토큰 클리어 보장)
        await logoutViaApi(page, svc.baseUrl);
      }

      await page.waitForTimeout(1500);

      // 로그아웃 후 토큰 삭제 확인
      const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('o4o_accessToken'));
      expect(tokenAfterLogout, `[${svc.name}] 로그아웃 후 accessToken 여전히 존재`).toBeFalsy();
    });
  });
}
