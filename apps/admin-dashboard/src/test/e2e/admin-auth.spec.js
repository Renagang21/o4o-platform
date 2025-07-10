import { test, expect } from '@playwright/test';
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
async function adminLogin(page, account = TEST_ACCOUNTS.admin) {
    await page.goto('/login');
    await page.fill('input[name="email"]', account.email);
    await page.fill('input[name="password"]', account.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
}
async function userLogin(page) {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ACCOUNTS.user.email);
    await page.fill('input[name="password"]', TEST_ACCOUNTS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
}
test.describe('Admin Dashboard SSO 인증 시스템', () => {
    test.beforeEach(async ({ page }) => {
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
        await expect(page).toHaveTitle(/O4O Admin/);
        await expect(page.locator('text=O4O Admin')).toBeVisible();
        await expect(page.locator('text=관리자 계정으로 로그인하세요')).toBeVisible();
        await expect(page.locator('text=새로운 SSO 인증 시스템')).toBeVisible();
        await expect(page.locator('text=관리자 전용 보안 강화')).toBeVisible();
        if (process.env.NODE_ENV !== 'production') {
            await expect(page.locator('text=개발 환경 - 관리자 테스트 계정')).toBeVisible();
            await expect(page.locator('text=admin@neture.co.kr')).toBeVisible();
        }
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        await expect(page.locator('text=보안 안내')).toBeVisible();
        await expect(page.locator('text=세션은 8시간 후 자동 만료됩니다')).toBeVisible();
    });
    test('관리자 SSO 로그인 성공 플로우', async ({ page }) => {
        await adminLogin(page);
        await expect(page.url()).toMatch(/\/dashboard/);
        await expect(page.locator('text=관리자 대시보드')).toBeVisible();
        await expect(page.locator('text=O4O 플랫폼 통합 관리 시스템 (SSO)')).toBeVisible();
        await expect(page.locator('text=Test Admin')).toBeVisible();
        await expect(page.locator('text=세션: 활성')).toBeVisible();
        if (process.env.NODE_ENV !== 'production') {
            await expect(page.locator('text=Role: admin')).toBeVisible();
            await expect(page.locator('text=Auth: SSO Admin')).toBeVisible();
        }
    });
    test('일반 사용자 관리자 페이지 접근 차단', async ({ page }) => {
        await userLogin(page);
        await expect(page.locator('text=접근 권한 없음')).toBeVisible();
        await expect(page.locator('text=관리자 권한이 필요합니다')).toBeVisible();
        await expect(page.locator('text=메인 사이트로 이동')).toBeVisible();
    });
    test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'wrong@example.com');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible();
        await expect(page.url()).toMatch(/\/login/);
    });
    test('관리자 권한 확인 및 메뉴 접근', async ({ page }) => {
        await adminLogin(page);
        await expect(page.locator('text=대시보드')).toBeVisible();
        await expect(page.locator('text=사용자')).toBeVisible();
        await expect(page.locator('text=콘텐츠')).toBeVisible();
        await expect(page.locator('text=제품')).toBeVisible();
        await expect(page.locator('text=주문')).toBeVisible();
        await expect(page.locator('text=분석')).toBeVisible();
        await expect(page.locator('text=설정')).toBeVisible();
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
        await adminLogin(page);
        await page.click('button:has-text("Test Admin")');
        await expect(page.locator('text=Test Admin')).toBeVisible();
        await expect(page.locator('text=admin@neture.co.kr')).toBeVisible();
        await expect(page.locator('text=역할: admin | SSO 인증')).toBeVisible();
        await expect(page.locator('text=세션 상태:')).toBeVisible();
        await expect(page.locator('text=권한: 활성')).toBeVisible();
        await expect(page.locator('text=계정: 승인됨')).toBeVisible();
        await expect(page.locator('text=프로필 설정')).toBeVisible();
        await expect(page.locator('text=계정 설정')).toBeVisible();
        await expect(page.locator('text=모든 기기에서 로그아웃')).toBeVisible();
        await expect(page.locator('text=로그아웃')).toBeVisible();
        await expect(page.locator('text=보안 세션 | 8시간 후 자동 만료')).toBeVisible();
    });
    test('로그아웃 플로우', async ({ page }) => {
        await adminLogin(page);
        await page.click('button:has-text("Test Admin")');
        await page.click('text=로그아웃');
        await expect(page.url()).toMatch(/\/login/);
        await expect(page.locator('text=O4O Admin')).toBeVisible();
        await page.goto('/dashboard');
        await expect(page.url()).toMatch(/\/login/);
    });
    test('모든 기기에서 로그아웃 기능', async ({ page, context }) => {
        await adminLogin(page);
        const secondTab = await context.newPage();
        await secondTab.goto('/dashboard');
        await expect(secondTab.locator('text=관리자 대시보드')).toBeVisible();
        await page.click('button:has-text("Test Admin")');
        await page.click('text=모든 기기에서 로그아웃');
        await expect(page.url()).toMatch(/\/login/);
        await secondTab.reload();
        await expect(secondTab.url()).toMatch(/\/login/);
        await secondTab.close();
    });
    test('Remember Me 기능', async ({ page }) => {
        await page.goto('/login');
        await page.check('input[name="remember-me"]');
        await page.fill('input[name="email"]', TEST_ACCOUNTS.admin.email);
        await page.fill('input[name="password"]', TEST_ACCOUNTS.admin.password);
        await page.click('button[type="submit"]');
        await expect(page.url()).toMatch(/\/dashboard/);
        const cookies = await page.context().cookies();
        const refreshCookie = cookies.find(c => c.name === 'refreshToken');
        if (refreshCookie) {
            expect(refreshCookie.expires).toBeGreaterThan(Date.now() / 1000);
        }
    });
    test('세션 만료 경고 시뮬레이션', async ({ page }) => {
        await adminLogin(page);
        await page.evaluate(() => {
            const payload = {
                sub: 'admin-id',
                email: 'admin@neture.co.kr',
                role: 'admin',
                exp: Math.floor(Date.now() / 1000) + 300,
                iat: Math.floor(Date.now() / 1000)
            };
            const fakeToken = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
            localStorage.setItem('accessToken', fakeToken);
        });
        await page.reload();
        await expect(page.locator('text=세션:')).toBeVisible();
    });
    test('브라우저 뒤로가기/앞으로가기 네비게이션', async ({ page }) => {
        await adminLogin(page);
        await page.click('text=사용자');
        await page.waitForLoadState('networkidle');
        await expect(page.url()).toContain('/users');
        await page.click('text=제품');
        await page.waitForLoadState('networkidle');
        await expect(page.url()).toContain('/products');
        await page.goBack();
        await expect(page.url()).toContain('/users');
        await page.goForward();
        await expect(page.url()).toContain('/products');
        await expect(page.locator('text=Test Admin')).toBeVisible();
    });
});
//# sourceMappingURL=admin-auth.spec.js.map