import { test, expect } from '@playwright/test';
import { API_BASE_URL, USER_ORIGINS } from './helpers/auth.helpers';

const GOOGLE_ENTRY =
  '[data-testid="google-continue-button"], iframe[src*="accounts.google.com"]';
async function expectDemoButtons(page: import('@playwright/test').Page) {
  for (const role of ['매장 경영자', '공급자', '매장 직원']) {
    await expect(
      page
        .getByRole('button', {
          name: new RegExp(`${role}.*(테스트 로그인|Demo 체험)`),
        })
        .first(),
    ).toBeVisible();
  }
}

for (const origin of USER_ORIGINS) {
  test(`${new URL(origin).hostname}: anonymous login methods and Demo entries`, async ({
    page,
    request,
  }) => {
    const response = await page.goto(`${origin}/login`, {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);
    await expectDemoButtons(page);
    if (origin === 'https://study.neture.co.kr') {
      const href = await page
        .getByTestId('lecture-login-entry')
        .getAttribute('href');
      const target = new URL(href!);
      expect(target.origin).toBe('https://neture.co.kr');
      expect(target.pathname).toBe('/service-entry/lecture');
      return;
    }
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator(GOOGLE_ENTRY).first()).toBeAttached();
    const config = await request.get(
      `${API_BASE_URL}/api/v1/auth/social/kakao/config`,
      { headers: { Origin: origin } },
    );
    expect(config.status()).toBe(200);
    expect((await config.json()).data?.enabled).toBe(true);
    await expect(
      page.getByRole('button', { name: '카카오로 계속하기', exact: true }),
    ).toBeVisible();
  });
}

test('representative home opens the same login methods', async ({ page }) => {
  await page.goto('https://neture.co.kr/', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: '로그인', exact: true })
    .first()
    .click();
  await expectDemoButtons(page);
  await expect(
    page.getByRole('button', { name: '카카오로 계속하기', exact: true }),
  ).toBeVisible();
});

test('전체관리자 is Google-only without public Demo/password inputs', async ({
  page,
}) => {
  await page.goto('https://admin.neture.co.kr/login', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator(GOOGLE_ENTRY).first()).toBeAttached();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: /테스트 로그인|Demo 체험|카카오로 계속하기/,
    }),
  ).toHaveCount(0);
});

test('Google public configuration is enabled', async ({ request }) => {
  const response = await request.get(
    `${API_BASE_URL}/api/v1/auth/google/config`,
  );
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.data?.enabled).toBe(true);
  expect(body.data?.clientId).toEqual(expect.any(String));
});
