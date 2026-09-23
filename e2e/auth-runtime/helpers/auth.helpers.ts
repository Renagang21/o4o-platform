/**
 * Auth Runtime E2E — 공통 helpers
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1
 * WO-O4O-KPA-AUTH-RUNTIME-E2E-LOGIN-REGRESSION-ROOT-CAUSE-AND-CI-CLOSURE-V1
 *
 * 자격증명 하드코딩 금지 — 그리고 이제 **CI 가 보관하는 자격증명 자체가 없다.**
 *
 * ── Google-only 재정의 (WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 · 2026-09-23) ──
 * password 로그인 helper(`loginAs` · `getServiceCredentials` · `missingCredentialEnvs` ·
 * `loginAndAssertAuthenticated`)와 `E2E_*_ADMIN_EMAIL/PASSWORD` 계약을 **전부 제거**했다.
 * 로그인 수단이 Google 하나가 되면서:
 *   - CI 에 넣을 password 가 없고(계정에 password 자체가 없다),
 *   - Google 계정 자동 로그인은 새 테스트 계정 금지(WO §2 제외) + Google 의 자동화 차단으로 불가,
 *   - 토큰 주입은 "로그인한 척" 일 뿐 로그인 회귀를 증명하지 못한다.
 * 그래서 이 스위트는 **자격증명 없이 증명 가능한 계약**만 다룬다:
 *   로그인 surface(Google 진입 존재 · password 입력 0) · 은퇴 endpoint 404 ·
 *   Google 경로 생존과 토큰 검증 · 미인증 동작(redirect · spinner freeze 0).
 * 세션 이후 런타임(refresh · logout · token-cleared · 세션 복원)은 **통제된 배포 창의
 * 사용자 브라우저 smoke** 로 이관했다 — CI 가 증명할 수 없는 것을 증명한 척하지 않는다.
 */

import { type Page, expect } from '@playwright/test';

// ─── Service Configs ─────────────────────────────────────────────────────────

export interface ServiceConfig {
  name: string;
  /** 로그인 요청이 실제로 보내는 serviceKey — L2 `service_credentials` 조회 단위 */
  serviceKey: string;
  baseUrl: string;
  loginPath: string;
  /** admin 또는 operator protected route */
  protectedPath: string;
  /** login 성공 후 도달할 경로 prefix */
  dashboardPrefix: string;
  /** 서비스별 E2E 계정 email 환경변수명 */
  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: emailEnv/passwordEnv 는 제거했다.
  //   로그인 수단이 Google 하나가 되어 CI 가 보관할 자격증명이 없다(§CI 재정의).
  /** 서비스 특이사항 */
  note?: string;
}

export const SERVICES: Record<string, ServiceConfig> = {
  neture: {
    name: 'Neture',
    serviceKey: 'neture',
    baseUrl: 'https://www.neture.co.kr',
    loginPath: '/login',
    protectedPath: '/admin',
    dashboardPrefix: '/admin',
  },
  kpa: {
    name: 'KPA-Society',
    serviceKey: 'kpa-society',
    baseUrl: 'https://kpa-society.co.kr',
    loginPath: '/login',
    protectedPath: '/admin',
    dashboardPrefix: '/admin',
  },
  kcosmetics: {
    name: 'K-Cosmetics',
    serviceKey: 'k-cosmetics',
    baseUrl: 'https://k-cosmetics.site',
    loginPath: '/login',
    protectedPath: '/operator',
    dashboardPrefix: '/operator',
    note: 'lazy session — RoleGuard에서 checkSession 트리거',
  },
};

export const ALL_SERVICES = Object.values(SERVICES);

// ─── Credential helpers (env only — no hardcoding) ───────────────────────────

// ─── Network tracking ────────────────────────────────────────────────────────

/**
 * /auth/me GET 요청 횟수 추적 — duplicate fetch 탐지용
 */
export function trackAuthMeRequests(page: Page): { count: () => number; urls: () => string[] } {
  const hits: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'GET' && req.url().includes('/auth/me')) {
      hits.push(req.url());
    }
  });
  return {
    count: () => hits.length,
    urls: () => [...hits],
  };
}

// ─── Login helper ────────────────────────────────────────────────────────────

// ─── State helpers ───────────────────────────────────────────────────────────

/**
 * localStorage에서 auth 토큰 제거 (로그아웃 없이 강제 토큰 클리어)
 *
 * auth-client clearAllTokens()와 동일한 범위로 제거:
 * - 표준 키: o4o_accessToken, o4o_refreshToken
 * - 레거시 키: accessToken, authToken, token, refreshToken
 * - admin-auth-storage (getAccessToken() fallback — 미제거 시 token guard 우회)
 */
export async function clearAuthTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    const keys = [
      'o4o_accessToken', 'o4o_refreshToken',
      'accessToken', 'authToken', 'token', 'refreshToken',
      'admin-auth-storage', 'user',
    ];
    keys.forEach((k) => localStorage.removeItem(k));
  });
}

/**
 * AUTH_TOKEN_CLEARED_EVENT 강제 발행 (token-refresh 실패 시뮬레이션)
 * 실제 auth-client는 이벤트 발행 전에 토큰을 localStorage에서 먼저 제거한다.
 * 이를 재현하기 위해 localStorage 클리어 + 이벤트 발행을 동시에 수행한다.
 *
 * auth-client clearAllTokens()와 동일한 범위로 제거:
 * - 표준 키: o4o_accessToken, o4o_refreshToken
 * - 레거시 키: accessToken, authToken, token, refreshToken
 * - admin-auth-storage (getAccessToken() fallback — 미제거 시 checkSession 토큰 가드 우회)
 */
export async function dispatchTokenClearedEvent(page: Page): Promise<void> {
  await page.evaluate(() => {
    const keys = [
      'o4o_accessToken', 'o4o_refreshToken',
      'accessToken', 'authToken', 'token', 'refreshToken',
      'admin-auth-storage', 'user',
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent('auth:token-cleared'));
  });
}

/**
 * 서비스 로그아웃 — UI 버튼 또는 API 직접 호출.
 * 서버 세션(쿠키)까지 무효화하기 위해 API를 직접 호출한다.
 */
export async function logoutViaApi(page: Page, baseUrl: string): Promise<void> {
  // 서비스 origin 기준 상대 경로로 POST (쿠키 전송을 위해 credentials: 'include')
  await page.evaluate(async (url) => {
    try {
      await fetch(`${url}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // 실패해도 localStorage 클리어는 진행
    }
    localStorage.removeItem('o4o_accessToken');
    localStorage.removeItem('o4o_refreshToken');
  }, baseUrl);
}

// ─── UI Logout helper ────────────────────────────────────────────────────────

/**
 * UI logout — 드롭다운 트리거 클릭 → 로그아웃 버튼 클릭
 *
 * WO-O4O-AUTH-LOGOUT-SELECTOR-STABILIZATION-V1
 *
 * 지원 컴포넌트:
 *   GlobalHeader (@o4o/ui, KPA / K-Cosmetics) — aria-label="사용자 메뉴"
 *   GlobalUserProfileDropdown (@o4o/account-ui, Neture)     — aria-label="계정 메뉴"
 *
 * 실패 시 숨기지 않고 어느 단계에서 실패했는지 console.error로 보고한다.
 */
export async function clickLogoutViaUI(
  page: Page,
): Promise<{ success: boolean; method: string }> {
  // 1) 로그아웃 버튼이 이미 바로 보이는지 확인 (드롭다운이 이미 열린 상태 or 모바일 메뉴)
  const directLogout = page.locator('button:has-text("로그아웃"), a:has-text("로그아웃")').first();
  if (await directLogout.isVisible({ timeout: 1000 }).catch(() => false)) {
    await directLogout.click();
    await page.waitForTimeout(2000);
    return { success: true, method: 'direct-visible' };
  }

  // 2) 드롭다운 트리거 클릭 (서비스별 aria-label 순서로 시도)
  const triggerSelectors = USER_MENU_TRIGGER_SELECTORS;

  let triggeredBy = '';
  for (const sel of triggerSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click();
      triggeredBy = sel;
      break;
    }
  }

  if (!triggeredBy) {
    console.error(
      '[clickLogoutViaUI] FAIL (step 1): 드롭다운 트리거 버튼 미발견.\n' +
      '  원인 후보: 로그인 상태 아님 / 헤더가 아직 로드되지 않음 / aria-label 변경됨\n' +
      `  시도한 셀렉터: ${triggerSelectors.join(', ')}\n` +
      `  현재 URL: ${page.url()}`,
    );
    return { success: false, method: 'no-trigger' };
  }

  // 3) 드롭다운 열림 대기 후 로그아웃 버튼 탐색
  await page.waitForTimeout(600);

  const logoutSelectors = [
    'button:has-text("로그아웃")',
    '[role="menuitem"]:has-text("로그아웃")',
    'a:has-text("로그아웃")',
    '[data-testid="logout"]',
    '[aria-label*="로그아웃"]',
  ];

  for (const sel of logoutSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click();
      await page.waitForTimeout(2000);
      return { success: true, method: `trigger(${triggeredBy}) → ${sel}` };
    }
  }

  console.error(
    `[clickLogoutViaUI] FAIL (step 2): 트리거(${triggeredBy}) 클릭 후 로그아웃 버튼 미발견.\n` +
    '  원인 후보: 드롭다운 미열림 / 버튼 텍스트 변경 / 렌더링 지연\n' +
    `  시도한 셀렉터: ${logoutSelectors.join(', ')}\n` +
    `  현재 URL: ${page.url()}`,
  );
  return { success: false, method: `trigger(${triggeredBy}) → logout-not-found` };
}

// ─── Wait helpers ────────────────────────────────────────────────────────────

/**
 * 로딩 스피너가 사라질 때까지 대기 (loading freeze 탐지용)
 * auth용 전체화면 스피너만 대상 — 콘텐츠 스피너(소형)는 제외
 */
/**
 * full-page auth spinner 셀렉터 — min-h-screen 컨테이너 내부의 스피너만 대상.
 * 소형 콘텐츠 스피너(공지/포럼 위젯 등)는 auth freeze 가 아니므로 제외한다.
 */
const FULL_PAGE_SPINNER_SELECTORS = [
  '.min-h-screen [class*="animate-spin"]',
  '.min-h-screen [class*="spinner"]',
  'div:has(> [class*="animate-spin"]):has(> :only-child)',
];

/** 현재 full-page auth 스피너가 보이는지 */
export async function isFullPageSpinnerVisible(page: Page): Promise<boolean> {
  for (const sel of FULL_PAGE_SPINNER_SELECTORS) {
    if (await page.locator(sel).first().isVisible({ timeout: 200 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

export async function waitForLoadingComplete(page: Page, maxMs = 8000): Promise<void> {
  const deadline = Date.now() + maxMs;

  // SPA 마운트 전(#root 비어 있음)에는 스피너도 없다. 그 상태를 "로딩 완료"로 보면
  // 마운트 직후 뜨는 auth 스피너를 freeze 로 오판하므로 마운트를 먼저 기다린다.
  await page
    .waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, {
      timeout: Math.max(1000, maxMs),
    })
    .catch(() => undefined);

  // 렌더 사이 깜빡임을 완료로 오판하지 않도록 연속 2회 비어 있을 때만 완료 처리
  let clearStreak = 0;
  while (Date.now() < deadline) {
    if (await isFullPageSpinnerVisible(page)) {
      clearStreak = 0;
    } else if (++clearStreak >= 2) {
      return;
    }
    await page.waitForTimeout(300);
  }
  // 타임아웃이 나도 테스트는 계속 — 호출부에서 별도 assertion
}

// ─── Authenticated-state evidence ────────────────────────────────────────────
//
// WO-O4O-KPA-AUTH-RUNTIME-E2E-LOGIN-REGRESSION-ROOT-CAUSE-AND-CI-CLOSURE-V1
//
// "URL 이 /login 이 아니다" 는 로그인 성공의 증거가 아니다. 실측 결과 4개 중 3개
// 서비스가 **로그아웃 상태에서도** 그 조건을 만족했다 (KPA `/admin` 은 redirect 없이
// 인라인 거부 화면을 렌더하고, Neture 는 `/` 로 착지한다).
// 그래서 판정을 **인증 상태 신호**로 바꾼다.

/** 로그인 상태에서만 렌더되는 사용자 메뉴 트리거 (GlobalHeader / GlobalUserProfileDropdown) */
export const USER_MENU_TRIGGER_SELECTORS = [
  'button[aria-label="사용자 메뉴"]',  // GlobalHeader (KPA / K-Cosmetics)
  'button[aria-label="계정 메뉴"]',    // GlobalUserProfileDropdown (Neture)
  'button[aria-label*="사용자"]',
  'button[aria-label*="계정"]',
  'button[aria-haspopup="true"]',
];

/** packages/ui/src/feedback/AccessDenied.tsx 의 ACCESS_DENIED_TITLE */
const ACCESS_DENIED_TEXT = '접근 권한이 없습니다';

/** 인증 사용자 API — 서비스 프론트가 쓰는 core API 와 동일 (`VITE_API_BASE_URL` + `/api/v1`) */
export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'https://api.neture.co.kr';

export interface AuthEvidence {
  /** localStorage 에 access token 이 있는가 */
  accessToken: boolean;
  /** 로그인 상태에서만 렌더되는 사용자 메뉴가 보이는가 */
  userMenuVisible: boolean;
  /** GET /api/v1/auth/me 상태 코드 (호출 실패 시 null) */
  authMeStatus: number | null;
  /** 보호 화면이 "접근 권한이 없습니다" 거부 화면인가 */
  accessDenied: boolean;
  url: string;
}

/** 현재 페이지의 인증 상태 증거를 모은다 (단언하지 않는다) */
export async function collectAuthEvidence(page: Page): Promise<AuthEvidence> {
  const accessToken = await page
    .evaluate(() => !!localStorage.getItem('o4o_accessToken'))
    .catch(() => false);

  let userMenuVisible = false;
  for (const sel of USER_MENU_TRIGGER_SELECTORS) {
    if (await page.locator(sel).first().isVisible({ timeout: 1000 }).catch(() => false)) {
      userMenuVisible = true;
      break;
    }
  }

  const accessDenied = await page
    .getByText(ACCESS_DENIED_TEXT, { exact: false })
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);

  const authMeStatus = await page
    .evaluate(async (apiBase) => {
      try {
        const token = localStorage.getItem('o4o_accessToken');
        const res = await fetch(`${apiBase}/api/v1/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return res.status;
      } catch {
        return null;
      }
    }, API_BASE_URL)
    .catch(() => null);

  return { accessToken, userMenuVisible, authMeStatus, accessDenied, url: page.url() };
}

/**
 * 인증됨 판정.
 *
 * 필수:  access token 존재  +  /login 아님  +  거부 화면 아님
 * 그리고 실사용 신호가 최소 1개: `/auth/me` 200  또는  사용자 메뉴 렌더
 *
 * `/auth/me` 는 CORS·네트워크 사정으로 null 이 될 수 있어 단독 필수 조건으로 두지 않는다.
 * 대신 **명시적 401/403 은 인증 실패로 확정**한다.
 */
export function isAuthenticated(e: AuthEvidence): boolean {
  if (!e.accessToken) return false;
  if (/\/login/.test(e.url)) return false;
  if (e.accessDenied) return false;
  if (e.authMeStatus === 401 || e.authMeStatus === 403) return false;
  return e.authMeStatus === 200 || e.userMenuVisible;
}

export function describeAuthEvidence(e: AuthEvidence): string {
  return (
    `accessToken=${e.accessToken} · userMenu=${e.userMenuVisible} · ` +
    `authMe=${e.authMeStatus ?? 'n/a'} · accessDenied=${e.accessDenied} · url=${e.url}`
  );
}

/**
 * 인증 상태를 단언한다. URL 문자열만으로 통과시키지 않는다.
 */
export async function expectAuthenticated(
  page: Page,
  svc: ServiceConfig,
  context: string,
): Promise<AuthEvidence> {
  const evidence = await collectAuthEvidence(page);
  expect(
    isAuthenticated(evidence),
    `[${svc.name}] ${context} — 인증 상태 아님: ${describeAuthEvidence(evidence)}`,
  ).toBe(true);
  return evidence;
}

// ─── Assertion helpers ───────────────────────────────────────────────────────

/**
 * 현재 URL이 로그인 페이지임을 단언
 */
export async function expectRedirectedToLogin(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
}

/**
 * redirect 무한 루프 없음을 단언.
 * 페이지가 5초 내에 안정화되어야 한다.
 */
export async function expectNoRedirectLoop(page: Page): Promise<void> {
  const urls: string[] = [];
  const handler = (url: { href: string }) => urls.push(url.href);
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) handler({ href: frame.url() });
  });

  await page.waitForTimeout(5000);
  page.removeAllListeners('framenavigated');

  // 5초 내 동일 URL을 3회 이상 반복하면 루프로 판정
  const urlCounts: Record<string, number> = {};
  for (const u of urls) {
    urlCounts[u] = (urlCounts[u] || 0) + 1;
  }
  for (const [u, count] of Object.entries(urlCounts)) {
    expect(count, `Redirect loop detected: ${u} appeared ${count} times`).toBeLessThan(3);
  }
}
