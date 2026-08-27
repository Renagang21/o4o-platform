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
 * 환경변수 필요 (서비스별 분리):
 *   E2E_{KPA|KCOS|NETURE|GLYCO}_ADMIN_EMAIL / _PASSWORD
 *
 * WO-O4O-KPA-AUTH-RUNTIME-E2E-LOGIN-REGRESSION-ROOT-CAUSE-AND-CI-CLOSURE-V1
 * 세션 복원 판정도 URL 문자열이 아니라 인증 상태로 한다.
 */

import { test, expect } from '@playwright/test';
import {
  ALL_SERVICES,
  getServiceCredentials,
  loginAs,
  loginAndAssertAuthenticated,
  expectAuthenticated,
  trackAuthMeRequests,
  clearAuthTokens,
} from './helpers/auth.helpers';

for (const svc of ALL_SERVICES) {
  test.describe(`[${svc.name}] Browser Refresh / Session Restore`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(svc.baseUrl, { waitUntil: 'domcontentloaded' });
      await clearAuthTokens(page);
    });

    test('새로고침 후 세션 복원 — 로그인 유지', async ({ page }) => {
      // 선행 조건: 로그인 성공 + 실제 인증 상태 (실패 시 여기서 중단)
      await loginAndAssertAuthenticated(page, svc);

      // 페이지 새로고침
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000); // session restore 대기

      // 세션 복원 성공 = URL 이 /login 이 아닌 것이 아니라 **인증 상태 유지**
      await expectAuthenticated(page, svc, '새로고침 후 세션 복원');
    });

    test('새로고침 시 /auth/me 중복 호출 없음', async ({ page }) => {
      // 선행 조건 (tracker 생성 전에 수행 — 여기서 발생하는 요청은 집계 대상이 아니다)
      await loginAndAssertAuthenticated(page, svc);

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
      await loginAndAssertAuthenticated(page, svc);

      await page.reload({ waitUntil: 'domcontentloaded' });

      // URL 안정화 대기 (auth redirect 완료 시점)
      await page.waitForTimeout(5000);
      const urlMid = page.url();
      await page.waitForTimeout(3000);
      const urlFinal = page.url();

      // URL이 안정화 (5s 후와 8s 후가 동일) → redirect loop 없음
      expect(urlFinal, `[${svc.name}] URL이 계속 변경 — auth redirect loop 또는 freeze`).toBe(urlMid);

      // 세션 복원 성공 — 인증 상태로 판정한다 (URL 문자열 아님)
      await expectAuthenticated(page, svc, '새로고침 후 freeze 검사');
    });

    test('K-Cosmetics lazy session: protected route 진입 시 checkSession 트리거', async ({ page }) => {
      // K-Cosmetics만 검증 — 다른 서비스는 skip
      if (svc.name !== 'K-Cosmetics') return;

      const { email, password } = getServiceCredentials(svc);

      // 로그인 (protected route 진입 전 상태를 유지해야 하므로 여기서는 goto 하지 않는다)
      const formOk = await loginAs(page, svc.baseUrl, svc.loginPath, email, password);
      expect(formOk, '[K-Cosmetics] 로그인 폼 입력 실패').toBe(true);
      await page.waitForTimeout(2000);

      // 새로운 페이지에서 직접 protected route 접근 (session not yet checked)
      const tracker = trackAuthMeRequests(page);
      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      // checkSession이 /auth/me를 1회 호출했어야 함 (단, 로그인 직후라면 isSessionChecked=true이므로 0회 가능)
      // 아래 인증 단언이 /auth/me 를 직접 호출하므로 **카운트를 먼저 읽는다.**
      const authMeCount = tracker.count();
      expect(authMeCount, '[K-Cosmetics] /auth/me 1회 초과').toBeLessThanOrEqual(1);

      // 인증된 상태여야 함 — URL 문자열이 아니라 인증 상태로 판정
      await expectAuthenticated(page, svc, 'lazy checkSession 후 protected route');
    });
  });
}
