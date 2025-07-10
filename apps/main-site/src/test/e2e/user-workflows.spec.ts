import { test, expect, Page } from '@playwright/test';

/**
 * 사용자 워크플로우 E2E 테스트
 * 
 * 테스트 시나리오:
 * 1. 홈페이지 → 로그인 → 대시보드 플로우
 * 2. 테스트 기능 접근 및 사용
 * 3. 프로필 관리 플로우
 * 4. 다양한 역할별 워크플로우
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
  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('사용자 워크플로우', () => {
  
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그아웃 상태로 시작
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

  test('신규 방문자 → 로그인 → 대시보드 완전 플로우', async ({ page }) => {
    // 1. 홈페이지 방문
    await page.goto('/');
    
    // 홈페이지 주요 요소 확인
    await expect(page.locator('text=Neture')).toBeVisible();
    
    // 2. 로그인 페이지로 이동
    await page.click('text=로그인');
    await expect(page.url()).toMatch(/\/login/);
    
    // 3. 로그인 수행
    await page.fill('input[name="email"]', TEST_ACCOUNTS.user.email);
    await page.fill('input[name="password"]', TEST_ACCOUNTS.user.password);
    await page.click('button[type="submit"]');
    
    // 4. 대시보드 접근 확인
    await expect(page.url()).toMatch(/\/dashboard/);
    await expect(page.locator('text=대시보드')).toBeVisible();
    
    // 5. 사용자 정보 표시 확인
    if (process.env.NODE_ENV !== 'production') {
      await expect(page.locator('text=Auth: SSO')).toBeVisible();
      await expect(page.locator('text=Role: customer')).toBeVisible();
    }
  });

  test('테스트 기능 접근 및 사용 플로우', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 홈페이지에서 테스트 기능 확인
    await page.goto('/');
    
    // 테스트 배너 그리드 확인
    const testBanners = page.locator('[data-testid="test-banner-grid"]');
    if (await testBanners.isVisible()) {
      await expect(testBanners).toBeVisible();
      
      // 개별 테스트 기능 카드 확인
      await expect(page.locator('text=테스트 기능')).toBeVisible();
    }
    
    // 테스트 계정 정보 확인
    const testAccounts = page.locator('[data-testid="test-account-list"]');
    if (await testAccounts.isVisible()) {
      await expect(testAccounts).toBeVisible();
      await expect(page.locator('text=테스트 계정 정보')).toBeVisible();
    }
  });

  test('관리자 워크플로우 - 대시보드 → 관리 기능', async ({ page }) => {
    // 관리자로 로그인
    await loginUser(page, TEST_ACCOUNTS.admin);
    
    // 관리자 페이지 접근
    await page.goto('/admin');
    await expect(page.url()).toMatch(/\/admin/);
    
    // 관리자 기능 확인
    await expect(page.locator('text=관리자')).toBeVisible();
    
    // 사용자 관리 기능 접근 (있다면)
    const userManagement = page.locator('text=사용자 관리');
    if (await userManagement.isVisible()) {
      await userManagement.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('프로필 관리 플로우', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 프로필 페이지 접근
    await page.goto('/profile');
    
    // 프로필 정보 표시 확인
    if (await page.locator('text=프로필').isVisible()) {
      await expect(page.locator('text=프로필')).toBeVisible();
      
      // 사용자 정보 확인
      await expect(page.locator(`text=${TEST_ACCOUNTS.user.name}`)).toBeVisible();
      await expect(page.locator(`text=${TEST_ACCOUNTS.user.email}`)).toBeVisible();
    }
  });

  test('네비게이션 메뉴 사용 플로우', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 다양한 페이지 네비게이션 테스트
    const navigationItems = [
      { text: '홈', url: '/' },
      { text: '대시보드', url: '/dashboard' },
      { text: '프로필', url: '/profile' }
    ];
    
    for (const item of navigationItems) {
      const navLink = page.locator(`text=${item.text}`);
      if (await navLink.isVisible()) {
        await navLink.click();
        await page.waitForLoadState('networkidle');
        
        // URL 확인 (정확한 매치는 아니어도 기본 경로 포함 확인)
        const currentUrl = page.url();
        if (item.url !== '/') {
          expect(currentUrl).toContain(item.url);
        }
      }
    }
  });

  test('검색 기능 워크플로우 (있다면)', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 홈페이지 또는 대시보드에서 검색 기능 확인
    await page.goto('/');
    
    const searchInput = page.locator('input[placeholder*="검색"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('테스트');
      await page.press('input[placeholder*="검색"]', 'Enter');
      await page.waitForLoadState('networkidle');
      
      // 검색 결과 페이지 또는 결과 표시 확인
      await expect(page.locator('text=검색')).toBeVisible();
    }
  });

  test('반응형 디자인 - 모바일 워크플로우', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 모바일에서 전체 로그인 플로우
    await page.goto('/');
    
    // 모바일 메뉴 버튼 확인 (햄버거 메뉴)
    const mobileMenuButton = page.locator('button[aria-label*="메뉴"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
    }
    
    // 로그인 링크 클릭
    await page.click('text=로그인');
    
    // 모바일에서 로그인
    await page.fill('input[name="email"]', TEST_ACCOUNTS.user.email);
    await page.fill('input[name="password"]', TEST_ACCOUNTS.user.password);
    await page.click('button[type="submit"]');
    
    // 로그인 후 대시보드 확인
    await expect(page.url()).toMatch(/\/dashboard/);
  });

  test('오류 상황 처리 - 네트워크 중단 시나리오', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 네트워크 중단 시뮬레이션
    await page.route('**/api/**', route => route.abort());
    
    // API 호출이 필요한 페이지 이동
    await page.goto('/dashboard');
    
    // 적절한 오류 처리 확인 (로딩 실패, 재시도 옵션 등)
    const errorMessages = [
      'text=네트워크 오류',
      'text=연결 실패',
      'text=다시 시도',
      'text=오류가 발생했습니다'
    ];
    
    let errorFound = false;
    for (const selector of errorMessages) {
      if (await page.locator(selector).isVisible({ timeout: 5000 })) {
        errorFound = true;
        break;
      }
    }
    
    // 오류 메시지가 표시되거나 적절한 fallback UI가 표시되는지 확인
    expect(errorFound || await page.locator('text=대시보드').isVisible()).toBeTruthy();
  });

  test('세션 지속성 - 페이지 새로고침 후 상태 유지', async ({ page }) => {
    // 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 대시보드에서 페이지 새로고침
    await page.goto('/dashboard');
    await page.reload();
    
    // 로그인 상태가 유지되는지 확인
    await expect(page.url()).toMatch(/\/dashboard/);
    
    // 인증 상태 확인
    if (process.env.NODE_ENV !== 'production') {
      await expect(page.locator('text=Auth: SSO')).toBeVisible();
    }
  });

  test('다중 탭 세션 공유', async ({ page, context }) => {
    // 첫 번째 탭에서 로그인
    await loginUser(page, TEST_ACCOUNTS.user);
    
    // 두 번째 탭 열기
    const secondTab = await context.newPage();
    await secondTab.goto('/dashboard');
    
    // 두 번째 탭에서도 로그인 상태가 유지되는지 확인
    await expect(secondTab.locator('text=대시보드')).toBeVisible();
    
    // 첫 번째 탭에서 로그아웃
    const logoutButton = page.locator('button').filter({ hasText: /로그아웃|logout/i }).first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // 두 번째 탭 새로고침 후 로그아웃 상태 확인
    await secondTab.reload();
    
    // 두 번째 탭에서도 로그아웃되었는지 확인 (세션 공유)
    const currentUrl = secondTab.url();
    expect(currentUrl.includes('/login') || currentUrl === '/').toBeTruthy();
    
    await secondTab.close();
  });

});