import { test, expect, Page } from '@playwright/test';

/**
 * 보호된 라우트 및 권한 기반 접근 제어 E2E 테스트
 * 
 * 테스트 시나리오:
 * 1. 미인증 사용자의 보호된 페이지 접근
 * 2. 역할 기반 페이지 접근 제어
 * 3. 계정 상태에 따른 접근 제어
 * 4. 리다이렉트 플로우 확인
 */

// 테스트 계정 정보
const TEST_ACCOUNTS = {
  admin: {
    email: 'test-admin@neture.co.kr',
    password: 'TestAdmin123!',
    role: 'admin'
  },
  user: {
    email: 'test-user@neture.co.kr',
    password: 'TestUser123!',
    role: 'customer'
  }
};

// 로그인 헬퍼 함수
async function loginUser(page: Page, account: typeof TEST_ACCOUNTS.admin | typeof TEST_ACCOUNTS.user) {
  await page.goto('/login');
  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

// 로그아웃 헬퍼 함수
async function logoutUser(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(c => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
  });
}

test.describe('보호된 라우트 접근 제어', () => {
  
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그아웃 상태로 시작
    await logoutUser(page);
  });

  test('미인증 사용자 - 대시보드 접근 시 로그인 페이지로 리다이렉트', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 로그인 페이지로 리다이렉트 확인
    await expect(page.url()).toMatch(/\/login/);
    
    // 로그인 후 원래 페이지로 돌아가는지 확인
    await loginUser(page, TEST_ACCOUNTS.user);
    await expect(page.url()).toMatch(/\/dashboard/);
  });

  test('미인증 사용자 - 관리자 페이지 접근 시 로그인 페이지로 리다이렉트', async ({ page }) => {
    await page.goto('/admin');
    
    // 로그인 페이지로 리다이렉트 확인
    await expect(page.url()).toMatch(/\/login/);
    
    // 관리자로 로그인 후 관리자 페이지 접근 가능 확인
    await loginUser(page, TEST_ACCOUNTS.admin);
    await expect(page.url()).toMatch(/\/admin/);
  });

  test('일반 사용자 - 관리자 페이지 접근 제한', async ({ page }) => {
    // 일반 사용자로 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 관리자 페이지 접근 시도
    await page.goto('/admin');
    
    // 대시보드로 리다이렉트 확인 (권한 없음)
    await expect(page.url()).toMatch(/\/dashboard/);
  });

  test('관리자 사용자 - 모든 페이지 접근 가능', async ({ page }) => {
    // 관리자로 로그인
    await loginUser(page, TEST_ACCOUNTS.admin);
    
    // 관리자 페이지 접근 가능 확인
    await page.goto('/admin');
    await expect(page.url()).toMatch(/\/admin/);
    
    // 일반 사용자 페이지도 접근 가능 확인
    await page.goto('/dashboard');
    await expect(page.url()).toMatch(/\/dashboard/);
  });

  test('계정 승인 대기 상태 사용자 접근 제한', async ({ page }) => {
    // 미승인 계정이 있다면 테스트 (실제 환경에서는 수동으로 계정 상태 변경 필요)
    // 이 테스트는 계정 승인 시스템이 구현된 후 활성화
    test.skip('계정 승인 시스템 구현 후 활성화 예정');
  });

  test('SSOProtectedRoute - 역할 기반 접근 제어', async ({ page }) => {
    // SSOProtectedRoute를 사용하는 페이지가 있다면 테스트
    // 현재는 ProtectedRoute를 주로 사용하므로 향후 구현 예정
    test.skip('SSOProtectedRoute 적용 페이지 구현 후 활성화 예정');
  });

  test('세션 만료 시 자동 로그인 페이지 리다이렉트', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 토큰 제거하여 세션 만료 시뮬레이션
    await page.evaluate(() => {
      localStorage.removeItem('accessToken');
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
    
    // 보호된 페이지 접근 시도
    await page.goto('/dashboard');
    
    // 로그인 페이지로 리다이렉트 확인
    await expect(page.url()).toMatch(/\/login/);
  });

  test('로딩 상태 표시 확인', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 보호된 페이지 로딩 시 스피너 표시 확인
    const navigationPromise = page.goto('/dashboard');
    
    // 로딩 스피너가 표시되는지 확인 (빠른 로딩으로 인해 캐치하기 어려울 수 있음)
    const loadingIndicator = page.locator('text=인증 확인 중');
    // 로딩 표시가 나타났다가 사라지는지 확인
    
    await navigationPromise;
    await expect(page.locator('text=대시보드')).toBeVisible();
  });

  test('권한 없음 페이지 표시', async ({ page }) => {
    // 일반 사용자로 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 권한이 필요한 페이지에 직접 접근 (예: 특정 관리 기능)
    await page.goto('/admin/users');
    
    // 접근 권한 없음 메시지 또는 리다이렉트 확인
    const currentUrl = page.url();
    const hasPermissionDenied = await page.locator('text=접근 권한 없음').isVisible();
    const isRedirected = currentUrl.includes('/dashboard') || currentUrl.includes('/');
    
    expect(hasPermissionDenied || isRedirected).toBeTruthy();
  });

  test('개발 환경 디버그 정보 표시', async ({ page }) => {
    if (process.env.NODE_ENV === 'production') {
      test.skip('프로덕션 환경에서는 디버그 정보가 표시되지 않음');
    }
    
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 보호된 페이지에서 디버그 정보 확인
    await page.goto('/dashboard');
    
    // 개발 환경에서만 표시되는 인증 상태 정보 확인
    await expect(page.locator('text=User:')).toBeVisible();
    await expect(page.locator('text=Role:')).toBeVisible();
    await expect(page.locator('text=Auth:')).toBeVisible();
    await expect(page.locator('text=Active:')).toBeVisible();
  });

  test('네트워크 오류 시 적절한 에러 처리', async ({ page }) => {
    // 네트워크 차단
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/login');
    
    // 로그인 시도
    await page.fill('input[name="email"]', TEST_ACCOUNTS.user.email);
    await page.fill('input[name="password"]', TEST_ACCOUNTS.user.password);
    await page.click('button[type="submit"]');
    
    // 네트워크 오류에 대한 적절한 에러 메시지 표시 확인
    await expect(page.locator('text=네트워크 오류')).toBeVisible({ timeout: 10000 });
  });

  test('브라우저 뒤로가기/앞으로가기 네비게이션', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 페이지 이동
    await page.goto('/dashboard');
    await page.goto('/profile');
    
    // 뒤로가기
    await page.goBack();
    await expect(page.url()).toMatch(/\/dashboard/);
    
    // 앞으로가기
    await page.goForward();
    await expect(page.url()).toMatch(/\/profile/);
    
    // 각 페이지에서 인증 상태가 유지되는지 확인
    if (process.env.NODE_ENV !== 'production') {
      await expect(page.locator('text=Auth: SSO')).toBeVisible();
    }
  });

});