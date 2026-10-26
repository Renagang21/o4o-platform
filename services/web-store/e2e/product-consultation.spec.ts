import { test, expect } from '@playwright/test';
test('product consultation source → ChatGPT prompt/result → linked save → reopen and revise', async ({ page }, testInfo) => {
 const store = '00000000-0000-4000-8000-000000000001', product = '00000000-0000-4000-8000-000000000002';
 let id = '', loseCreate = true, conflictOnce = true;
 const errors: string[] = []; const unexpectedWrites: string[] = [];
 let saved: Record<string, any> | null = null, creates = 0, updates = 0, failReadback = true;
 page.on('pageerror', e => errors.push(e.message));
 await page.addInitScript(() => localStorage.setItem('o4o_accessToken', 'synthetic-browser-token'));
 await page.route(url => url.pathname.startsWith('/api/'), async route => {
  const request = route.request(), path = new URL(request.url()).pathname;
  const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
  if (path.endsWith('/auth/me')) return json({ user: { id: 'synthetic-owner', email: 'owner@example.invalid', name: '합성 사용자', roles: [], memberships: [], status: 'active', isActive: true } });
  if (path.endsWith('/work-scope/accessible-stores')) return json({ stores: [{ organizationId: store, organizationName: '합성 매장', memberRole: 'owner' }] });
  if (path.endsWith('/work-scope/store-services')) return json({ status: 'resolved', organizationId: store, services: [{ organizationId: store, serviceKey: 'kpa-society', serviceName: '약국', enrollmentStatus: 'active', workspaceMode: 'standard', workspaceAvailable: true }], reason: null });
  if (path.endsWith('/store-library/contents')) return json({ items: [], page: 1, total: 0, totalPages: 1, limit: 20 });
  if (path.endsWith('/store-contents/by-product')) return json({ items: saved ? [{ contentId: id, title: saved.title, status: 'draft', linkType: 'product_description', sourceType: 'direct', snapshotId: null }] : [] });
  if (path.endsWith(`/store/local-products/${product}`)) return json({ id: product, name: '합성 상품', detailHtml: '<p>제조사가 제공한 함량 원문</p>', is_active: true });
  if (path.endsWith('/store-contents') && request.method() === 'POST') {
   const body = request.postDataJSON(); expect(body.productRef).toEqual({ sourceType: 'local', sourceId: product });
   expect(request.headers()['x-store-organization-id']).toBe(store);
   if (saved) { expect(body.clientContentId).toBe(id); return json(saved); }
   creates++; id = body.clientContentId; expect(id).toMatch(/^[0-9a-f-]{36}$/);
   saved = { ...body, id, revision: 'a'.repeat(64), sourceType: 'direct', updatedAt: '2026-10-26T00:00:00Z', updatedBy: null };
   if (loseCreate) { loseCreate = false; return route.abort('failed'); }
   return json(saved);
  }
  if (path.endsWith(`/store-contents/direct/${id}`)) {
   if (request.method() === 'GET' && failReadback) { failReadback = false; return route.fulfill({ status: 503, json: { success: false, code: 'SYNTHETIC_READBACK_FAILURE' } }); }
   if (request.method() === 'PUT') {
    const body = request.postDataJSON();
    if (body.expectedRevision !== saved!.revision) return route.fulfill({ status: 409, json: { success: false, error: { code: 'CONTENT_CONFLICT' } } });
    if (conflictOnce && updates === 0) {
     conflictOnce = false; saved = { ...saved, title: '다른 화면의 최신 저장본', revision: 'c'.repeat(64), contentJson: { ...saved!.contentJson, html: '<p>다른 화면에서 저장한 본문</p>' } };
     return route.fulfill({ status: 409, json: { success: false, error: { code: 'CONTENT_CONFLICT' } } });
    }
    updates++; saved = { ...saved, ...body, revision: (updates === 1 ? 'b' : 'd').repeat(64) };
   }
   expect(request.headers()['x-store-organization-id']).toBe(store); return json(saved);
  }
  if (request.method() !== 'GET') unexpectedWrites.push(path);
  if (path.includes('policy-acceptances')) return json({ pending: [] });
  if (path.endsWith('/auth/google/config')) return json({ enabled: false, clientId: null });
  return json([]);
 });
 await page.goto(`/store/library/contents?create=1&pType=local&pId=${product}&pName=${encodeURIComponent('합성 상품')}&pStore=${store}`);
 await page.getByRole('button', { name: '새 안내 작성', exact: true }).click();
 await page.getByLabel('콘텐츠 제목').fill('합성 상담자료');
 await page.getByText('저장된 상품 원문 확인·가져오기', { exact: true }).click();
 await page.getByRole('button', { name: '상품 원문 불러오기', exact: true }).click();
 await page.getByRole('button', { name: '확인한 원문을 상품 사실 근거로 사용' }).click();
 await page.getByLabel('설명서 이용 목적').selectOption('professional');
 await page.getByLabel('상담자료 작성 언어').selectOption('en');
 await page.getByText('상품 근거·전문 참고자료 추가', { exact: true }).click();
 await expect(page.getByLabel('상품 사실 원문')).toHaveValue(/제조사가 제공한 함량 원문/);
 await page.getByLabel('전문 참고정보').fill('전문 참고 지침');
 await page.getByLabel('전문 자료 출처·확인일').fill('합성 지침, 확인일');
 await page.getByLabel('전문 참고자료의 출처와 내용을 검수했습니다').check();
 await page.getByRole('button', { name: 'ChatGPT로 작업', exact: false }).click();
 // Real prompt builder is rendered; no external AI account or network call is used.
 await expect(page.getByText('결과는 영어로 작성하세요.', { exact: false })).toBeVisible();
 await page.getByPlaceholder('LLM 이 만들어 준 HTML 을 여기에 붙여 넣고 아래 버튼을 누르세요.').fill('<h2>상담자료</h2><p onclick="alert(1)">확인할 사용자 ChatGPT 결과</p><script>window.untrustedResult=true</script>');
 await page.getByRole('button', { name: '편집기에 넣기', exact: true }).click();
 await page.getByRole('button', { name: '닫기', exact: true }).last().click();
 await page.getByRole('button', { name: '내 자료함 콘텐츠로 저장', exact: true }).click();
 await expect(page.getByText('저장하지 못했습니다. 입력 내용을 유지한 채 다시 시도해 주세요.', { exact: false })).toBeVisible();
 expect(creates).toBe(1);
 await page.getByRole('button', { name: '내 자료함 콘텐츠로 저장', exact: true }).click();
 await expect(page).toHaveURL(new RegExp(`/store/content/direct/${id}$`));
 await expect(page.getByText('상품 상담자료 ·', { exact: false })).toBeVisible();
 expect(saved!.contentJson.html).not.toContain('<script'); expect(saved!.contentJson.html).not.toContain('onclick');
 expect(creates).toBe(1); expect(saved!.contentJson.productConsultation.assist.purpose).toBe('professional'); expect(saved!.contentJson.productConsultation.language).toBe('en');
 await page.reload();
 await page.getByRole('button', { name: '수정', exact: true }).click();
 await expect(page.getByLabel('설명서 이용 목적')).toHaveValue('professional');
 await expect(page.getByLabel('상담자료 작성 언어')).toHaveValue('en');
 await expect(page.getByLabel('전문 참고정보')).toHaveValue('전문 참고 지침');
 await expect(page.getByLabel('전문 참고자료의 출처와 내용을 검수했습니다')).toBeChecked();
 await page.locator('fieldset').screenshot({ path: `/tmp/o4o-consultation-authoring-${testInfo.project.name}.png` });
 await page.getByRole('button', { name: '저장', exact: true }).click();
 await expect(page.getByRole('region', { name: '상담자료 수정 충돌' })).toBeVisible();
 await page.getByText('최신 저장본 비교', { exact: true }).click();
 await expect(page.getByText('다른 화면에서 저장한 본문', { exact: true })).toBeVisible();
 await page.getByRole('button', { name: '저장본을 확인했습니다. 내 작성 내용 유지', exact: true }).click();
 await page.getByRole('button', { name: '저장', exact: true }).click();
 await expect(page.getByRole('button', { name: '수정', exact: true })).toBeVisible();
 expect(saved!.contentJson.html).toContain('확인할 사용자 ChatGPT 결과');
 expect(updates).toBe(1); expect(creates).toBe(1); expect(unexpectedWrites).toEqual([]); expect(errors).toEqual([]);
 expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
 // An existing product-linked direct document can adopt this workflow without a second document.
 delete saved!.contentJson.productConsultation; saved!.revision = 'e'.repeat(64);
 await page.goto(`/store/library/contents?create=1&pType=local&pId=${product}&pName=${encodeURIComponent('합성 상품')}&pStore=${store}`);
 await page.getByRole('button', { name: '기존 안내 수정', exact: true }).click();
 await expect(page.getByLabel('설명서 이용 목적')).toHaveValue('ai-support');
 await page.getByRole('button', { name: '저장', exact: true }).click();
 await expect(page.getByRole('button', { name: '수정', exact: true })).toBeVisible();
 expect(saved!.contentJson.productConsultation.product.sourceId).toBe(product);
 expect(creates).toBe(1); expect(updates).toBe(2); expect(errors).toEqual([]);
});
