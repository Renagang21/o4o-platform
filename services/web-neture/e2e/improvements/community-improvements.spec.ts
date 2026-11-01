import { test, expect } from '@playwright/test';
const id = '22222222-2222-4222-8222-222222222222';
for (const width of [1440, 390]) test(`community entry and direct public detail at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const item = { id, title: 'Synthetic public improvement', body: 'Synthetic public description', kind: 'bug', state: 'reviewing', version: 1, mine: false, canManage: false, createdAt: '2026-11-01T00:00:00Z', replies: [{ text: 'Synthetic official response', official: true, at: '2026-11-01T01:00:00Z' }] };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data } });
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname.endsWith('/auth/status')) return ok({ authenticated: false, user: null });
      if (url.pathname.endsWith('/auth/google/config')) return ok({ enabled: false, clientId: null });
      if (url.pathname.endsWith('/community/home')) return ok({ member: false, ...Object.fromEntries(['notice','news','forum','content','resource'].map(k => [k, { pinned: [], recent: [] }])) });
      if (url.pathname.endsWith(`/improvements/${id}`)) return ok(item);
      if (url.pathname.endsWith('/community/improvements')) return ok({ ready: true, canManage: false, items: [item], page: 1, hasMore: false });
      return route.fulfill({ status: 503, json: { code: 'UNEXPECTED_FIXTURE_API' } });
    }
    // Exercise the real host resolver without connecting to a live service.
    if (url.hostname === 'community.neture.co.kr' || url.hostname === '127.0.0.1') {
      const local = new URL(url.pathname + url.search, 'http://127.0.0.1:3103');
      const response = await route.fetch({ url: local.href, headers: { ...route.request().headers(), host: '127.0.0.1:3103' } });
      return route.fulfill({ response });
    }
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('link', { name: '업데이트 확인·개선 요청 →' }).click();
  await expect(page).toHaveURL(/community\.neture\.co\.kr:3103\/improvements$/);
  await expect(page.getByText('로그인 후 요청 작성')).toBeVisible();
  await page.getByText('Synthetic public improvement', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic public improvement' })).toBeVisible();
  await expect(page.getByText('Synthetic official response', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '답변·상태 저장' })).toHaveCount(0);
  await page.goto(`/improvements/${id}`);
  await expect(page.getByText('Synthetic public description', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
