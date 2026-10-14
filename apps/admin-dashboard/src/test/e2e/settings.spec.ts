import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/** Browser fixtures exercise the UI contract, not Google OAuth or a live backend. */
async function mockApi(page: Page, roles: string[] | null = ['platform:super_admin']) {
  let email = { smtpHost: 'smtp.example.invalid', smtpPort: 587,
    smtpUser: 'fixture-user', smtpPassword: randomUUID(), smtpSecure: false,
    fromEmail: 'sender@example.invalid', fromName: 'Fixture' };
  let failRead = false;
  let failSave = false;
  let failModels = false;
  let failPolicy = false;
  let failPolicySave = false;
  const policyWrites: Record<string, unknown>[] = [];
  let policy = { freeDailyLimit: 17, paidDailyLimit: 130, aiEnabled: false, defaultModel: 'fixture-model',
    systemPrompt: 'Saved prompt', updatedAt: '2026-10-10T00:00:00Z' };
  const writes: Record<string, unknown>[] = [];
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    if (path === '/api/v1/auth/status') {
      return json({ success: true, data: { authenticated: roles !== null, user: roles && {
        id: 'fixture-admin', email: 'admin@example.invalid', name: 'Fixture Admin',
        roles, status: 'active', authMethod: 'google',
      } } });
    }
    if (path === '/api/v1/auth/google/config') return json({ success: true, data: { enabled: false, clientId: null } });
    if (path === '/api/v1/admin/pending-tasks/summary') return json({ success: true, data: { total: 0, productRegistrationRequests: 0, manualReviews: 0 } });
    if (path === '/api/v1/settings/email') {
      if (request.method() === 'PUT') {
        const body = request.postDataJSON();
        writes.push(body);
        if (failSave) return json({ success: false }, 500);
        email = { ...email, ...body };
        return json({ success: true, data: email });
      }
      if (failRead) return json({ success: false }, 500);
      return json({ success: true, data: email });
    }
    if (path === '/api/ai/models') {
      if (failModels) return json({ success: false }, 500);
      return json({ success: true, data: { current: 'fixture-model', source: 'static', fetchedAt: null, canonical: 'fixture-model',
        models: [{ id: 'fixture-model', displayName: 'Fixture Model', inputTokenLimit: 4096 }] } });
    }
    if (path === '/api/ai/policy') {
      if (request.method() === 'PUT') {
        const body = request.postDataJSON();
        policyWrites.push(body);
        if (failPolicySave) return json({ success: false });
        policy = { ...policy, ...body };
        return json({ success: true, data: policy });
      }
      if (failPolicy) return json({ success: false }, 500);
      return json({ success: true, data: policy });
    }
    // Never let test requests reach production or an unmocked backend.
    return json({ success: false, error: 'Unmocked test API' }, 404);
  });
  return { writes, policyWrites,
    setPolicyFailure: (value: boolean) => { failPolicy = value; },
    setPolicySaveFailure: (value: boolean) => { failPolicySave = value; },
    password: email.smtpPassword, setReadFailure: (value: boolean) => { failRead = value; },
    setSaveFailure: (value: boolean) => { failSave = value; },
    setModelsFailure: (value: boolean) => { failModels = value; } };
}

for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('email settings load, save and survive reload', async ({ page }) => {
      const api = await mockApi(page);
      await page.goto('/settings/email');
      const host = page.getByLabel('SMTP 호스트', { exact: false });
      await expect(host).toHaveValue('smtp.example.invalid');
      await expect(page.getByLabel('SMTP 비밀번호', { exact: false })).toHaveValue(api.password);
      await expect(page.getByText(/자동 적용되지 않습니다/)).toBeVisible();
      await host.fill('edited.example.invalid');
      await page.getByRole('button', { name: '설정 저장', exact: true }).click();
      await expect(page.getByText(/SMTP 설정을 DB에 저장했습니다/)).toBeVisible();
      expect(api.writes).toHaveLength(1);
      expect(api.writes[0].smtpHost).toBe('edited.example.invalid');
      expect(api.writes[0].smtpPassword).toBe(api.password);
      expect(api.writes[0]).not.toHaveProperty('smtpPass');
      expect(api.writes[0]).not.toHaveProperty('success');
      expect(api.writes[0]).not.toHaveProperty('data');
      await page.reload();
      await expect(host).toHaveValue('edited.example.invalid');
      await expect(page.getByLabel('SMTP 비밀번호', { exact: false })).toHaveValue(api.password);
    });

    test('failed read blocks saving until a successful retry', async ({ page }) => {
      const api = await mockApi(page);
      api.setReadFailure(true);
      await page.goto('/settings/email');
      await expect(page.getByText(/저장된 이메일 설정을 불러오지 못했습니다/)).toBeVisible();
      await expect(page.getByRole('button', { name: '설정 저장', exact: true })).toBeDisabled();
      await expect(page.getByLabel('SMTP 호스트', { exact: false })).toBeDisabled();
      expect(api.writes).toHaveLength(0);
      api.setReadFailure(false);
      await page.getByRole('button', { name: '다시 불러오기' }).click();
      await expect(page.getByLabel('SMTP 호스트', { exact: false })).toHaveValue('smtp.example.invalid');
      await expect(page.getByRole('button', { name: '설정 저장', exact: true })).toBeEnabled();
    });

    test('failed save remains visible and retains the edited value', async ({ page }) => {
      const api = await mockApi(page);
      await page.goto('/settings/email');
      const host = page.getByLabel('SMTP 호스트', { exact: false });
      await expect(host).toHaveValue('smtp.example.invalid');
      await host.fill('edited.example.invalid');
      api.setSaveFailure(true);
      await page.getByRole('button', { name: '설정 저장', exact: true }).click();
      await expect(page.getByText('SMTP 설정 저장에 실패했습니다.')).toBeVisible();
      await expect(host).toHaveValue('edited.example.invalid');
      await expect(page.getByText(/SMTP 설정을 DB에 저장했습니다/)).toHaveCount(0);
    });

    test('AI policy blocks failed reads and recovers save failures without losing edits', async ({ page }) => {
      const api = await mockApi(page);
      api.setPolicyFailure(true);
      await page.goto('/settings/ai-query');
      await expect(page.getByText(/저장된 AI 정책을 불러오지 못했습니다/)).toBeVisible();
      await expect(page.getByRole('button', { name: '설정 저장', exact: true })).toBeDisabled();
      expect(api.policyWrites).toHaveLength(0);
      api.setPolicyFailure(false);
      await page.getByRole('button', { name: '다시 불러오기', exact: true }).click();
      const prompt = page.locator('textarea');
      await expect(prompt).toHaveValue('Saved prompt');
      await prompt.fill('Edited prompt');
      api.setPolicySaveFailure(true);
      await page.getByRole('button', { name: '설정 저장', exact: true }).click();
      await expect(page.getByText('AI 정책 저장에 실패했습니다.')).toBeVisible();
      await expect(prompt).toHaveValue('Edited prompt');
      api.setPolicySaveFailure(false);
      await page.getByRole('button', { name: '설정 저장', exact: true }).click();
      await expect(page.getByText('AI 정책이 저장되었습니다.')).toBeVisible();
      await page.reload();
      await expect(prompt).toHaveValue('Edited prompt');
      expect(api.policyWrites).toHaveLength(2);
    });

    test('AI models recover after retry and the policy editor is reachable', async ({ page }) => {
      const api = await mockApi(page);
      api.setModelsFailure(true);
      await page.goto('/settings');
      await expect(page.getByText('모델 정보를 불러오지 못했습니다.')).toBeVisible();
      api.setModelsFailure(false);
      await page.getByRole('button', { name: '다시 불러오기' }).click();
      await expect(page.getByText('Fixture Model', { exact: true })).toBeVisible();
      await expect(page.getByText(/사용 통계가 연결되어 있지 않습니다/)).toBeVisible();
      await expect(page.getByRole('button', { name: '설정 저장', exact: true })).toHaveCount(0);
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
      await page.getByRole('link', { name: 'AI Query 설정으로 이동' }).click();
      await expect(page).toHaveURL(/\/settings\/ai-query$/);
      await expect(page.getByRole('button', { name: /저장/ })).toBeVisible();
    });
  });
}

test('service-only roles cannot open the platform settings', async ({ page }) => {
  await mockApi(page, ['neture:operator']);
  await page.goto('/settings/email');
  await expect(page.getByRole('heading', { name: '접근 권한이 없습니다' })).toBeVisible();
  await expect(page.locator('#smtpHost')).toHaveCount(0);
});

test('anonymous users are sent to Google-only login', async ({ page }) => {
  await mockApi(page, null);
  await page.goto('/settings/email');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'O4O Admin' })).toBeVisible();
  await expect(page.locator('input[type="password"], input[type="email"]')).toHaveCount(0);
});
