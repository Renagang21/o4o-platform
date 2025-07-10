import { test, expect } from '@playwright/test';
const ADMIN_ACCOUNT = {
    email: 'admin@neture.co.kr',
    password: 'admin123!',
    name: 'Test Admin'
};
async function adminLogin(page) {
    await page.goto('http://localhost:3001/login');
    await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
    await page.fill('input[name="password"]', ADMIN_ACCOUNT.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
}
test.describe('Admin Session Management', () => {
    test.beforeEach(async ({ page }) => {
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
        await adminLogin(page);
        await expect(page.url()).toContain('/dashboard');
        await expect(page.locator('text=관리자 대시보드')).toBeVisible();
        await expect(page.locator(`text=${ADMIN_ACCOUNT.name}`)).toBeVisible();
        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(page.url()).toContain('/dashboard');
        await expect(page.locator('text=관리자 대시보드')).toBeVisible();
        await expect(page.locator(`text=${ADMIN_ACCOUNT.name}`)).toBeVisible();
        const hasToken = await page.evaluate(() => {
            return localStorage.getItem('accessToken') !== null;
        });
        expect(hasToken).toBe(true);
    });
    test('다중 탭 세션 동기화', async ({ page, context }) => {
        await adminLogin(page);
        await expect(page.locator('text=관리자 대시보드')).toBeVisible();
        const secondTab = await context.newPage();
        await secondTab.goto('http://localhost:3001/dashboard');
        await secondTab.waitForLoadState('networkidle');
        await expect(secondTab.locator('text=관리자 대시보드')).toBeVisible();
        await expect(secondTab.locator(`text=${ADMIN_ACCOUNT.name}`)).toBeVisible();
        await page.click('button:has-text("Test Admin")');
        await page.click('text=로그아웃');
        await expect(page.url()).toContain('/login');
        await secondTab.reload();
        await expect(secondTab.url()).toContain('/login');
        await secondTab.close();
    });
    test('브라우저 종료 후 세션 복구 (Remember Me)', async ({ page }) => {
        await page.goto('http://localhost:3001/login');
        await page.check('input[name="remember-me"]');
        await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
        await page.fill('input[name="password"]', ADMIN_ACCOUNT.password);
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        await expect(page.url()).toContain('/dashboard');
        const cookies = await page.context().cookies();
        const refreshCookie = cookies.find(c => c.name === 'refreshToken');
        expect(refreshCookie).toBeDefined();
        const tokens = await page.evaluate(() => ({
            access: localStorage.getItem('accessToken'),
            refresh: localStorage.getItem('refreshToken')
        }));
        expect(tokens.access).toBeTruthy();
    });
    test('세션 만료 전 자동 갱신', async ({ page }) => {
        await adminLogin(page);
        await page.evaluate(() => {
            const payload = {
                sub: 'admin-id',
                email: 'admin@neture.co.kr',
                role: 'admin',
                exp: Math.floor(Date.now() / 1000) + 30,
                iat: Math.floor(Date.now() / 1000)
            };
            const fakeToken = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
            localStorage.setItem('accessToken', fakeToken);
        });
        await page.click('text=사용자');
        await page.waitForLoadState('networkidle');
        await expect(page.locator(`text=${ADMIN_ACCOUNT.name}`)).toBeVisible();
        await expect(page.url()).toContain('/users');
    });
});
//# sourceMappingURL=admin-session-management.spec.js.map