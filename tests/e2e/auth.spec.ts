import { test, expect } from '@playwright/test';

/**
 * 사용자 인증 워크플로우 E2E 테스트
 * 회원가입, 로그인, 로그아웃 플로우 테스트
 */
test.describe('사용자 인증 워크플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 홈페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('회원가입 전체 플로우', async ({ page }) => {
    // 회원가입 페이지로 이동
    await page.click('[data-testid="signup-link"]');
    await expect(page).toHaveURL('/signup');

    // 회원가입 폼 작성
    await page.fill('[data-testid="signup-email"]', `test${Date.now()}@example.com`);
    await page.fill('[data-testid="signup-password"]', 'Test123456!');
    await page.fill('[data-testid="signup-confirm-password"]', 'Test123456!');
    await page.fill('[data-testid="signup-name"]', 'Test User');

    // 이용약관 동의
    await page.check('[data-testid="terms-agreement"]');
    await page.check('[data-testid="privacy-agreement"]');

    // 회원가입 버튼 클릭
    await page.click('[data-testid="signup-submit"]');

    // 성공 메시지 확인
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('회원가입이 완료되었습니다');

    // 로그인 페이지로 자동 이동 확인
    await expect(page).toHaveURL('/login');
  });

  test('로그인 성공 플로우', async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login');

    // 로그인 폼 작성
    await page.fill('[data-testid="login-email"]', 'test@o4o-platform.com');
    await page.fill('[data-testid="login-password"]', 'test123456');

    // 로그인 버튼 클릭
    await page.click('[data-testid="login-submit"]');

    // 대시보드로 이동 확인
    await expect(page).toHaveURL('/dashboard');
    
    // 사용자 정보 표시 확인
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    // 잘못된 이메일/비밀번호로 로그인 시도
    await page.fill('[data-testid="login-email"]', 'wrong@example.com');
    await page.fill('[data-testid="login-password"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');

    // 에러 메시지 확인
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('이메일 또는 비밀번호가 잘못되었습니다');

    // 로그인 페이지에 머물러 있는지 확인
    await expect(page).toHaveURL('/login');
  });

  test('로그아웃 플로우', async ({ page }) => {
    // 먼저 로그인
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', 'test@o4o-platform.com');
    await page.fill('[data-testid="login-password"]', 'test123456');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL('/dashboard');

    // 사용자 메뉴 클릭
    await page.click('[data-testid="user-menu"]');
    
    // 로그아웃 버튼 클릭
    await page.click('[data-testid="logout-button"]');

    // 홈페이지로 이동 확인
    await expect(page).toHaveURL('/');
    
    // 로그인 링크가 다시 표시되는지 확인
    await expect(page.locator('[data-testid="login-link"]')).toBeVisible();
  });

  test('비밀번호 재설정 플로우', async ({ page }) => {
    await page.goto('/login');

    // 비밀번호 찾기 링크 클릭
    await page.click('[data-testid="forgot-password-link"]');
    await expect(page).toHaveURL('/forgot-password');

    // 이메일 입력
    await page.fill('[data-testid="reset-email"]', 'test@o4o-platform.com');
    await page.click('[data-testid="reset-submit"]');

    // 성공 메시지 확인
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('비밀번호 재설정 이메일을 발송했습니다');
  });

  test('폼 유효성 검증', async ({ page }) => {
    await page.goto('/signup');

    // 빈 폼으로 제출 시도
    await page.click('[data-testid="signup-submit"]');

    // 각 필드의 에러 메시지 확인
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();

    // 잘못된 이메일 형식
    await page.fill('[data-testid="signup-email"]', 'invalid-email');
    await page.blur('[data-testid="signup-email"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('올바른 이메일 형식을 입력하세요');

    // 짧은 비밀번호
    await page.fill('[data-testid="signup-password"]', '123');
    await page.blur('[data-testid="signup-password"]');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('비밀번호는 최소 8자 이상이어야 합니다');

    // 비밀번호 확인 불일치
    await page.fill('[data-testid="signup-password"]', 'Test123456!');
    await page.fill('[data-testid="signup-confirm-password"]', 'Different123!');
    await page.blur('[data-testid="signup-confirm-password"]');
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('비밀번호가 일치하지 않습니다');
  });
});
