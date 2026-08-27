/**
 * Auth Runtime E2E — 공통 helpers
 *
 * CHECK-O4O-AUTH-RUNTIME-PLAYWRIGHT-E2E-V1
 * WO-O4O-KPA-AUTH-RUNTIME-E2E-LOGIN-REGRESSION-ROOT-CAUSE-AND-CI-CLOSURE-V1
 *
 * 자격증명 하드코딩 금지 — docs/local/TEST-ACCOUNTS.local.md 참조.
 *
 * ── credential 계약 (2026-08-26 개정) ──
 * 공용 `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` 는 **폐기됐다.**
 * 실제 인증은 서비스별 L2 `service_credentials`(serviceKey 단위) 로 판정되므로,
 * 공용 secret 하나를 쓰면 **한 서비스의 비밀번호만 바뀜어도 CI 전체가 깨지고**
 * 그 장애가 "코드 회귀"처럼 보인다 (2026-08-21 KPA 사례).
 * 따라서 credential 은 **serviceKey 별로 분리**한다:
 *
 *   E2E_KPA_ADMIN_EMAIL    / E2E_KPA_ADMIN_PASSWORD      (kpa-society)
 *   E2E_KCOS_ADMIN_EMAIL   / E2E_KCOS_ADMIN_PASSWORD     (k-cosmetics)
 *   E2E_NETURE_ADMIN_EMAIL / E2E_NETURE_ADMIN_PASSWORD   (neture)
 *   E2E_GLYCO_ADMIN_EMAIL  / E2E_GLYCO_ADMIN_PASSWORD    (glycopharm)
 *
 * 가능하면 **E2E 전용 계정**을 쓴다. 운영자 개인 계정을 CI 인증 fixture 로 쓰면
 * 정상적인 비밀번호 변경이 다시 CI 장애로 보인다.
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
  emailEnv: string;
  /** 서비스별 E2E 계정 password 환경변수명 */
  passwordEnv: string;
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
    emailEnv: 'E2E_NETURE_ADMIN_EMAIL',
    passwordEnv: 'E2E_NETURE_ADMIN_PASSWORD',
  },
  glycopharm: {
    name: 'GlycoPharm',
    serviceKey: 'glycopharm',
    baseUrl: 'https://glycopharm.co.kr',
    loginPath: '/login',
    protectedPath: '/operator',
    dashboardPrefix: '/operator',
    emailEnv: 'E2E_GLYCO_ADMIN_EMAIL',
    passwordEnv: 'E2E_GLYCO_ADMIN_PASSWORD',
  },
  kpa: {
    name: 'KPA-Society',
    serviceKey: 'kpa-society',
    baseUrl: 'https://kpa-society.co.kr',
    loginPath: '/login',
    protectedPath: '/admin',
    dashboardPrefix: '/admin',
    emailEnv: 'E2E_KPA_ADMIN_EMAIL',
    passwordEnv: 'E2E_KPA_ADMIN_PASSWORD',
  },
  kcosmetics: {
    name: 'K-Cosmetics',
    serviceKey: 'k-cosmetics',
    baseUrl: 'https://k-cosmetics.site',
    loginPath: '/login',
    protectedPath: '/operator',
    dashboardPrefix: '/operator',
    emailEnv: 'E2E_KCOS_ADMIN_EMAIL',
    passwordEnv: 'E2E_KCOS_ADMIN_PASSWORD',
    note: 'lazy session — RoleGuard에서 checkSession 트리거',
  },
};

export const ALL_SERVICES = Object.values(SERVICES);

// ─── Credential helpers (env only — no hardcoding) ───────────────────────────

/**
 * 서비스별 E2E 자격증명을 환경변수에서 읽는다.
 *
 * fallback 을 두지 않는다. 공용 secret 으로 떨어지는 경로가 있으면
 * 분리 계약이 조용히 무효화되고, 장애 시 어느 값이 쓰였는지 판별할 수 없다.
 */
export function getServiceCredentials(svc: ServiceConfig): { email: string; password: string } {
  const email = process.env[svc.emailEnv];
  const password = process.env[svc.passwordEnv];
  if (!email || !password) {
    const missing = [!email ? svc.emailEnv : null, !password ? svc.passwordEnv : null].filter(Boolean);
    throw new Error(
      `[${svc.name}] E2E 자격증명 미설정 — ${missing.join(', ')}
` +
        `  serviceKey=${svc.serviceKey} 의 L2 credential 과 정합해야 합니다.
` +
        '  값은 docs/local/TEST-ACCOUNTS.local.md (Git 추적 제외) / GitHub Actions Secrets 에서 관리합니다.',
    );
  }
  return { email, password };
}

/** 미설정된 서비스별 credential 환경변수명 목록 (preflight 보고용) */
export function missingCredentialEnvs(services: ServiceConfig[] = ALL_SERVICES): string[] {
  const missing: string[] = [];
  for (const svc of services) {
    if (!process.env[svc.emailEnv]) missing.push(svc.emailEnv);
    if (!process.env[svc.passwordEnv]) missing.push(svc.passwordEnv);
  }
  return missing;
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
// 인라인 거부 화면을 렌더하고, Neture·GlycoPharm 은 `/` 로 착지한다).
// 그래서 판정을 **인증 상태 신호**로 바꾼다.

/** 로그인 상태에서만 렌더되는 사용자 메뉴 트리거 (GlobalHeader / GlobalUserProfileDropdown) */
export const USER_MENU_TRIGGER_SELECTORS = [
  'button[aria-label="사용자 메뉴"]',  // GlobalHeader (KPA / GlycoPharm / K-Cosmetics)
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

/**
 * 로그인 → 보호 화면 진입 → **인증 성공 단언**까지 수행하는 공통 setup.
 *
 * 로그인에 실패하면 여기서 즉시 실패한다. skip 하지 않는다.
 * 이전 구현은 `if (!ok) test.skip(...)` 이었고, 그래서 2026-08-21 KPA 자격 drift 때
 * 후속 dashboard/logout 테스트가 연쇄 오탐으로 통과했다.
 */
export async function loginAndAssertAuthenticated(
  page: Page,
  svc: ServiceConfig,
): Promise<AuthEvidence> {
  const { email, password } = getServiceCredentials(svc);

  const formOk = await loginAs(page, svc.baseUrl, svc.loginPath, email, password);
  expect(formOk, `[${svc.name}] 로그인 폼 입력 실패 (${svc.loginPath})`).toBe(true);

  await page.goto(`${svc.baseUrl}${svc.protectedPath}`, { waitUntil: 'domcontentloaded' });
  await waitForLoadingComplete(page, 8000);
  await page.waitForTimeout(1000);

  return expectAuthenticated(page, svc, `로그인 후 ${svc.protectedPath} 접근`);
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
