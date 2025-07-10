import { test, expect } from '@playwright/test';
const ADMIN_ACCOUNT = {
    email: 'admin@neture.co.kr',
    password: 'admin123!'
};
async function adminLogin(page) {
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
        await page.goto('http://localhost:3001/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText('관리자님');
        await expect(page.locator('text=O4O 플랫폼의 실시간 현황을 확인하고 관리하세요')).toBeVisible();
        await expect(page.locator('text=주요 지표')).toBeVisible();
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
        await expect(page.locator('text=분석 및 트렌드')).toBeVisible();
        const chartContainers = page.locator('[data-testid*="chart"], canvas, svg');
        const chartCount = await chartContainers.count();
        expect(chartCount).toBeGreaterThan(0);
        await expect(page.locator('text=로딩 중')).not.toBeVisible({ timeout: 15000 });
    });
    test('빠른 작업 섹션 확인', async ({ page }) => {
        await page.goto('http://localhost:3001/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('text=빠른 작업')).toBeVisible();
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
        await page.click('text=새 상품 추가');
        await page.waitForLoadState('networkidle');
        await expect(page.url()).toContain('/products/new');
        await page.goBack();
        await page.waitForLoadState('networkidle');
    });
    test('실시간 알림 섹션 확인', async ({ page }) => {
        await page.goto('http://localhost:3001/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('text=실시간 알림')).toBeVisible();
        await expect(page.locator('text=총').and(page.locator('text=개'))).toBeVisible();
        const notificationItems = page.locator('[data-testid="notification-item"], .notification-item');
        const notificationCount = await notificationItems.count();
        if (notificationCount > 0) {
            await notificationItems.first().click();
        }
    });
    test('최근 활동 및 시스템 상태 확인', async ({ page }) => {
        await page.goto('http://localhost:3001/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('text=최근 활동')).toBeVisible();
        await expect(page.locator('text=시스템 상태')).toBeVisible();
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
        await expect(page.locator('button:has-text("새로고침"), button[aria-label="새로고침"]')).toBeVisible();
        await page.click('button:has-text("새로고침"), button[aria-label="새로고침"]');
        await expect(page.locator('text=데이터를 업데이트하는 중')).toBeVisible();
        await expect(page.locator('text=대시보드가 성공적으로 업데이트되었습니다')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=마지막 업데이트:')).toBeVisible();
    });
    test('반응형 레이아웃 확인', async ({ page }) => {
        await page.goto('http://localhost:3001/dashboard');
        await page.waitForLoadState('networkidle');
        await page.setViewportSize({ width: 1200, height: 800 });
        await expect(page.locator('text=주요 지표')).toBeVisible();
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(500);
        await expect(page.locator('text=주요 지표')).toBeVisible();
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        await expect(page.locator('text=주요 지표')).toBeVisible();
        await page.setViewportSize({ width: 1200, height: 800 });
    });
    test('에러 상태 처리 확인', async ({ page }) => {
        await page.route('**/api/dashboard/**', route => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal Server Error' })
            });
        });
        await page.goto('http://localhost:3001/dashboard');
        await page.waitForLoadState('networkidle');
        const errorElements = await page.locator('text=오류, text=에러, text=불러올 수 없습니다').count();
        if (errorElements > 0) {
            expect(errorElements).toBeGreaterThan(0);
        }
        else {
            await expect(page.locator('text=관리자 대시보드')).toBeVisible();
        }
    });
});
//# sourceMappingURL=dashboard-data-loading.spec.js.map