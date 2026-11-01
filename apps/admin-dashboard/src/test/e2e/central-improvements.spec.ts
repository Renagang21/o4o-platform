import { test, expect, type Page } from '@playwright/test';
const id = '11111111-1111-4111-8111-111111111111';
async function fixture(page: Page) {
  let item = { id, title: 'Synthetic improvement request', body: 'Synthetic reproduction without personal information', kind: 'bug', state: 'received', version: 1, createdAt: '2026-11-01T00:00:00Z', mine: false, canManage: true, replies: [] as { text: string; official: boolean; at: string }[] };
  const writes: unknown[] = [];
  const user = { id: 'synthetic-reviewer', email: 'reviewer@example.invalid', name: '합성 담당자', roles: ['community:operator'], status: 'active', isActive: true, isEmailVerified: true, authMethod: 'google' };
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url()), path = url.pathname;
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data } });
    if (path === '/api/v1/auth/status') return ok({ authenticated: true, user });
    if (path === '/api/v1/auth/me') return ok(user);
    if (path === '/api/v1/auth/google/config') return ok({ enabled: false, clientId: null });
    if (path === '/api/v1/operator/central-access') return ok({ roles: ['community:operator'], menuKeys: ['community.forums'] });
    if (path.endsWith('/central-access/notifications')) return ok({ notifications: [], unreadCount: 0 });
    if (path.endsWith('/central-access/overview')) return ok({ tasks: [], generatedAt: new Date().toISOString() });
    if (path === '/api/v1/communities/community/improvements') return ok({ ready: true, canManage: true, page: 1, hasMore: false, items: url.searchParams.get('pending') === 'true' && item.state === 'completed' ? [] : [item] });
    if (path === `/api/v1/communities/community/improvements/${id}`) return ok(item);
    if (path === `/api/v1/communities/community/improvements/${id}/replies`) {
      const body = route.request().postDataJSON(); writes.push(body);
      if (body.version !== item.version) return route.fulfill({ status: 409, json: { error: 'changed' } });
      item = { ...item, state: body.state, version: item.version + 1, replies: [{ text: body.body, official: true, at: new Date().toISOString() }] };
      return ok({ id, version: item.version });
    }
    if (path.endsWith('/board-requests')) return ok([]);
    if (path.includes('/public-read')) return ok({ boards: [], posts: [] });
    return route.fulfill({ status: 503, json: { code: 'UNEXPECTED_FIXTURE_API' } });
  });
  return writes;
}
for (const width of [1440, 390]) test(`improvement review and direct workspace link at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const writes = await fixture(page);
  await page.goto('/operations/community/forums?tab=improvements');
  await page.getByText('Synthetic improvement request', { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`improvement=${id}`));
  await expect(page.getByRole('heading', { name: 'Synthetic improvement request' })).toBeVisible();
  await page.getByRole('combobox', { name: '처리 상태', exact: true }).selectOption('completed');
  await page.getByLabel('공개 답변·처리 사유').fill('Synthetic fix verified');
  await page.getByRole('button', { name: '답변·상태 저장' }).click();
  await expect(page.getByText('O4O 운영팀 공식 답변', { exact: false })).toBeVisible();
  await expect(page.getByText('Synthetic fix verified', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  await page.getByRole('button', { name: '목록으로', exact: true }).click();
  await expect(page.getByText('표시할 글이 없습니다.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
