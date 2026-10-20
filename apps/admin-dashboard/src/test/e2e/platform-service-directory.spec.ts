import { test, expect, type Page } from '@playwright/test';

const entries = [
  { id: 'pharmacy', name: 'O4O 약국 경영지원', description: 'O4O를 이용하는 약국 내에서의 업무를 지원하는 약국 개설자 서비스', group: 'services', kind: '약국 협력사업', url: 'https://pharmacy.neture.co.kr', state: 'active' },
  { id: 'carepharm', name: 'CarePharm · 만성질환관리', description: '만성질환관리 협력사업', group: 'services', kind: '약국 협력사업', url: 'https://carepharm.neture.co.kr', state: 'missing' },
  { id: 'megapharm', name: 'MegaPharm · 창고형약국', description: '창고형 약국 협력사업', group: 'services', kind: '약국 협력사업', url: 'https://megapharm.neture.co.kr', state: 'closed' },
  { id: 'pharmcoop', name: '약국·약사 협동조합', description: '개별 조합은 서비스에서 관리', group: 'services', kind: '협동조합 연합회', url: 'https://pharmcoop.neture.co.kr', state: 'federation' },
  { id: 'kpa-branch', name: '약사회 분회', description: '분회 홈페이지와 회원 활동', group: 'services', kind: '독립 서비스', url: 'https://kpa.neture.co.kr', state: 'configured' },
  { id: 'store', name: '내 매장', description: '매장 경영자의 공통 업무', group: 'spaces', kind: '매장 업무 공간', url: 'https://store.neture.co.kr', state: 'configured' },
  { id: 'partner', name: 'O4O Partner', description: '준비 중 서비스 안내', group: 'other', kind: '준비 중', url: 'https://neture.co.kr/services/partner', state: 'planned' },
];
async function mockApi(page: Page, roles: string[] | null = ['platform:super_admin']) {
  let failed = false;
  let directoryReads = 0;
  const writes: string[] = [];
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() !== 'GET') writes.push(path);
    const json = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    if (path === '/api/v1/auth/status') return json({ success: true, data: { authenticated: roles !== null, user: roles && {
      id: 'fixture-admin', email: 'admin@example.invalid', name: 'Fixture Admin', roles, status: 'active', authMethod: 'google',
    } } });
    if (path === '/api/v1/auth/google/config') return json({ success: true, data: { enabled: false, clientId: null } });
    if (path === '/api/v1/admin/pending-tasks/summary') return json({ success: true, data: { total: 0, productRegistrationRequests: 0, manualReviews: 0 } });
    if (path === '/api/v1/admin/platform-accounts') return json({ success: true, data: [] });
    if (path === '/api/v1/admin/platform-services/directory') {
      directoryReads++;
      return failed ? json({ success: false, error: '현재 서비스 목록을 불러오지 못했습니다.' }, 503) : json({ success: true, data: entries });
    }
    return json({ success: false, error: 'Unmocked test API' }, 404);
  });
  return { writes, fail: (value: boolean) => { failed = value; }, reads: () => directoryReads };
}
for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test('navigates from existing tabs, searches current domains and survives refresh', async ({ page }) => {
      const api = await mockApi(page);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/admin/platform/accounts');
      await page.getByRole('link', { name: '서비스 관리', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/platform\/services$/);
      await expect(page.getByRole('heading', { name: 'CarePharm · 만성질환관리', exact: true })).toBeVisible();
      await expect(page.getByText('사업 미등록', { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: /pharmcoop.neture.co.kr/ })).toHaveAttribute('href', 'https://pharmcoop.neture.co.kr');
      await expect(page.getByRole('link', { name: /kpa.neture.co.kr/ })).toHaveAttribute('href', 'https://kpa.neture.co.kr');
      await page.getByRole('textbox', { name: '서비스명 또는 주소 검색' }).fill('CAREPHARM.NETURE');
      await expect(page.getByRole('heading', { level: 3 })).toHaveCount(1);
      await page.getByRole('combobox', { name: '구분' }).selectOption('spaces');
      await expect(page.getByText('검색 조건에 맞는 서비스가 없습니다.')).toBeVisible();
      await page.getByRole('textbox').fill('');
      await expect(page.getByRole('heading', { name: '내 매장', exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', { name: 'O4O 약국 경영지원', exact: true })).toBeVisible();
      await expect(page.getByText('O4O를 이용하는 약국 내에서의 업무를 지원하는 약국 개설자 서비스', { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: /neture.co.kr\/services\/partner/ })).toHaveAttribute('href', 'https://neture.co.kr/services/partner');
      const main = page.locator('main');
      expect(await main.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      expect(api.writes).toEqual([]);
      expect(errors).toEqual([]);
      await page.screenshot({ path: test.info().outputPath('directory.png'), fullPage: true });
    });
    test('keeps failed reads visible and retries without fabricating business state', async ({ page }) => {
      const api = await mockApi(page);
      api.fail(true);
      await page.goto('/admin/platform/services');
      await expect(page.getByRole('alert').filter({ hasText: '현재 서비스 목록을 불러오지 못했습니다.' })).toBeVisible();
      await expect(page.getByText('사업 미등록', { exact: true })).toHaveCount(0);
      api.fail(false);
      await page.getByRole('button', { name: '다시 불러오기' }).click();
      await expect(page.getByRole('heading', { name: 'CarePharm · 만성질환관리', exact: true })).toBeVisible();
      expect(api.reads()).toBeGreaterThanOrEqual(2);
      expect(api.writes).toEqual([]);
    });
  });
}

test('service operators cannot read the platform directory', async ({ page }) => {
  const api = await mockApi(page, ['neture:operator']);
  await page.goto('/admin/platform/services');
  await expect(page.getByRole('heading', { name: '접근 권한이 없습니다' })).toBeVisible();
  expect(api.reads()).toBe(0);
});
test('anonymous users are directed to the existing Google login', async ({ page }) => {
  const api = await mockApi(page, null);
  await page.goto('/admin/platform/services');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: '관리자 로그인', exact: true })).toBeVisible();
  expect(api.reads()).toBe(0);
});
