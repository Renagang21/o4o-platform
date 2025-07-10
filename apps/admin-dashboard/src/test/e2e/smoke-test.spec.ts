import { test, expect } from '@playwright/test';

/**
 * Smoke Test - 기본적인 연결성 및 페이지 로딩 테스트
 * 시스템 의존성 문제가 있을 경우 기본 동작 확인용
 */

test.describe('Smoke Test', () => {
  
  test('Admin Dashboard 페이지 로딩 확인', async ({ page }) => {
    // 기본 페이지 접근
    await page.goto('/');
    
    // 페이지가 로딩되는지 확인
    await expect(page).toHaveTitle(/Admin|Dashboard|O4O/);
    
    // HTML 구조가 있는지 확인
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Admin Dashboard 기본 로딩 성공');
  });

  test('로그인 페이지 접근 확인', async ({ page }) => {
    // 로그인 페이지 직접 접근
    await page.goto('/login');
    
    // 로그인 페이지 요소 확인
    const loginForm = page.locator('form, [data-testid="login-form"], input[type="email"], input[name="email"]');
    await expect(loginForm.first()).toBeVisible({ timeout: 5000 });
    
    console.log('✅ 로그인 페이지 접근 성공');
  });

  test('네트워크 응답 확인', async ({ page }) => {
    // 네트워크 요청 모니터링
    const responses: string[] = [];
    
    page.on('response', response => {
      responses.push(`${response.status()} ${response.url()}`);
    });
    
    await page.goto('/');
    
    // 최소한 200 응답이 있는지 확인
    const successResponses = responses.filter(r => r.startsWith('200'));
    expect(successResponses.length).toBeGreaterThan(0);
    
    console.log('✅ 네트워크 응답 확인 완료');
    console.log('응답 목록:', responses.slice(0, 5)); // 처음 5개만 로깅
  });

});