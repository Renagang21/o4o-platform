import { test, expect, type Page } from '@playwright/test';

async function mockApi(page: Page, roles: string[] | null = ['platform:super_admin']) {
  const retiredReads: string[] = [];
  const writes: string[] = [];
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() !== 'GET') writes.push(path);
    const json = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    if (/service-audience|platform-services|operator\/roles/.test(path)) retiredReads.push(path);
    if (path === '/api/v1/auth/status') return json({ success: true, data: { authenticated: roles !== null, user: roles && {
      id: 'fixture-admin', email: 'admin@example.invalid', name: 'Fixture Admin', roles, status: 'active', authMethod: 'google',
    } } });
    if (path === '/api/v1/auth/google/config') return json({ success: true, data: { enabled: false, clientId: null } });
    if (path === '/api/v1/admin/pending-tasks/summary') return json({ success: true, data: { total: 0, productRegistrationRequests: 0, manualReviews: 0 } });
    if (path === '/api/v1/admin/platform-accounts') return json({ success: true, data: [] });
    if (path === '/api/v1/admin/users') return json({ success: true, users: [{ id: 'historical-kpa-admin', name: 'Historical KPA Admin', roles: ['kpa:admin'], isActive: true }] });
    if (path === '/api/v1/admin/service-operator-invitations') return json({ success: true, data: [] });
    if (path === '/api/v1/neture/admin/semi-franchises') return json({ success: true, data: [] });
    if (path === '/api/v1/admin/platform-users') return json({ success: true, data: [], pagination: { total: 0, totalPages: 1, page: 1, limit: 20 } });
    if (path === '/api/v1/admin/users/erasure-capabilities') return json({ success: true, data: { enabled: false } });
    return json({ success: false, error: 'Unmocked test API' }, 404);
  });
  return { writes, retiredReads };
}
for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test('remaining navigation and old bookmarks work after refresh without retired API calls', async ({ page }) => {
      test.setTimeout(60_000);
      const api = await mockApi(page);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/admin/platform');
      const nav = page.getByRole('navigation', { name: '플랫폼 관리 메뉴' });
      await expect(nav.getByRole('link')).toHaveText(['플랫폼 홈', '전체 관리자 계정', '사용자 조회']);
      await expect(page.getByRole('link', { name: /서비스 관리자·운영자/ })).toHaveAttribute('href', '/operators');
      await page.getByRole('link', { name: '중앙 운영 담당자 지정', exact: true }).click();
      // OperatorsPage is lazy loaded; a cold development build needs longer than the default 5 seconds.
      await expect(page.getByRole('heading', { name: '중앙 운영 담당자 지정', exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('radio', { name: /Neture/ })).toBeVisible();
      await expect(page.getByRole('radio', { name: /약국 경영지원|kpa-society|드럭스토어형 약국|CarePharm/ })).toHaveCount(0);
      await page.getByRole('radio', { name: /Neture/ }).check();
      await page.getByRole('radio', { name: /^Admin/ }).check();
      await expect(page.getByRole('group', { name: '위임할 운영 업무' })).toBeVisible();
      await page.getByRole('button', { name: '담당자 지정 창 닫기' }).click();
      await expect(page).toHaveURL(/\/operators$/);
      await expect(page.getByText('Historical KPA Admin', { exact: true })).toBeVisible();
      await page.getByTitle('더보기', { exact: true }).click();
      await expect(page.getByRole('button', { name: '권한 해제 (Admin)', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '서비스 담당자 지정' }).click();
      await expect(page.getByRole('radio', { name: /분회/ })).toBeVisible();
      await expect(page.getByRole('radio', { name: /드럭스토어형 약국/ })).toBeVisible();
      await expect(page.getByRole('radio', { name: /약국 경영지원|kpa-society/ })).toHaveCount(0);
      await page.getByRole('button', { name: '담당자 지정 창 닫기' }).click();
      await page.goto('/admin/platform');
      await nav.getByRole('link', { name: '전체 관리자 계정', exact: true }).click();
      await expect(page.getByRole('heading', { name: '전체 관리자 계정', exact: true })).toBeVisible();
      await page.goto('/admin/platform/users');
      await expect(page.getByRole('heading', { name: '전체 사용자 조회', exact: true })).toBeVisible();
      for (const old of ['/admin/platform/services', '/admin/platform/roles', '/admin/platform/service-audience', '/admin/settings/service-audience']) {
        await page.goto(old);
        await expect(page).toHaveURL(/\/admin\/platform$/);
        await expect(page.getByRole('heading', { name: 'O4O 플랫폼 관리', exact: true })).toBeVisible();
        await page.reload();
        await expect(nav.getByRole('link')).toHaveCount(3);
      }
      expect(api.retiredReads).toEqual([]);
      expect(api.writes).toEqual([]);
      expect(errors).toEqual([]);
      expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: test.info().outputPath('platform-cleanup.png'), fullPage: true });
    });
  });
}
test('service operator cannot enter platform administration via an old bookmark', async ({ page }) => {
  const api = await mockApi(page, ['neture:operator']);
  await page.goto('/admin/platform/roles');
  await expect(page.getByRole('heading', { name: '접근 권한이 없습니다' })).toBeVisible();
  expect(api.retiredReads).toEqual([]);
});
test('anonymous old bookmarks retain the Google login boundary', async ({ page }) => {
  const api = await mockApi(page, null);
  await page.goto('/admin/platform/service-audience');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: '관리자 로그인', exact: true })).toBeVisible();
  expect(api.retiredReads).toEqual([]);
});
