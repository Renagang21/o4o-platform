import { test, expect } from '@playwright/test';
test.describe('Smoke Test', () => {
    test('Admin Dashboard 페이지 로딩 확인', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Admin|Dashboard|O4O/);
        await expect(page.locator('body')).toBeVisible();
        console.log('✅ Admin Dashboard 기본 로딩 성공');
    });
    test('로그인 페이지 접근 확인', async ({ page }) => {
        await page.goto('/login');
        const loginForm = page.locator('form, [data-testid="login-form"], input[type="email"], input[name="email"]');
        await expect(loginForm.first()).toBeVisible({ timeout: 5000 });
        console.log('✅ 로그인 페이지 접근 성공');
    });
    test('네트워크 응답 확인', async ({ page }) => {
        const responses = [];
        page.on('response', response => {
            responses.push(`${response.status()} ${response.url()}`);
        });
        await page.goto('/');
        const successResponses = responses.filter(r => r.startsWith('200'));
        expect(successResponses.length).toBeGreaterThan(0);
        console.log('✅ 네트워크 응답 확인 완료');
        console.log('응답 목록:', responses.slice(0, 5));
    });
});
//# sourceMappingURL=smoke-test.spec.js.map