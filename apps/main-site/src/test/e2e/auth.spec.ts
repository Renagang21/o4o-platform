import { test, expect, Page } from '@playwright/test';

/**
 * SSO 인증 시스템 E2E 테스트
 * 
 * 테스트 시나리오:
 * 1. 로그인 페이지 접근 및 UI 확인
 * 2. SSO 로그인 플로우 테스트
 * 3. 인증된 사용자 상태 확인
 * 4. 보호된 페이지 접근 테스트
 * 5. 로그아웃 플로우 테스트
 */

// 테스트 계정 정보
const TEST_ACCOUNTS = {
  admin: {
    email: 'test-admin@neture.co.kr',
    password: 'TestAdmin123!',
    name: 'Test Admin',
    role: 'admin'
  },
  user: {
    email: 'test-user@neture.co.kr',
    password: 'TestUser123!',
    name: 'Test User',
    role: 'customer'
  }
};

// 로그인 헬퍼 함수
async function loginUser(page: Page, account: typeof TEST_ACCOUNTS.admin | typeof TEST_ACCOUNTS.user) {
  await page.goto('/login');
  
  // 로그인 폼 입력
  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  
  // 로그인 버튼 클릭
  await page.click('button[type="submit"]');
  
  // 로그인 성공 대기 (리다이렉트 또는 성공 메시지)
  await page.waitForLoadState('networkidle');
}

test.describe('SSO 인증 시스템', () => {
  
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그아웃 상태로 시작
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach(c => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    });
  });

  test('로그인 페이지 UI 확인', async ({ page }) => {
    await page.goto('/login');
    
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/로그인/);
    
    // 로고 확인
    await expect(page.locator('text=🌿 Neture')).toBeVisible();
    
    // SSO 시스템 안내 확인
    await expect(page.locator('text=새로운 SSO 인증 시스템')).toBeVisible();
    
    // 개발 환경 테스트 계정 안내 확인
    if (process.env.NODE_ENV !== 'production') {
      await expect(page.locator('text=🔧 개발 환경 - 테스트 계정')).toBeVisible();
    }
    
    // 로그인 폼 요소들 확인
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // 비밀번호 보이기/숨기기 버튼 확인
    await expect(page.locator('button').filter({ hasText: /eye/i }).first()).toBeVisible();
  });

  test('관리자 계정 SSO 로그인 플로우', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.admin);
    
    // 로그인 성공 후 관리자 페이지로 리다이렉트 확인
    await expect(page.url()).toMatch(/\/admin/);
    
    // 인증 상태 확인 (개발 환경에서 표시되는 디버그 정보)
    if (process.env.NODE_ENV !== 'production') {
      await expect(page.locator('text=Auth: SSO')).toBeVisible();
      await expect(page.locator('text=Role: admin')).toBeVisible();
      await expect(page.locator('text=Active: ✅')).toBeVisible();
    }
    
    // 관리자 기능 접근 가능 확인
    await expect(page.locator('text=관리자')).toBeVisible();
  });

  test('일반 사용자 SSO 로그인 플로우', async ({ page }) => {
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 로그인 성공 후 대시보드로 리다이렉트 확인
    await expect(page.url()).toMatch(/\/dashboard/);
    
    // 인증 상태 확인
    if (process.env.NODE_ENV !== 'production') {
      await expect(page.locator('text=Auth: SSO')).toBeVisible();
      await expect(page.locator('text=Role: customer')).toBeVisible();
      await expect(page.locator('text=Active: ✅')).toBeVisible();
    }
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    await page.goto('/login');
    
    // 잘못된 이메일/비밀번호 입력
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // 로그인 시도
    await page.click('button[type="submit"]');
    
    // 에러 메시지 확인
    await expect(page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible();
    
    // 여전히 로그인 페이지에 있는지 확인
    await expect(page.url()).toMatch(/\/login/);
  });

  test('보호된 페이지 접근 제어', async ({ page }) => {
    // 로그인하지 않은 상태에서 보호된 페이지 접근 시도
    await page.goto('/dashboard');
    
    // 로그인 페이지로 리다이렉트 확인
    await expect(page.url()).toMatch(/\/login/);
    
    // 로그인 후 원래 페이지로 돌아가는지 확인
    await loginUser(page, TEST_ACCOUNTS.user);
    await expect(page.url()).toMatch(/\/dashboard/);
  });

  test('관리자 전용 페이지 권한 제어', async ({ page }) => {
    // 일반 사용자로 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 관리자 페이지 접근 시도
    await page.goto('/admin');
    
    // 대시보드로 리다이렉트되는지 확인 (권한 없음)
    await expect(page.url()).toMatch(/\/dashboard/);
  });

  test('로그아웃 플로우', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 로그아웃 버튼 찾기 및 클릭
    const logoutButton = page.locator('button').filter({ hasText: /로그아웃|logout/i }).first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // 로그아웃 후 홈페이지 또는 로그인 페이지로 리다이렉트 확인
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      expect(currentUrl === '/' || currentUrl.includes('/login')).toBeTruthy();
    }
  });

  test('토큰 자동 갱신 테스트', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 토큰 만료 시뮬레이션 (localStorage에서 토큰 제거)
    await page.evaluate(() => {
      localStorage.removeItem('accessToken');
    });
    
    // 보호된 API 호출이 포함된 페이지 이동
    await page.goto('/dashboard');
    
    // 페이지가 정상적으로 로드되는지 확인 (토큰 자동 갱신)
    await expect(page.locator('text=대시보드')).toBeVisible();
  });

  test('세션 지속성 테스트', async ({ page, context }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 새 탭 열기
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    
    // 새 탭에서도 로그인 상태가 유지되는지 확인
    await expect(newPage.locator('text=대시보드')).toBeVisible();
    
    // 인증 상태 확인
    if (process.env.NODE_ENV !== 'production') {
      await expect(newPage.locator('text=Auth: SSO')).toBeVisible();
    }
    
    await newPage.close();
  });

  test('반응형 디자인 - 모바일에서 로그인', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/login');
    
    // 모바일에서 로그인 폼이 제대로 보이는지 확인
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // 모바일에서 로그인 테스트
    await loginUser(page, TEST_ACCOUNTS.user);
    await expect(page.url()).toMatch(/\/dashboard/);
  });

});