import { test, expect } from '@playwright/test';

for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }]) {
  test.describe(`CMS preview ${viewport.name}`, () => {
    test.use({ viewport });
    test('public URL shows an honest error and recovers after retry', async ({ page }) => {
      let fail = true;
      const previewPaths: string[] = [];
      await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/v1/cms/public/view/fixture') {
          previewPaths.push(path);
          return route.fulfill({ status: fail ? 404 : 200, json: fail ? { success: false } : {
            success: true, data: { view: { schema: { components: [{ type: 'Text', props: { text: 'Fixture preview' } }] } } },
          } });
        }
        if (path === '/api/v1/auth/status') return route.fulfill({ json: { success: true, data: { authenticated: false, user: null } } });
        if (path === '/api/v1/auth/google/config') return route.fulfill({ json: { success: true, data: { enabled: false, clientId: null } } });
        return route.fulfill({ status: 404, json: { success: false } });
      });
      await page.goto('/preview/fixture?preview=1');
      const previewError = page.getByRole('alert').filter({ hasText: '미리보기 데이터' });
      await expect(previewError).toBeVisible();
      await expect(page.getByText('미리보기 조회 기능은 현재 서버에 연결되어 있지 않습니다.')).toBeVisible();
      expect(page.url()).toContain('/preview/fixture');
      fail = false;
      await page.getByRole('button', { name: '다시 불러오기' }).click();
      await expect(page.getByText('Fixture preview')).toBeVisible();
      expect(previewPaths).toHaveLength(2);
      await expect(previewError).toHaveCount(0);
    });
  });
}
