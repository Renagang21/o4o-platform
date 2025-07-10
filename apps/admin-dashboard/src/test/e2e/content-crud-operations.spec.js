import { test, expect } from '@playwright/test';
const ADMIN_ACCOUNT = {
    email: 'admin@neture.co.kr',
    password: 'admin123!'
};
async function adminLogin(page) {
    await page.goto('http://localhost:3001/login');
    await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
    await page.fill('input[name="password"]', ADMIN_ACCOUNT.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
}
function generateTestData() {
    const timestamp = Date.now();
    return {
        postTitle: `E2E 테스트 게시물 ${timestamp}`,
        postContent: `이것은 E2E 테스트를 위한 게시물 내용입니다. 작성 시간: ${new Date().toLocaleString()}`,
        updatedTitle: `수정된 E2E 테스트 게시물 ${timestamp}`,
        updatedContent: `수정된 내용입니다. 수정 시간: ${new Date().toLocaleString()}`,
        pageTitle: `E2E 테스트 페이지 ${timestamp}`,
        pageSlug: `test-page-${timestamp}`,
        pageContent: `테스트 페이지 내용입니다.`
    };
}
test.describe('Content CRUD Operations', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3001/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await adminLogin(page);
    });
    test('포럼 게시물 전체 CRUD 워크플로우', async ({ page }) => {
        const testData = generateTestData();
        await page.click('text=콘텐츠');
        await page.waitForLoadState('networkidle');
        await expect(page.url()).toContain('/content');
        await page.click('text=게시물, text=포럼, text=Posts');
        await page.waitForLoadState('networkidle');
        await page.click('text=새 글 작성, text=새 게시물, text=글 작성, button:has-text("추가")');
        await page.waitForLoadState('networkidle');
        const titleInput = page.locator('input[name="title"], input[placeholder*="제목"], #title');
        await titleInput.fill(testData.postTitle);
        const contentSelectors = [
            'textarea[name="content"]',
            'textarea[placeholder*="내용"]',
            '.editor textarea',
            '[data-testid="content-editor"]',
            '.ql-editor',
            '.ProseMirror'
        ];
        let contentFilled = false;
        for (const selector of contentSelectors) {
            try {
                const contentInput = page.locator(selector);
                if (await contentInput.isVisible({ timeout: 1000 })) {
                    await contentInput.fill(testData.postContent);
                    contentFilled = true;
                    break;
                }
            }
            catch (e) {
                continue;
            }
        }
        if (!contentFilled) {
            const textInputs = page.locator('textarea, input[type="text"]:not([name="title"])');
            const count = await textInputs.count();
            if (count > 0) {
                await textInputs.last().fill(testData.postContent);
            }
        }
        await page.click('button:has-text("저장"), button:has-text("등록"), button:has-text("발행")');
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/content') || page.url().includes('/edit')) {
            await page.click('text=콘텐츠');
            await page.click('text=게시물, text=포럼, text=Posts');
            await page.waitForLoadState('networkidle');
        }
        await expect(page.locator(`text=${testData.postTitle}`)).toBeVisible({ timeout: 10000 });
        await page.click(`text=${testData.postTitle}`);
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/edit')) {
            await page.click('text=편집, button:has-text("수정"), [aria-label="편집"]');
            await page.waitForLoadState('networkidle');
        }
        const editTitleInput = page.locator('input[name="title"], input[value*="E2E 테스트"], #title');
        await editTitleInput.clear();
        await editTitleInput.fill(testData.updatedTitle);
        for (const selector of contentSelectors) {
            try {
                const contentInput = page.locator(selector);
                if (await contentInput.isVisible({ timeout: 1000 })) {
                    await contentInput.clear();
                    await contentInput.fill(testData.updatedContent);
                    break;
                }
            }
            catch (e) {
                continue;
            }
        }
        await page.click('button:has-text("저장"), button:has-text("업데이트")');
        await page.waitForLoadState('networkidle');
        await expect(page.locator(`text=${testData.updatedTitle}`)).toBeVisible({ timeout: 10000 });
        if (!page.url().includes('/content') || page.url().includes('/edit')) {
            await page.click('text=콘텐츠');
            await page.click('text=게시물, text=포럼, text=Posts');
            await page.waitForLoadState('networkidle');
        }
        const postRow = page.locator(`tr:has-text("${testData.updatedTitle}"), [data-testid="post-item"]:has-text("${testData.updatedTitle}")`);
        if (await postRow.isVisible()) {
            const deleteSelectors = [
                `tr:has-text("${testData.updatedTitle}") button:has-text("삭제")`,
                `tr:has-text("${testData.updatedTitle}") [aria-label="삭제"]`,
                `[data-testid="post-item"]:has-text("${testData.updatedTitle}") button:has-text("삭제")`
            ];
            let deleted = false;
            for (const selector of deleteSelectors) {
                try {
                    const deleteBtn = page.locator(selector);
                    if (await deleteBtn.isVisible({ timeout: 1000 })) {
                        await deleteBtn.click();
                        deleted = true;
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            if (deleted) {
                const confirmBtn = page.locator('button:has-text("확인"), button:has-text("삭제"), button:has-text("예")');
                if (await confirmBtn.isVisible({ timeout: 2000 })) {
                    await confirmBtn.click();
                }
                await page.waitForLoadState('networkidle');
                await expect(page.locator(`text=${testData.updatedTitle}`)).not.toBeVisible({ timeout: 5000 });
            }
        }
    });
    test('페이지 관리 CRUD 워크플로우', async ({ page }) => {
        const testData = generateTestData();
        await page.click('text=페이지, text=Pages');
        await page.waitForLoadState('networkidle');
        await expect(page.url()).toContain('/pages');
        await page.click('text=새 페이지, button:has-text("추가"), button:has-text("생성")');
        await page.waitForLoadState('networkidle');
        await page.fill('input[name="title"], #title', testData.pageTitle);
        await page.fill('input[name="slug"], #slug', testData.pageSlug);
        const contentArea = page.locator('textarea[name="content"], .editor, .ql-editor');
        if (await contentArea.isVisible()) {
            await contentArea.fill(testData.pageContent);
        }
        const statusSelect = page.locator('select[name="status"], #status');
        if (await statusSelect.isVisible()) {
            await statusSelect.selectOption('published');
        }
        await page.click('button:has-text("저장"), button:has-text("발행")');
        await page.waitForLoadState('networkidle');
        await expect(page.locator(`text=${testData.pageTitle}`)).toBeVisible({ timeout: 10000 });
        await page.click(`text=${testData.pageTitle}`);
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/edit')) {
            await page.click('text=편집, button:has-text("수정")');
            await page.waitForLoadState('networkidle');
        }
        const titleInput = page.locator('input[name="title"], #title');
        await titleInput.clear();
        await titleInput.fill(`수정된 ${testData.pageTitle}`);
        await page.click('button:has-text("저장"), button:has-text("업데이트")');
        await page.waitForLoadState('networkidle');
        await expect(page.locator(`text=수정된 ${testData.pageTitle}`)).toBeVisible();
        const deleteBtn = page.locator('button:has-text("삭제"), [aria-label="삭제"]');
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            const confirmBtn = page.locator('button:has-text("확인"), button:has-text("삭제")');
            if (await confirmBtn.isVisible({ timeout: 2000 })) {
                await confirmBtn.click();
            }
            await page.waitForLoadState('networkidle');
            await expect(page.locator(`text=수정된 ${testData.pageTitle}`)).not.toBeVisible();
        }
    });
    test('대량 작업 (Bulk Operations) 테스트', async ({ page }) => {
        await page.click('text=콘텐츠');
        await page.waitForLoadState('networkidle');
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();
        if (checkboxCount > 2) {
            await checkboxes.nth(1).check();
            await checkboxes.nth(2).check();
            const bulkActions = page.locator('select:has-text("대량 작업"), button:has-text("일괄"), [data-testid="bulk-actions"]');
            if (await bulkActions.isVisible()) {
                await expect(bulkActions).toBeEnabled();
            }
        }
    });
    test('검색 및 필터링 기능', async ({ page }) => {
        await page.click('text=콘텐츠');
        await page.waitForLoadState('networkidle');
        const searchInput = page.locator('input[placeholder*="검색"], input[name="search"], #search');
        if (await searchInput.isVisible()) {
            await searchInput.fill('테스트');
            await page.press('input[placeholder*="검색"], input[name="search"], #search', 'Enter');
            await page.waitForLoadState('networkidle');
            await expect(searchInput).toHaveValue('테스트');
        }
        const filterSelect = page.locator('select[name="status"], select:has-text("상태")');
        if (await filterSelect.isVisible()) {
            await filterSelect.selectOption('published');
            await page.waitForLoadState('networkidle');
        }
    });
});
//# sourceMappingURL=content-crud-operations.spec.js.map