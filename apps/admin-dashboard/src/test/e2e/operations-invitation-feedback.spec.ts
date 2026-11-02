import { test, expect, type Page } from '@playwright/test';

async function fixture(page: Page, outcome: 'failure' | 'success' = 'failure') {
  const writes: unknown[] = [];
  let complete!: () => void;
  const pending = new Promise<void>(resolve => { complete = resolve; });
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'admin@example.test', name: 'Synthetic admin', roles: ['platform:super_admin'], status: 'active', isActive: true, isEmailVerified: true, authMethod: 'google', authProvider: 'google' };
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/')) {
      const ok = (data: unknown) => route.fulfill({ json: { success: true, data } });
      if (url.pathname === '/api/v1/auth/status') return ok({ authenticated: true, user });
      if (url.pathname === '/api/v1/auth/me') return ok(user);
      if (url.pathname === '/api/v1/auth/google/config') return ok({ enabled: false, clientId: null });
      if (url.pathname === '/api/v1/admin/operations-operators' && req.method() === 'POST') {
        writes.push(req.postDataJSON());
        await pending;
        if (outcome === 'success') return ok({ id: '22222222-2222-4222-8222-222222222222' });
        return route.fulfill({ status: 503, json: { success: false, code: 'INVITATION_MAIL_FAILED', error: '초대 상태는 저장되었지만 메일 발송이 확인되지 않았습니다. 목록을 새로고침하고 1분 후 재발송하거나 취소해 주세요.' } });
      }
      if (url.pathname === '/api/v1/admin/operations-operators') return ok([]);
      if (url.pathname === '/api/v1/admin/service-operator-invitations') return ok(writes.length ? [{ id: '22222222-2222-4222-8222-222222222222', scope_type: 'platform', scope_key: 'admin-operations', invited_email: 'invitee@example.test', status: 'pending', expired: false }] : []);
      return ok({ items: [], notifications: [], unreadCount: 0 });
    }
    if (url.origin === 'http://127.0.0.1:3101') return route.continue();
    return route.abort();
  });
  return { writes, complete };
}
for (const width of [1280, 390]) test(`invitation failure is visible beside the action without choosing duties at ${width}px`, async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width, height: 700 });
  const { writes, complete } = await fixture(page);
  await page.goto('/admin/operations-operators');
  await page.getByRole('button', { name: '업무 운영자 초대', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '업무 운영자 초대', exact: true });
  await dialog.getByLabel('미가입자 초대 이메일').fill('invitee@example.test');
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  await expect(dialog.getByText(/일상업무 전체를 기본으로 제공합니다/)).toBeVisible();
  const send = dialog.getByRole('button', { name: '초대 메일 보내기', exact: true });
  await send.scrollIntoViewIfNeeded();
  await send.click();
  await expect(dialog.getByRole('status')).toContainText('초대 메일 발송을 요청하고 있습니다');
  await expect(dialog.getByRole('button', { name: '처리 중…', exact: true })).toBeDisabled();
  complete();
  const alert = dialog.getByRole('alert');
  await expect(alert).toContainText('메일 발송이 확인되지 않았습니다.');
  await expect(alert).toBeInViewport();
  await expect(dialog.getByLabel('미가입자 초대 이메일')).toHaveValue('invitee@example.test');
  expect(writes).toEqual([{ email: 'invitee@example.test' }]);
  await dialog.getByRole('button', { name: '초대 목록 확인', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('invitee@example.test', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '재발송', exact: true })).toBeVisible();
  expect(writes).toEqual([{ email: 'invitee@example.test' }]);
});

for (const width of [1280, 390]) test(`confirmed invitation remains visible until acknowledgement at ${width}px`, async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width, height: 700 });
  const { writes, complete } = await fixture(page, 'success');
  await page.goto('/admin/operations-operators');
  await page.getByRole('button', { name: '업무 운영자 초대', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '업무 운영자 초대', exact: true });
  await dialog.getByLabel('미가입자 초대 이메일').fill('invitee@example.test');
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  await expect(dialog.getByText(/일상업무 전체를 기본으로 제공합니다/)).toBeVisible();
  const send = dialog.getByRole('button', { name: '초대 메일 보내기', exact: true });
  await send.scrollIntoViewIfNeeded();await send.click();
  await expect(dialog.getByRole('status')).toContainText('초대 메일 발송을 요청하고 있습니다');
  complete();
  const receipt = dialog.getByRole('status');
  await expect(receipt).toContainText('초대 메일을 발송했습니다');
  await expect(receipt).toBeInViewport();
  await expect(send).toHaveCount(0);
  expect(writes).toEqual([{ email: 'invitee@example.test' }]);
  await dialog.getByRole('button', { name: '완료', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '초대 메일을 발송했습니다' })).toBeVisible();
  expect(writes).toEqual([{ email: 'invitee@example.test' }]);
});
