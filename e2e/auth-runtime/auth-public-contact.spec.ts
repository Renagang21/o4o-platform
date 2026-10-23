import { test, expect } from '@playwright/test';
import { API_BASE_URL, USER_ORIGINS } from './helpers/auth.helpers';

// Follow the published entry rather than assuming every app owns /contact.
// Branch and Store navigation delegate to the account centre with service scope.
for (const origin of USER_ORIGINS) {
  test(`${new URL(origin).hostname}: public home and Contact Us need no login`, async ({ page }) => {
    const expectedContact = new URL(origin === 'https://kpa.neture.co.kr'
      ? 'https://neture.co.kr/contact?service=kpa-branch'
      : origin === 'https://store.neture.co.kr'
        ? 'https://neture.co.kr/contact?service=store'
        : '/contact', origin);
    const directContact = origin === 'https://kpa.neture.co.kr' ? expectedContact : new URL('/contact', origin);
    const mutations: string[] = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin === new URL(API_BASE_URL).origin && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        mutations.push(`${request.method()} ${url.pathname}`);
      }
    });

    const response = await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    const contact = page.getByRole('link', {
      name: origin === 'https://study.neture.co.kr' ? '이용 · 개설 문의' : 'Contact Us', exact: true,
    }).first();
    await expect(contact).toBeVisible();
    const href = await contact.getAttribute('href');
    expect(new URL(href!, page.url()).href).toBe(expectedContact.href);
    await contact.click();
    await expect(page).toHaveURL(expectedContact.href);

    async function expectAnonymousForm() {
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
      await expect(page.locator('textarea').first()).toBeVisible();
      await expect(page.getByRole('checkbox').first()).toBeVisible();
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
    }
    await expectAnonymousForm();
    // Direct entry must have the same public access as the menu.
    const direct = await page.goto(directContact.href, { waitUntil: 'domcontentloaded' });
    expect(direct?.status()).toBe(200);
    await expect(page).toHaveURL(directContact.href);
    await expectAnonymousForm();
    expect(mutations, 'Browsing a public inquiry form must not create an inquiry or session').toEqual([]);
  });
}
