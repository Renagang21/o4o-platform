/**
 * Auth Runtime E2E — 공통 helpers
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1
 *
 * 자격증명 하드코딩 금지 — docs/local/TEST-ACCOUNTS.local.md 참조.
 * 환경변수(E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD)를 통해 주입한다.
 */

import { type Page, expect } from '@playwright/test';

// ─── Service Configs ─────────────────────────────────────────────────────────

export interface ServiceConfig {
  name: string;
  baseUrl: string;
  loginPath: string;
  /** admin 또는 operator protected route */
  protectedPath: string;
  /** login 성공 후 도달할 경로 prefix */
  dashboardPrefix: string;
  /** 서비스 특이사항 */
  note?: string;
}

export const SERVICES: Record<string, ServiceConfig> = {
  neture: {
    name: 'Neture',
    baseUrl: 'https://www.neture.co.kr',
    loginPath: '/login',
    protectedPath: '/admin',
    dashboardPrefix: '/admin',
  },
  glycopharm: {
    name: 'GlycoPharm',
    baseUrl: 'https://glycopharm.co.kr',
    loginPath: '/login',
    protectedPath: '/operator',
    dashboardPrefix: '/operator',
  },
  kpa: {
    name: 'KPA-Society',
    baseUrl: 'https://kpa-society.co.kr',
    loginPath: '/login',
    protectedPath: '/admin',
    dashboardPrefix: '/admin',
  },
  kcosmetics: {
    name: 'K-Cosmetics',
    baseUrl: 'https://k-cosmetics.site',
    loginPath: '/login',
    protectedPath: '/operator',
    dashboardPrefix: '/operator',
    note: 'lazy session — RoleGuard에서 checkSession 트리거',
  },
};

export const ALL_SERVICES = Object.values(SERVICES);

// ─── Credential helpers (env only — no hardcoding) ───────────────────────────

export function getAdminCredentials(): { email: string; password: string } {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.\n' +
        'docs/local/TEST-ACCOUNTS.local.md를 참조하여 설정하세요.',
    );
  }
  return { email, password };
}

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

/**
 * 서비스 로그인.
 * 다양한 폼 셀렉터를 순서대로 시도한다.
 */
export async function loginAs(
  page: Page,
  baseUrl: string,
  loginPath: string,
  email: string,
  password: string,
): Promise<boolean> {
  await page.goto(`${baseUrl}${loginPath}`, { waitUntil: 'domcontentloaded' });

  // 폼 렌더 대기
  await page.waitForTimeout(1500);

  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="이메일"]',
    'input[placeholder*="email" i]',
  ];
  const pwSelectors = [
    'input[type="password"]',
    'input[name="password"]',
  ];
  const submitSelectors = [
    'button[type="submit"]',
    'button:has-text("로그인")',
    'button:has-text("Login")',
  ];

  let emailFilled = false;
  for (const sel of emailSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.fill(email);
      emailFilled = true;
      break;
    }
  }

  let pwFilled = false;
  for (const sel of pwSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.fill(password);
      pwFilled = true;
      break;
    }
  }

  if (!emailFilled || !pwFilled) return false;

  for (const sel of submitSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click();
      break;
    }
  }

  // 네비게이션 또는 상태 변화 대기
  await page.waitForTimeout(3000);
  return true;
}

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
 *   GlobalHeader (@o4o/ui, KPA / GlycoPharm / K-Cosmetics) — aria-label="사용자 메뉴"
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
  const triggerSelectors = [
    'button[aria-label="사용자 메뉴"]',  // GlobalHeader (KPA / GlycoPharm / K-Cosmetics)
    'button[aria-label="계정 메뉴"]',    // GlobalUserProfileDropdown (Neture)
    'button[aria-label*="사용자"]',
    'button[aria-label*="계정"]',
    'button[aria-haspopup="true"]',
  ];

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
export async function waitForLoadingComplete(page: Page, maxMs = 8000): Promise<void> {
  // full-page auth spinner: min-h-screen 컨테이너 내부의 스피너만 탐지
  // 소형 콘텐츠 스피너(대시보드 위젯 등)는 제외
  const spinnerSelectors = [
    '.min-h-screen [class*="animate-spin"]',
    '.min-h-screen [class*="spinner"]',
    'div:has(> [class*="animate-spin"]):has(> :only-child)',
  ];

  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    let anyVisible = false;
    for (const sel of spinnerSelectors) {
      if (await page.locator(sel).first().isVisible({ timeout: 200 }).catch(() => false)) {
        anyVisible = true;
        break;
      }
    }
    if (!anyVisible) return;
    await page.waitForTimeout(300);
  }
  // 타임아웃이 나도 테스트는 계속 — 호출부에서 별도 assertion
}

// ─── Assertion helpers ───────────────────────────────────────────────────────

/**
 * 현재 URL이 로그인 페이지임을 단언
 */
export async function expectRedirectedToLogin(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
}

/**
 * 현재 URL이 로그인 페이지가 아님을 단언 (인증 완료)
 */
export async function expectNotOnLoginPage(page: Page): Promise<void> {
  const url = page.url();
  expect(url).not.toMatch(/\/login/);
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
