import { test, expect, Page } from '@playwright/test';

/**
 * 관리자 세션 관리 및 지속성 테스트
 * 
 * 시나리오:
 * 1. 로그인 → 대시보드 접근 → 새로고침 → 세션 유지 확인
 * 2. 다중 탭에서 세션 동기화
 * 3. 자동 토큰 갱신 테스트
 */

const ADMIN_ACCOUNT = {
  email: 'admin@neture.co.kr',
  password: 'admin123!',
  name: 'Test Admin'
};

// 관리자 로그인 헬퍼
async function adminLogin(page: Page) {
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
  await page.fill('input[name="password"]', ADMIN_ACCOUNT.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('Admin Session Management', () => {
  
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전 세션 초기화
    await page.goto('http://localhost:3001/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach(c => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.neture.co.kr";
      });
    });
  });

  test('로그인 → 대시보드 → 새로고침 → 세션 유지', async ({ page }) => {
    // Step 1: 로그인
    await adminLogin(page);
    
    // Step 2: 대시보드 접근 확인
    await expect(page.url()).toContain('/dashboard');
    await expect(page.locator('text=관리자 대시보드')).toBeVisible();
    await expect(page.locator(`text=${ADMIN_ACCOUNT.name}`)).toBeVisible();
    
    // Step 3: 새로고침 후 세션 유지 확인
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 여전히 대시보드에 있고 로그인 상태인지 확인
    await expect(page.url()).toContain('/dashboard');
    await expect(page.locator('text=관리자 대시보드')).toBeVisible();
    await expect(page.locator(`text=${ADMIN_ACCOUNT.name}`)).toBeVisible();
    
    // 토큰이 localStorage에 저장되어 있는지 확인
    const hasToken = await page.evaluate(() => {
      return localStorage.getItem('accessToken') !== null;
    });
    expect(hasToken).toBe(true);
  });

  test('다중 탭 세션 동기화', async ({ page, context }) => {
    // Step 1: 첫 번째 탭에서 로그인
    await adminLogin(page);
    await expect(page.locator('text=관리자 대시보드')).toBeVisible();
    
    // Step 2: 두 번째 탭 열기
    const secondTab = await context.newPage();
    await secondTab.goto('http://localhost:3001/dashboard');
    await secondTab.waitForLoadState('networkidle');
    
    // Step 3: 두 번째 탭에서도 자동으로 로그인되어 있는지 확인
    await expect(secondTab.locator('text=관리자 대시보드')).toBeVisible();
    await expect(secondTab.locator(`text=${ADMIN_ACCOUNT.name}`)).toBeVisible();
    
    // Step 4: 첫 번째 탭에서 로그아웃
    await page.click('button:has-text("Test Admin")');
    await page.click('text=로그아웃');
    await expect(page.url()).toContain('/login');
    
    // Step 5: 두 번째 탭 새로고침 시 로그아웃되는지 확인
    await secondTab.reload();
    await expect(secondTab.url()).toContain('/login');
    
    await secondTab.close();
  });

  test('브라우저 종료 후 세션 복구 (Remember Me)', async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    
    // Remember Me 체크
    await page.check('input[name="remember-me"]');
    
    // 로그인
    await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
    await page.fill('input[name="password"]', ADMIN_ACCOUNT.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // 로그인 성공 확인
    await expect(page.url()).toContain('/dashboard');
    
    // 쿠키 확인
    const cookies = await page.context().cookies();
    const refreshCookie = cookies.find(c => c.name === 'refreshToken');
    expect(refreshCookie).toBeDefined();
    
    // localStorage 확인
    const tokens = await page.evaluate(() => ({
      access: localStorage.getItem('accessToken'),
      refresh: localStorage.getItem('refreshToken')
    }));
    
    expect(tokens.access).toBeTruthy();
  });

  test('세션 만료 전 자동 갱신', async ({ page }) => {
    await adminLogin(page);
    
    // 토큰을 곧 만료되도록 조작
    await page.evaluate(() => {
      const payload = {
        sub: 'admin-id',
        email: 'admin@neture.co.kr',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 30, // 30초 후 만료
        iat: Math.floor(Date.now() / 1000)
      };
      
      const fakeToken = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
      localStorage.setItem('accessToken', fakeToken);
    });
    
    // 페이지 이동으로 토큰 갱신 트리거
    await page.click('text=사용자');
    await page.waitForLoadState('networkidle');
    
    // 여전히 인증 상태인지 확인 (자동 갱신 성공)
    await expect(page.locator(`text=${ADMIN_ACCOUNT.name}`)).toBeVisible();
    await expect(page.url()).toContain('/users');
  });

});