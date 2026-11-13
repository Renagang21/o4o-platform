import { expect, test } from '@playwright/test';

// Isolated synthetic API: no production accounts, business writes, external AI or devices.
for (const base of ['/store', '/work/kpa-society/store']) {
 test(`studio create/edit → selected publication → hide: ${base}`, async ({ page }, testInfo) => {
  const store = '00000000-0000-4000-8000-000000000001';
  const copyId = '00000000-0000-4000-8000-000000000002';
  const directId = '00000000-0000-4000-8000-000000000003';
  const errors: string[] = [], unexpectedWrites: string[] = [];
  let hidden = false, published = false, failList = false, failPublish = true, creates = 0, updates = 0;
  let saved: Record<string, any> | null = null;
  const copy = { id: copyId, selectionKey: `snapshot:${copyId}`, origin: 'snapshot', title: '합성 매장 사본', organizationId: store,
   assetType: 'cms', sourceService: 'community', contentJson: { body: '<p>독립 매장 사본</p>' }, tags: [], createdAt: '2026-11-01T00:00:00Z' };
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { if (window.top === window) localStorage.setItem('o4o_accessToken', 'synthetic-browser-token'); });
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
   const request = route.request(), url = new URL(request.url()), path = url.pathname;
   const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
   if (path.endsWith('/auth/me')) return json({ user: { id: 'synthetic-owner', name: '합성 사용자', email: 'owner@example.invalid', roles: [], memberships: [], status: 'active', isActive: true } });
   if (path.endsWith('/work-scope/accessible-stores')) return json({ stores: [{ organizationId: store, organizationName: '합성 매장', memberRole: 'owner' }] });
   if (path.endsWith('/work-scope/store-services')) return json({ status: 'resolved', organizationId: store, services: [{ organizationId: store, serviceKey: 'kpa-society', serviceName: '약국', enrollmentStatus: 'active', workspaceMode: 'standard', workspaceAvailable: true }], reason: null });
   if (path.endsWith('/consultation-tablets')) return json({ organizationId: store, tablets: [], canEdit: true });
   if (path.endsWith('/semi-franchises')) return json([]);
   if (path.endsWith('/store-library/contents')) {
    if (failList) { failList = false; return route.fulfill({ status: 503, json: { success: false } }); }
    let items: Record<string, any>[] = hidden ? [] : [copy];
    if (saved) items.push({ ...saved, origin: 'direct', selectionKey: `direct:${directId}` });
    if (url.searchParams.get('source') === 'operator') items = [];
    const q = url.searchParams.get('search'); if (q) items = items.filter(item => item.title.includes(q));
    return json({ items, page: 1, total: items.length, totalPages: 1, limit: 20 });
   }
   if (path.endsWith('/store-contents') && request.method() === 'POST') {
    creates++; saved = { ...request.postDataJSON(), id: directId, sourceType: 'direct', organizationId: store, updatedAt: '2026-11-06T00:00:00Z', createdAt: '2026-11-06T00:00:00Z' };
    expect(request.headers()['x-store-organization-id']).toBe(store); return json(saved);
   }
   if (path.endsWith(`/store-contents/direct/${directId}`)) {
    if (request.method() === 'PUT') { updates++; saved = { ...saved, ...request.postDataJSON() }; }
    return json(saved);
   }
   if (path.endsWith('/store-assets')) return json({ items: hidden ? [] : [{ ...copy, sourceAssetId: 'synthetic-source', publishStatus: published ? 'published' : 'draft', channelMap: { home: true }, isForced: false, snapshotType: 'user_copy', lifecycleStatus: 'active' }], total: hidden ? 0 : 1 });
   if (path.endsWith(`/store-assets/${copyId}/publish`) && request.method() === 'PATCH') {
    const status = request.postDataJSON().status;
    if (status === 'published' && failPublish) { failPublish = false; return route.fulfill({ status: 503, json: { success: false } }); }
    if (status === 'published') published = true;
    if (status === 'hidden') hidden = true;
    return json({ snapshotId: copyId, publishStatus: status, updatedAt: '2026-11-06T00:00:00Z' });
   }
   if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) unexpectedWrites.push(`${request.method()} ${path}`);
   return json([]);
  });
  await page.route(url => !url.pathname.startsWith('/api/') && !['127.0.0.1', 'localhost'].includes(url.hostname), route => route.abort());
  await page.goto(`${base}/workspace/studio`);
  await expect(page.getByRole('link', { name: copy.title, exact: true })).toBeVisible();
  const search = page.getByRole('searchbox', { name: '콘텐츠 검색' });
  expect((await search.boundingBox())!.y).toBeLessThan(page.viewportSize()!.height);
  expect((await page.getByRole('link', { name: copy.title, exact: true }).boundingBox())!.y).toBeLessThan(page.viewportSize()!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/studio-${testInfo.project.name}-${base === '/store' ? 'common' : 'service'}.png` });
  await expect(page.getByLabel('지금 하고 싶은 일 또는 이어서 답할 내용')).toBeHidden();
  await page.getByText('AI 도움 요청', { exact: true }).click();
  await page.getByLabel('지금 하고 싶은 일 또는 이어서 답할 내용').fill('보관할 질문');
  await page.getByRole('button', { name: '새 콘텐츠', exact: true }).click();
  const editor = page.getByRole('dialog');
  await expect(editor.getByLabel('지금 하고 싶은 일 또는 이어서 답할 내용')).toHaveValue('보관할 질문');
  await editor.getByRole('textbox', { name: '콘텐츠 제목', exact: true }).fill('합성 새 안내');
  await editor.getByRole('button', { name: 'HTML', exact: true }).click();
  await editor.getByPlaceholder('HTML 코드를 직접 입력하거나 외부 HTML을 붙여넣으시기 바랍니다...').fill('<p>합성 콘텐츠 본문</p>');
  await editor.getByRole('button', { name: '내 자료함 콘텐츠로 저장', exact: true }).click();
  await expect(page.getByRole('heading', { name: '합성 새 안내', exact: true })).toBeVisible();
  expect(creates).toBe(1);
  await page.getByRole('link', { name: '내 자료함 콘텐츠로 돌아가기', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/workspace/studio$`));
  const selectRow = async (title: string) => page.getByRole('row').filter({ has: page.getByRole('link', { name: title, exact: true }) }).getByRole('checkbox').check();
  await selectRow('합성 새 안내');
  await page.getByRole('button', { name: '선택 콘텐츠 편집', exact: true }).click();
  await page.getByRole('textbox', { name: '콘텐츠 제목', exact: true }).fill('합성 수정 안내');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('heading', { name: '합성 수정 안내', exact: true })).toBeVisible();
  expect(updates).toBe(1);
  await page.getByRole('link', { name: '내 자료함 콘텐츠로 돌아가기', exact: true }).click();
  await selectRow('합성 수정 안내');
  const productionTrigger = page.getByRole('button', { name: '제작 시작', exact: true });
  await productionTrigger.click();
  await expect(page.getByRole('dialog', { name: '제작 시작', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(productionTrigger).toBeFocused();
  await page.getByRole('row').filter({ has: page.getByRole('link', { name: '합성 수정 안내', exact: true }) }).getByRole('checkbox').uncheck();
  await page.getByText(/^필터 ·/).click();
  await page.getByRole('button', { name: '운영자 제공', exact: true }).click();
  await expect(page.getByText(/검색·필터 조건에 맞는 콘텐츠가 없습니다/)).toBeVisible();
  await page.getByRole('button', { name: '검색·필터 초기화', exact: true }).click();
  await selectRow(copy.title);
  failList = true;
  await page.getByLabel('제작·도움말', { exact: true }).click();
  await page.getByRole('button', { name: '새로고침', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: '선택 사본 게시 설정' })).toHaveCount(0);
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await selectRow(copy.title);
  await page.getByRole('button', { name: '선택 사본 게시 설정', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`snapshotId=${copyId}`));
  const publishingRow = page.getByRole('row').filter({ has: page.getByText(copy.title, { exact: true }) });
  await publishingRow.getByRole('button', { name: '초안', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: '실패한 1건 다시 시도', exact: true }).click();
  await expect(publishingRow.getByRole('button', { name: '게시됨', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '콘텐츠 목록으로 돌아가기', exact: true }).click();
  await selectRow(copy.title);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '선택 사본 숨기기', exact: true }).click();
  await expect(page.getByRole('link', { name: copy.title, exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '합성 수정 안내', exact: true })).toBeVisible();
  expect(hidden).toBe(true); expect(published).toBe(true); expect(unexpectedWrites).toEqual([]); expect(errors).toEqual([]);
 });
}
