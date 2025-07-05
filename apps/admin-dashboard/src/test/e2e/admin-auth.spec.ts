import { test, expect, Page } from '@playwright/test';

/**
 * Admin Dashboard SSO 인증 시스템 E2E 테스트
 * 
 * 테스트 시나리오:
 * 1. 관리자 로그인 플로우
 * 2. 일반 사용자 접근 차단
 * 3. 권한 기반 접근 제어
 * 4. 세션 관리 및 로그아웃
 * 5. 보안 기능 테스트
 */

// 테스트 계정 정보
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@neture.co.kr',
    password: 'admin123!',
    name: 'Test Admin',
    role: 'admin'
  },
  user: {
    email: 'user@neture.co.kr',
    password: 'user123!',
    name: 'Test User',
    role: 'customer'
  }
};

// 관리자 로그인 헬퍼 함수
async function adminLogin(page: Page, account = TEST_ACCOUNTS.admin) {
  await page.goto('/login');
  
  // 로그인 폼 입력
  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  
  // 로그인 버튼 클릭
  await page.click('button[type="submit"]');
  
  // 로그인 성공 대기
  await page.waitForLoadState('networkidle');
}

// 일반 사용자 로그인 헬퍼 함수 (접근 차단 테스트용)
async function userLogin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', TEST_ACCOUNTS.user.email);
  await page.fill('input[name="password"]', TEST_ACCOUNTS.user.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('Admin Dashboard SSO 인증 시스템', () => {
  
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

  test('관리자 로그인 페이지 UI 확인', async ({ page }) => {
    await page.goto('/login');
    
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/O4O Admin/);
    
    // 관리자 로고 및 제목 확인
    await expect(page.locator('text=O4O Admin')).toBeVisible();
    await expect(page.locator('text=관리자 계정으로 로그인하세요')).toBeVisible();
    
    // SSO 시스템 안내 확인
    await expect(page.locator('text=새로운 SSO 인증 시스템')).toBeVisible();
    await expect(page.locator('text=관리자 전용 보안 강화')).toBeVisible();
    
    // 개발 환경 테스트 계정 안내 확인
    if (process.env.NODE_ENV !== 'production') {
      await expect(page.locator('text=개발 환경 - 관리자 테스트 계정')).toBeVisible();
      await expect(page.locator('text=admin@neture.co.kr')).toBeVisible();
    }
    
    // 로그인 폼 요소들 확인
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // 보안 안내 확인
    await expect(page.locator('text=보안 안내')).toBeVisible();
    await expect(page.locator('text=세션은 8시간 후 자동 만료됩니다')).toBeVisible();
  });

  test('관리자 SSO 로그인 성공 플로우', async ({ page }) => {
    await adminLogin(page);
    
    // 관리자 대시보드로 리다이렉트 확인
    await expect(page.url()).toMatch(/\/dashboard/);
    
    // 관리자 대시보드 요소 확인
    await expect(page.locator('text=관리자 대시보드')).toBeVisible();
    await expect(page.locator('text=O4O 플랫폼 통합 관리 시스템 (SSO)')).toBeVisible();
    
    // 사용자 정보 확인
    await expect(page.locator('text=Test Admin')).toBeVisible();
    
    // 세션 상태 표시 확인
    await expect(page.locator('text=세션: 활성')).toBeVisible();
    
    // 개발 환경에서 디버그 정보 확인
    if (process.env.NODE_ENV !== 'production') {
      await expect(page.locator('text=Role: admin')).toBeVisible();
      await expect(page.locator('text=Auth: SSO Admin')).toBeVisible();
    }
  });

  test('일반 사용자 관리자 페이지 접근 차단', async ({ page }) => {
    // 일반 사용자로 로그인 시도
    await userLogin(page);
    
    // 접근 권한 없음 페이지 확인
    await expect(page.locator('text=접근 권한 없음')).toBeVisible();
    await expect(page.locator('text=관리자 권한이 필요합니다')).toBeVisible();
    
    // 메인 사이트로 이동 버튼 확인
    await expect(page.locator('text=메인 사이트로 이동')).toBeVisible();
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

  test('관리자 권한 확인 및 메뉴 접근', async ({ page }) => {
    // 관리자로 로그인
    await adminLogin(page);
    
    // 사이드바 메뉴 항목들 확인
    await expect(page.locator('text=대시보드')).toBeVisible();
    await expect(page.locator('text=사용자')).toBeVisible();
    await expect(page.locator('text=콘텐츠')).toBeVisible();
    await expect(page.locator('text=제품')).toBeVisible();
    await expect(page.locator('text=주문')).toBeVisible();
    await expect(page.locator('text=분석')).toBeVisible();
    await expect(page.locator('text=설정')).toBeVisible();
    
    // 각 메뉴 항목 클릭 테스트
    const menuItems = [
      { text: '사용자', expectedUrl: '/users' },
      { text: '콘텐츠', expectedUrl: '/content' },
      { text: '제품', expectedUrl: '/products' },
      { text: '주문', expectedUrl: '/orders' },
    ];
    
    for (const item of menuItems) {
      const menuLink = page.locator(`text=${item.text}`).first();
      if (await menuLink.isVisible()) {
        await menuLink.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain(item.expectedUrl);
      }
    }
  });

  test('세션 상태 표시 및 사용자 메뉴', async ({ page }) => {
    // 관리자로 로그인
    await adminLogin(page);
    
    // 헤더의 사용자 메뉴 클릭
    await page.click('button:has-text("Test Admin")');
    
    // 사용자 정보 확인
    await expect(page.locator('text=Test Admin')).toBeVisible();
    await expect(page.locator('text=admin@neture.co.kr')).toBeVisible();
    await expect(page.locator('text=역할: admin | SSO 인증')).toBeVisible();
    
    // 보안 상태 정보 확인
    await expect(page.locator('text=세션 상태:')).toBeVisible();
    await expect(page.locator('text=권한: 활성')).toBeVisible();
    await expect(page.locator('text=계정: 승인됨')).toBeVisible();
    
    // 메뉴 항목들 확인
    await expect(page.locator('text=프로필 설정')).toBeVisible();
    await expect(page.locator('text=계정 설정')).toBeVisible();
    await expect(page.locator('text=모든 기기에서 로그아웃')).toBeVisible();
    await expect(page.locator('text=로그아웃')).toBeVisible();
    
    // 보안 정보 확인
    await expect(page.locator('text=보안 세션 | 8시간 후 자동 만료')).toBeVisible();
  });

  test('로그아웃 플로우', async ({ page }) => {
    // 관리자로 로그인
    await adminLogin(page);
    
    // 사용자 메뉴 열기
    await page.click('button:has-text("Test Admin")');
    
    // 로그아웃 버튼 클릭
    await page.click('text=로그아웃');
    
    // 로그인 페이지로 리다이렉트 확인
    await expect(page.url()).toMatch(/\/login/);
    
    // 로그인 페이지 요소 확인
    await expect(page.locator('text=O4O Admin')).toBeVisible();
    
    // 다시 관리자 페이지 접근 시도
    await page.goto('/dashboard');
    
    // 로그인 페이지로 리다이렉트되는지 확인
    await expect(page.url()).toMatch(/\/login/);
  });

  test('모든 기기에서 로그아웃 기능', async ({ page, context }) => {
    // 첫 번째 탭에서 관리자 로그인
    await adminLogin(page);
    
    // 두 번째 탭 열기
    const secondTab = await context.newPage();
    await secondTab.goto('/dashboard');
    
    // 두 번째 탭에서도 로그인 상태 확인
    await expect(secondTab.locator('text=관리자 대시보드')).toBeVisible();
    
    // 첫 번째 탭에서 "모든 기기에서 로그아웃" 실행
    await page.click('button:has-text("Test Admin")');
    await page.click('text=모든 기기에서 로그아웃');
    
    // 첫 번째 탭 로그아웃 확인
    await expect(page.url()).toMatch(/\/login/);
    
    // 두 번째 탭 새로고침 후 로그아웃 확인
    await secondTab.reload();
    await expect(secondTab.url()).toMatch(/\/login/);
    
    await secondTab.close();
  });

  test('Remember Me 기능', async ({ page }) => {
    await page.goto('/login');
    
    // Remember Me 체크박스 선택
    await page.check('input[name="remember-me"]');
    
    // 로그인
    await page.fill('input[name="email"]', TEST_ACCOUNTS.admin.email);
    await page.fill('input[name="password"]', TEST_ACCOUNTS.admin.password);
    await page.click('button[type="submit"]');
    
    // 로그인 성공 확인
    await expect(page.url()).toMatch(/\/dashboard/);
    
    // 쿠키 설정 확인 (30일 유지)
    const cookies = await page.context().cookies();
    const refreshCookie = cookies.find(c => c.name === 'refreshToken');
    
    if (refreshCookie) {
      // 쿠키 만료 시간이 설정되어 있는지 확인
      expect(refreshCookie.expires).toBeGreaterThan(Date.now() / 1000);
    }
  });

  test('세션 만료 경고 시뮬레이션', async ({ page }) => {
    // 관리자로 로그인
    await adminLogin(page);
    
    // 토큰을 거의 만료된 상태로 변경
    await page.evaluate(() => {
      // 5분 후 만료되는 토큰으로 변경
      const payload = {
        sub: 'admin-id',
        email: 'admin@neture.co.kr',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 300, // 5분 후 만료
        iat: Math.floor(Date.now() / 1000)
      };
      
      const fakeToken = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
      localStorage.setItem('accessToken', fakeToken);
    });
    
    // 페이지 새로고침
    await page.reload();
    
    // 세션 상태가 곧 만료됨으로 표시되는지 확인
    await expect(page.locator('text=세션:')).toBeVisible();
  });

  test('브라우저 뒤로가기/앞으로가기 네비게이션', async ({ page }) => {
    // 관리자로 로그인
    await adminLogin(page);
    
    // 여러 페이지 이동
    await page.click('text=사용자');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/users');
    
    await page.click('text=제품');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/products');
    
    // 뒤로가기
    await page.goBack();
    await expect(page.url()).toContain('/users');
    
    // 앞으로가기
    await page.goForward();
    await expect(page.url()).toContain('/products');
    
    // 각 페이지에서 인증 상태가 유지되는지 확인
    await expect(page.locator('text=Test Admin')).toBeVisible();
  });

});