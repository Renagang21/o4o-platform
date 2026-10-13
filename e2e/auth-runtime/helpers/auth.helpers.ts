/** Credential-free runtime checks. Real OAuth/session-state verification has its own evidence. */
import { type Page } from '@playwright/test';
export const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://api.neture.co.kr';
export const USER_ORIGINS = [
  'neture',
  'supplier',
  'community',
  'funding',
  'pharmacy',
  'store',
  'study',
  'kpa',
].map((name) =>
  name === 'neture'
    ? 'https://neture.co.kr'
    : 'https://' + name + '.neture.co.kr',
);
// These two known management guards are used by the protected-route suite.
export const ALL_SERVICES = [
  {
    name: 'Neture',
    baseUrl: 'https://neture.co.kr',
    loginPath: '/login',
    protectedPath: '/admin',
  },
  {
    name: 'KPA-Society',
    baseUrl: 'https://pharmacy.neture.co.kr',
    loginPath: '/login',
    protectedPath: '/admin',
  },
];

// ─── Network tracking ────────────────────────────────────────────────────────

/**
 * /auth/me GET 요청 횟수 추적 — duplicate fetch 탐지용
 */
export function trackAuthMeRequests(page: Page): {
  count: () => number;
  urls: () => string[];
} {
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
      'o4o_accessToken',
      'o4o_refreshToken',
      'accessToken',
      'authToken',
      'token',
      'refreshToken',
      'admin-auth-storage',
      'user',
    ];
    keys.forEach((k) => localStorage.removeItem(k));
  });
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
    if (
      await page
        .locator(sel)
        .first()
        .isVisible({ timeout: 200 })
        .catch(() => false)
    ) {
      return true;
    }
  }
  return false;
}

export async function waitForLoadingComplete(
  page: Page,
  maxMs = 8000,
): Promise<void> {
  const deadline = Date.now() + maxMs;

  // SPA 마운트 전(#root 비어 있음)에는 스피너도 없다. 그 상태를 "로딩 완료"로 보면
  // 마운트 직후 뜨는 auth 스피너를 freeze 로 오판하므로 마운트를 먼저 기다린다.
  await page
    .waitForFunction(
      () => (document.querySelector('#root')?.childElementCount ?? 0) > 0,
      null,
      {
        timeout: Math.max(1000, maxMs),
      },
    )
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
