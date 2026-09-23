/**
 * Auth Runtime E2E — Google-only 로그인 surface 계약
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 이 스위트의 기준을 password 로그인에서
 * **Google Identity** 로 재정의한다.
 *
 * 왜 "로그인 후" 시나리오가 없는가
 * --------------------------------
 * 로그인 수단이 Google 하나가 되면서 CI 가 보관할 수 있는 자격증명이 사라졌다.
 * Google 계정 자동 로그인은 (a) 새 테스트 계정을 만들지 않는다는 WO 제약,
 * (b) Google 의 자동화 차단 때문에 CI 에서 재현 불가다. 토큰을 주입해 "로그인한 척" 하는 검증은
 * 로그인 회귀를 증명하지 못하므로 쓰지 않는다.
 * → 세션 이후 런타임(refresh · logout · token-cleared · 세션 복원)은 **통제된 배포 창의
 *   사용자 브라우저 smoke** 로 옮겼고, CI 는 **자격증명 없이 증명 가능한 계약**만 고정한다.
 *
 * 고정하는 것
 * -----------
 *  S1 로그인 화면에 Google 진입이 렌더된다(`data-testid=google-continue-button` 또는 GIS iframe).
 *  S2 로그인 화면에 password 입력이 **없다**. "비밀번호 찾기" 진입도 없다.
 *  S3 `GET /auth/google/config` 가 `enabled=true` + 공개 clientId 를 준다(값은 단정하지 않는다).
 *  S4 미인증 상태에서 화면이 무한 스피너로 멈추지 않는다.
 */
import { test, expect } from '@playwright/test';
import {
  ALL_SERVICES,
  clearAuthTokens,
  waitForLoadingComplete,
  isFullPageSpinnerVisible,
} from './helpers/auth.helpers';

/** API origin — 서비스 config 와 같은 값을 쓰되 env override 를 허용한다. */
const API_BASE_URL = process.env.E2E_API_BASE_URL || 'https://api.neture.co.kr';

const PASSWORD_INPUT_SELECTORS = [
  'input[type="password"]',
  'input[name="password"]',
  'input#password',
];

const FORGOT_PASSWORD_SELECTORS = [
  'a[href*="forgot-password"]',
  'a[href*="reset-password"]',
  'text=비밀번호 찾기',
];

for (const svc of ALL_SERVICES) {
  test.describe(`[${svc.name}] Google-only 로그인 surface`, () => {
    test.beforeEach(async ({ page }) => {
      // 토큰 없는 상태 보장 — 서비스 홈에 먼저 접속해 storage 초기화(unauthorized spec 과 같은 패턴)
      await page.goto(svc.baseUrl, { waitUntil: 'domcontentloaded' });
      await clearAuthTokens(page);
    });

    test('S1·S2 Google 진입은 있고 password 입력·비밀번호 찾기는 없다', async ({ page }) => {
      await page.goto(`${svc.baseUrl}${svc.loginPath}`, { waitUntil: 'domcontentloaded' });
      await waitForLoadingComplete(page);

      // S1 — 공통 <GoogleContinue /> 컨테이너 또는 GIS 가 심는 iframe/버튼
      const googleEntry = page.locator(
        '[data-testid="google-continue-button"], [data-testid="google-continue-disabled"], iframe[src*="accounts.google.com"], div[aria-labelledby*="button-label"]',
      );
      await expect(googleEntry.first()).toBeAttached({ timeout: 15_000 });

      // S2 — password 입력 0
      for (const selector of PASSWORD_INPUT_SELECTORS) {
        expect(await page.locator(selector).count(), `password 입력이 남아 있다: ${selector}`).toBe(0);
      }
      for (const selector of FORGOT_PASSWORD_SELECTORS) {
        expect(await page.locator(selector).count(), `비밀번호 찾기 진입이 남아 있다: ${selector}`).toBe(0);
      }
    });

    test('S4 미인증 화면이 무한 스피너로 멈추지 않는다', async ({ page }) => {
      await page.goto(`${svc.baseUrl}${svc.loginPath}`, { waitUntil: 'domcontentloaded' });
      await waitForLoadingComplete(page);
      expect(await isFullPageSpinnerVisible(page)).toBe(false);
    });
  });
}

test.describe('Google Identity 서버 계약', () => {
  test('S3 /auth/google/config 가 enabled=true + 공개 clientId 를 준다', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/v1/auth/google/config`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.success).toBe(true);
    expect(body?.data?.enabled).toBe(true);
    // 값 자체는 단정하지 않는다(환경별 Client ID) — 존재와 형태만 본다.
    expect(typeof body?.data?.clientId).toBe('string');
    expect(String(body?.data?.clientId).length).toBeGreaterThan(10);
  });
});
