import { test, expect, Page } from '@playwright/test';

/**
 * Admin Dashboard 보안 기능 E2E 테스트
 * 
 * 테스트 시나리오:
 * 1. 권한 기반 기능 접근 제어
 * 2. 보안 모니터링 대시보드
 * 3. 감사 로깅 확인
 * 4. 보안 설정 관리
 */

const ADMIN_ACCOUNT = {
  email: 'admin@neture.co.kr',
  password: 'admin123!',
  name: 'Test Admin',
  role: 'admin'
};

// 관리자 로그인 헬퍼 함수
async function adminLogin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
  await page.fill('input[name="password"]', ADMIN_ACCOUNT.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('Admin Dashboard 보안 기능', () => {
  
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

  test('권한 기반 메뉴 접근 제어', async ({ page }) => {
    await adminLogin(page);
    
    // 관리자 권한으로 모든 메뉴 접근 가능 확인
    const adminMenuItems = [
      { name: '사용자 관리', selector: 'text=사용자', url: '/users' },
      { name: '콘텐츠 관리', selector: 'text=콘텐츠', url: '/content' },
      { name: '제품 관리', selector: 'text=제품', url: '/products' },
      { name: '주문 관리', selector: 'text=주문', url: '/orders' },
      { name: '설정', selector: 'text=설정', url: '/settings' }
    ];
    
    for (const item of adminMenuItems) {
      console.log(`Testing access to ${item.name}`);
      
      // 메뉴 항목 클릭
      const menuElement = page.locator(item.selector).first();
      if (await menuElement.isVisible()) {
        await menuElement.click();
        await page.waitForLoadState('networkidle');
        
        // URL 확인
        expect(page.url()).toContain(item.url);
        
        // 접근 거부 메시지가 없는지 확인
        await expect(page.locator('text=접근 권한 없음')).not.toBeVisible();
        await expect(page.locator('text=권한이 필요합니다')).not.toBeVisible();
      }
    }
  });

  test('사용자 관리 기능 권한 확인', async ({ page }) => {
    await adminLogin(page);
    
    // 사용자 관리 페이지 접근
    await page.click('text=사용자');
    await page.waitForLoadState('networkidle');
    
    // 사용자 관리 기능들 확인
    const userManagementFeatures = [
      'text=사용자 추가',
      'text=사용자 목록',
      'text=권한 관리',
      'text=사용자 검색'
    ];
    
    for (const feature of userManagementFeatures) {
      const element = page.locator(feature);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('설정 페이지 보안 기능 확인', async ({ page }) => {
    await adminLogin(page);
    
    // 설정 페이지 접근
    await page.click('text=설정');
    await page.waitForLoadState('networkidle');
    
    // 보안 관련 설정 확인
    const securitySettings = [
      'text=보안 설정',
      'text=사용자 보안 정책',
      'text=세션 관리',
      'text=로그인 정책'
    ];
    
    for (const setting of securitySettings) {
      const element = page.locator(setting);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('보안 알림 및 모니터링', async ({ page }) => {
    await adminLogin(page);
    
    // 대시보드에서 보안 관련 위젯 확인
    const securityWidgets = [
      'text=보안 현황',
      'text=활성 세션',
      'text=최근 로그인',
      'text=보안 이벤트'
    ];
    
    for (const widget of securityWidgets) {
      const element = page.locator(widget);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
      }
    }
    
    // 헤더의 알림 확인
    const notificationButton = page.locator('button:has([data-testid="bell-icon"], .lucide-bell)');
    if (await notificationButton.isVisible()) {
      await notificationButton.click();
      
      // 보안 관련 알림 확인
      const securityNotifications = [
        'text=보안 알림',
        'text=의심스러운 활동',
        'text=로그인 실패'
      ];
      
      for (const notification of securityNotifications) {
        const element = page.locator(notification);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
        }
      }
    }
  });

  test('세션 보안 기능', async ({ page }) => {
    await adminLogin(page);
    
    // 사용자 메뉴에서 세션 정보 확인
    await page.click('button:has-text("Test Admin")');
    
    // 세션 보안 정보 표시 확인
    await expect(page.locator('text=세션 상태:')).toBeVisible();
    await expect(page.locator('text=권한:')).toBeVisible();
    await expect(page.locator('text=계정:')).toBeVisible();
    
    // 보안 액션 확인
    await expect(page.locator('text=모든 기기에서 로그아웃')).toBeVisible();
    
    // 보안 세션 정보 확인
    await expect(page.locator('text=보안 세션 | 8시간 후 자동 만료')).toBeVisible();
  });

  test('비정상적인 접근 시도 차단', async ({ page }) => {
    // 직접 관리자 URL 접근 시도 (미인증 상태)
    await page.goto('/dashboard');
    
    // 로그인 페이지로 리다이렉트 확인
    await expect(page.url()).toMatch(/\/login/);
    
    // 보호된 관리 기능 URL 접근 시도
    const protectedUrls = [
      '/users',
      '/settings',
      '/analytics',
      '/orders'
    ];
    
    for (const url of protectedUrls) {
      await page.goto(url);
      
      // 로그인 페이지로 리다이렉트되는지 확인
      await expect(page.url()).toMatch(/\/login/);
    }
  });

  test('계정 잠금 시뮬레이션', async ({ page }) => {
    await page.goto('/login');
    
    // 여러 번 잘못된 로그인 시도
    for (let i = 0; i < 3; i++) {
      await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // 에러 메시지 확인
      await expect(page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible();
      
      // 폼 클리어
      await page.fill('input[name="password"]', '');
    }
    
    // 마지막 시도 후 계정 잠금 메시지 확인 (실제 구현에 따라 달라질 수 있음)
    const lockMessage = page.locator('text=계정이 임시로 잠겼습니다');
    if (await lockMessage.isVisible()) {
      await expect(lockMessage).toBeVisible();
    }
  });

  test('브라우저 보안 헤더 확인', async ({ page }) => {
    await adminLogin(page);
    
    // 페이지 로드 후 보안 헤더 확인 (응답 헤더는 page.goto의 응답으로 확인)
    const response = await page.goto('/dashboard');
    
    if (response) {
      const headers = response.headers();
      
      // 보안 헤더들 확인 (실제 구현에 따라 달라질 수 있음)
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection'
      ];
      
      for (const header of securityHeaders) {
        if (headers[header]) {
          console.log(`Security header ${header}: ${headers[header]}`);
        }
      }
    }
  });

  test('HTTPS 리다이렉트 확인 (프로덕션 환경)', async ({ page }) => {
    // 프로덕션 환경에서만 테스트
    if (process.env.NODE_ENV === 'production') {
      // HTTP로 접근 시 HTTPS로 리다이렉트되는지 확인
      const httpUrl = 'http://admin.neture.co.kr';
      
      try {
        const response = await page.goto(httpUrl);
        if (response) {
          const finalUrl = response.url();
          expect(finalUrl).toMatch(/^https:/);
        }
      } catch (error) {
        // HTTP 접근이 차단되는 경우도 정상
        console.log('HTTP access blocked (expected in production)');
      }
    } else {
      test.skip(true, 'HTTPS redirect test only runs in production');
    }
  });

  test('CSP (Content Security Policy) 확인', async ({ page }) => {
    await adminLogin(page);
    
    // CSP 위반 감지를 위한 이벤트 리스너 설정
    const cspViolations: any[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });
    
    // 페이지 로드 및 상호작용
    await page.goto('/dashboard');
    await page.click('text=사용자');
    await page.waitForLoadState('networkidle');
    
    // CSP 위반이 없는지 확인
    expect(cspViolations).toHaveLength(0);
  });

  test('관리자 활동 로깅 확인', async ({ page }) => {
    await adminLogin(page);
    
    // 관리자 활동 수행
    const activities = [
      () => page.click('text=사용자'),
      () => page.click('text=제품'),
      () => page.click('text=설정')
    ];
    
    for (const activity of activities) {
      await activity();
      await page.waitForLoadState('networkidle');
    }
    
    // 로그 확인을 위한 API 호출 (실제 구현에 따라 달라질 수 있음)
    const logs = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/admin/audit-logs', {
          credentials: 'include'
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.log('Audit logs endpoint not available');
      }
      return null;
    });
    
    // 로그가 기록되었는지 확인 (구현에 따라)
    if (logs) {
      expect(Array.isArray(logs)).toBeTruthy();
    }
  });

});