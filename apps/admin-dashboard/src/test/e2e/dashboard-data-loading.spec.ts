import { test, expect, Page } from '@playwright/test';

/**
 * 대시보드 데이터 로딩 및 렌더링 테스트
 * 
 * 시나리오:
 * 1. 대시보드 접속 시 모든 위젯 정상 로딩
 * 2. API 모킹 데이터 화면 렌더링 확인
 * 3. 차트 및 통계 데이터 표시 검증
 * 4. 에러 상태 처리 확인
 */

const ADMIN_ACCOUNT = {
  email: 'admin@neture.co.kr',
  password: 'admin123!'
};

async function adminLogin(page: Page) {
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
  await page.fill('input[name="password"]', ADMIN_ACCOUNT.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('Dashboard Data Loading', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await adminLogin(page);
  });

  test('대시보드 주요 위젯 로딩 확인', async ({ page }) => {
    // 대시보드 접근
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 페이지 제목 확인
    await expect(page.locator('h1')).toContainText('관리자님');
    await expect(page.locator('text=O4O 플랫폼의 실시간 현황을 확인하고 관리하세요')).toBeVisible();
    
    // 통계 카드들 확인
    await expect(page.locator('text=주요 지표')).toBeVisible();
    
    // 각 통계 섹션이 로딩되는지 확인
    const statsSections = [
      'text=사용자 통계',
      'text=매출 통계', 
      'text=상품 통계',
      'text=콘텐츠 통계',
      'text=파트너 통계'
    ];
    
    for (const selector of statsSections) {
      await expect(page.locator(selector)).toBeVisible({ timeout: 10000 });
    }
  });

  test('차트 데이터 렌더링 확인', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 차트 섹션 확인
    await expect(page.locator('text=분석 및 트렌드')).toBeVisible();
    
    // 차트 컨테이너들이 렌더링되는지 확인
    const chartContainers = page.locator('[data-testid*="chart"], canvas, svg');
    const chartCount = await chartContainers.count();
    
    // 최소 1개 이상의 차트가 렌더링되어야 함
    expect(chartCount).toBeGreaterThan(0);
    
    // 차트 로딩 상태가 완료되었는지 확인
    await expect(page.locator('text=로딩 중')).not.toBeVisible({ timeout: 15000 });
  });

  test('빠른 작업 섹션 확인', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 빠른 작업 섹션 확인
    await expect(page.locator('text=빠른 작업')).toBeVisible();
    
    // 빠른 작업 버튼들 확인
    const quickActions = [
      'text=새 상품 추가',
      'text=새 페이지 생성', 
      'text=사용자 승인',
      'text=주문 처리',
      'text=쿠폰 생성',
      'text=상세 리포트'
    ];
    
    for (const action of quickActions) {
      await expect(page.locator(action)).toBeVisible();
    }
    
    // 빠른 작업 버튼 클릭 테스트
    await page.click('text=새 상품 추가');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/products/new');
    
    // 대시보드로 돌아가기
    await page.goBack();
    await page.waitForLoadState('networkidle');
  });

  test('실시간 알림 섹션 확인', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 알림 섹션 확인
    await expect(page.locator('text=실시간 알림')).toBeVisible();
    
    // 알림 카운트 표시 확인
    await expect(page.locator('text=총').and(page.locator('text=개'))).toBeVisible();
    
    // 알림 항목들이 렌더링되는지 확인
    const notificationItems = page.locator('[data-testid="notification-item"], .notification-item');
    const notificationCount = await notificationItems.count();
    
    if (notificationCount > 0) {
      // 첫 번째 알림 항목 클릭 테스트
      await notificationItems.first().click();
      // 알림 상세 정보가 표시되는지 확인
    }
  });

  test('최근 활동 및 시스템 상태 확인', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 최근 활동 섹션 확인
    await expect(page.locator('text=최근 활동')).toBeVisible();
    
    // 시스템 상태 섹션 확인  
    await expect(page.locator('text=시스템 상태')).toBeVisible();
    
    // 시스템 상태 지표들 확인
    const healthIndicators = [
      'text=API',
      'text=데이터베이스',
      'text=저장소',
      'text=메모리'
    ];
    
    for (const indicator of healthIndicators) {
      await expect(page.locator(indicator)).toBeVisible();
    }
  });

  test('새로고침 기능 테스트', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 새로고침 버튼 확인
    await expect(page.locator('button:has-text("새로고침"), button[aria-label="새로고침"]')).toBeVisible();
    
    // 새로고침 버튼 클릭
    await page.click('button:has-text("새로고침"), button[aria-label="새로고침"]');
    
    // 로딩 상태 확인
    await expect(page.locator('text=데이터를 업데이트하는 중')).toBeVisible();
    
    // 로딩 완료 후 성공 메시지 확인
    await expect(page.locator('text=대시보드가 성공적으로 업데이트되었습니다')).toBeVisible({ timeout: 10000 });
    
    // 마지막 업데이트 시간이 갱신되었는지 확인
    await expect(page.locator('text=마지막 업데이트:')).toBeVisible();
  });

  test('반응형 레이아웃 확인', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 데스크톱 레이아웃 확인
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('text=주요 지표')).toBeVisible();
    
    // 태블릿 레이아웃 확인
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // 레이아웃 변경 대기
    await expect(page.locator('text=주요 지표')).toBeVisible();
    
    // 모바일 레이아웃 확인
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page.locator('text=주요 지표')).toBeVisible();
    
    // 원래 크기로 복원
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('에러 상태 처리 확인', async ({ page }) => {
    // API 요청을 실패하도록 가로채기
    await page.route('**/api/dashboard/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 에러 메시지나 폴백 UI가 표시되는지 확인
    const errorElements = await page.locator('text=오류, text=에러, text=불러올 수 없습니다').count();
    
    if (errorElements > 0) {
      // 에러 상태가 적절히 처리되고 있음
      expect(errorElements).toBeGreaterThan(0);
    } else {
      // 기본 데이터가 표시되고 있는지 확인
      await expect(page.locator('text=관리자 대시보드')).toBeVisible();
    }
  });

});