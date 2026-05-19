/**
 * Auth Runtime E2E — Unauthorized Access
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1: 시나리오 E
 *
 * 비로그인 상태에서 protected route 접근 시:
 * - /login 으로 리다이렉트
 * - 무한 redirect 루프 없음
 * - loading freeze 없음
 *
 * 자격증명 불필요.
 */

import { test, expect } from '@playwright/test';
import {
  ALL_SERVICES,
  trackAuthMeRequests,
  clearAuthTokens,
  waitForLoadingComplete,
} from './helpers/auth.helpers';

for (const svc of ALL_SERVICES) {
  test.describe(`[${svc.name}] Unauthorized Access`, () => {
    test.beforeEach(async ({ page }) => {
      // 토큰 없는 상태 보장 — 서비스 홈에 먼저 접속해 storage 초기화
      await page.goto(svc.baseUrl, { waitUntil: 'domcontentloaded' });
      await clearAuthTokens(page);
    });

    test('protected route → 차단 (redirect 또는 login modal)', async ({ page }) => {
      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000); // 리다이렉트 완료 대기

      const url = page.url();

      // KPA AdminAuthGuard: URL 유지, access-denied 카드 표시 (로그인하기 버튼)
      const hasAccessDeniedCard = await page
        .locator('button:has-text("로그인하기"), :has-text("접근 권한이 없습니다")')
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      // 모달 기반 로그인 오버레이
      const hasLoginModal = await page
        .locator('input[type="email"], input[name="email"]')
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);

      const isBlockedCorrectly =
        url.includes('/login') ||
        url === svc.baseUrl + '/' ||
        url === svc.baseUrl ||
        hasLoginModal ||
        hasAccessDeniedCard; // KPA AdminAuthGuard 패턴

      expect(
        isBlockedCorrectly,
        `[${svc.name}] protected route가 차단되지 않음: ${url}`,
      ).toBe(true);
    });

    test('redirect 무한 루프 없음', async ({ page }) => {
      const redirectCount = { value: 0 };
      let lastUrl = '';

      page.on('framenavigated', (frame) => {
        if (frame !== page.mainFrame()) return;
        const u = frame.url();
        if (u === lastUrl) {
          redirectCount.value++;
        }
        lastUrl = u;
      });

      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);

      expect(
        redirectCount.value,
        `[${svc.name}] 동일 URL 반복 리다이렉트 ${redirectCount.value}회 — 루프 의심`,
      ).toBeLessThan(3);
    });

    test('loading freeze 없음 (5초 내 스피너 해소)', async ({ page }) => {
      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await waitForLoadingComplete(page, 5000);

      // 5초 후 스피너가 남아 있으면 freeze
      const spinnerVisible = await page
        .locator('[class*="animate-spin"], [class*="spinner"]')
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);

      expect(spinnerVisible, `[${svc.name}] 5초 후에도 스피너 표시 중 — loading freeze`).toBe(false);
    });

    test('/auth/me 과도 호출 없음 (비로그인 상태)', async ({ page }) => {
      const tracker = trackAuthMeRequests(page);

      await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const count = tracker.count();
      // 비로그인 상태: token guard로 0회가 이상적. 있어도 1회여야 함.
      expect(
        count,
        `[${svc.name}] 비로그인 상태에서 /auth/me ${count}회 호출 — token guard 확인 필요`,
      ).toBeLessThanOrEqual(1);
    });
  });
}
