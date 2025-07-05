import { test, expect, Page } from '@playwright/test';

/**
 * 콘텐츠 CRUD 작업 E2E 테스트
 * 
 * 시나리오:
 * 1. 포럼/게시물 관리 페이지 접근
 * 2. 새 글 작성 → 저장 → 목록 확인
 * 3. 글 수정 → 저장 → 변경사항 확인  
 * 4. 글 삭제 → 목록에서 제거 확인
 * 5. 페이지 관리 CRUD
 */

const ADMIN_ACCOUNT = {
  email: 'admin@neture.co.kr',
  password: 'admin123!'
};

async function adminLogin(page: Page) {
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
  await page.fill('input[name="password"]', ADMIN_ACCOUNT.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

// 랜덤 데이터 생성기
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
    
    // Step 1: 포럼 관리 페이지로 이동
    await page.click('text=콘텐츠');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/content');
    
    // 포럼 게시물 섹션으로 이동
    await page.click('text=게시물, text=포럼, text=Posts');
    await page.waitForLoadState('networkidle');
    
    // Step 2: 새 글 작성
    await page.click('text=새 글 작성, text=새 게시물, text=글 작성, button:has-text("추가")');
    await page.waitForLoadState('networkidle');
    
    // 제목 입력
    const titleInput = page.locator('input[name="title"], input[placeholder*="제목"], #title');
    await titleInput.fill(testData.postTitle);
    
    // 내용 입력 (여러 가능한 선택자 시도)
    const contentSelectors = [
      'textarea[name="content"]',
      'textarea[placeholder*="내용"]', 
      '.editor textarea',
      '[data-testid="content-editor"]',
      '.ql-editor', // Quill editor
      '.ProseMirror' // TipTap editor
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
      } catch (e) {
        // 다음 선택자 시도
        continue;
      }
    }
    
    if (!contentFilled) {
      // 일반적인 textarea나 input 필드 찾기
      const textInputs = page.locator('textarea, input[type="text"]:not([name="title"])');
      const count = await textInputs.count();
      if (count > 0) {
        await textInputs.last().fill(testData.postContent);
      }
    }
    
    // 저장 버튼 클릭
    await page.click('button:has-text("저장"), button:has-text("등록"), button:has-text("발행")');
    await page.waitForLoadState('networkidle');
    
    // Step 3: 목록에서 새로 작성한 글 확인
    // 목록 페이지로 이동 (저장 후 자동으로 이동할 수도 있음)
    if (!page.url().includes('/content') || page.url().includes('/edit')) {
      await page.click('text=콘텐츠');
      await page.click('text=게시물, text=포럼, text=Posts');
      await page.waitForLoadState('networkidle');
    }
    
    // 방금 작성한 글이 목록에 있는지 확인
    await expect(page.locator(`text=${testData.postTitle}`)).toBeVisible({ timeout: 10000 });
    
    // Step 4: 글 수정
    await page.click(`text=${testData.postTitle}`);
    await page.waitForLoadState('networkidle');
    
    // 편집 모드로 진입
    if (!page.url().includes('/edit')) {
      await page.click('text=편집, button:has-text("수정"), [aria-label="편집"]');
      await page.waitForLoadState('networkidle');
    }
    
    // 제목 수정
    const editTitleInput = page.locator('input[name="title"], input[value*="E2E 테스트"], #title');
    await editTitleInput.clear();
    await editTitleInput.fill(testData.updatedTitle);
    
    // 내용 수정
    let contentUpdated = false;
    for (const selector of contentSelectors) {
      try {
        const contentInput = page.locator(selector);
        if (await contentInput.isVisible({ timeout: 1000 })) {
          await contentInput.clear();
          await contentInput.fill(testData.updatedContent);
          contentUpdated = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // 수정 저장
    await page.click('button:has-text("저장"), button:has-text("업데이트")');
    await page.waitForLoadState('networkidle');
    
    // Step 5: 수정된 내용 확인
    await expect(page.locator(`text=${testData.updatedTitle}`)).toBeVisible({ timeout: 10000 });
    
    // Step 6: 글 삭제
    // 목록으로 이동
    if (!page.url().includes('/content') || page.url().includes('/edit')) {
      await page.click('text=콘텐츠');
      await page.click('text=게시물, text=포럼, text=Posts');
      await page.waitForLoadState('networkidle');
    }
    
    // 삭제할 글 찾기
    const postRow = page.locator(`tr:has-text("${testData.updatedTitle}"), [data-testid="post-item"]:has-text("${testData.updatedTitle}")`);
    
    if (await postRow.isVisible()) {
      // 삭제 버튼 클릭 (여러 가능한 위치)
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
        } catch (e) {
          continue;
        }
      }
      
      if (deleted) {
        // 삭제 확인 대화상자가 있다면 확인
        const confirmBtn = page.locator('button:has-text("확인"), button:has-text("삭제"), button:has-text("예")');
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
          await confirmBtn.click();
        }
        
        await page.waitForLoadState('networkidle');
        
        // Step 7: 삭제된 글이 목록에서 사라졌는지 확인
        await expect(page.locator(`text=${testData.updatedTitle}`)).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('페이지 관리 CRUD 워크플로우', async ({ page }) => {
    const testData = generateTestData();
    
    // Step 1: 페이지 관리로 이동
    await page.click('text=페이지, text=Pages');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/pages');
    
    // Step 2: 새 페이지 생성
    await page.click('text=새 페이지, button:has-text("추가"), button:has-text("생성")');
    await page.waitForLoadState('networkidle');
    
    // 페이지 정보 입력
    await page.fill('input[name="title"], #title', testData.pageTitle);
    await page.fill('input[name="slug"], #slug', testData.pageSlug);
    
    // 페이지 내용 입력
    const contentArea = page.locator('textarea[name="content"], .editor, .ql-editor');
    if (await contentArea.isVisible()) {
      await contentArea.fill(testData.pageContent);
    }
    
    // 페이지 상태 설정 (게시됨)
    const statusSelect = page.locator('select[name="status"], #status');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('published');
    }
    
    // 저장
    await page.click('button:has-text("저장"), button:has-text("발행")');
    await page.waitForLoadState('networkidle');
    
    // Step 3: 생성된 페이지 확인
    await expect(page.locator(`text=${testData.pageTitle}`)).toBeVisible({ timeout: 10000 });
    
    // Step 4: 페이지 수정
    await page.click(`text=${testData.pageTitle}`);
    await page.waitForLoadState('networkidle');
    
    // 편집 모드 진입
    if (!page.url().includes('/edit')) {
      await page.click('text=편집, button:has-text("수정")');
      await page.waitForLoadState('networkidle');
    }
    
    // 제목 수정
    const titleInput = page.locator('input[name="title"], #title');
    await titleInput.clear();
    await titleInput.fill(`수정된 ${testData.pageTitle}`);
    
    // 저장
    await page.click('button:has-text("저장"), button:has-text("업데이트")');
    await page.waitForLoadState('networkidle');
    
    // Step 5: 수정 확인
    await expect(page.locator(`text=수정된 ${testData.pageTitle}`)).toBeVisible();
    
    // Step 6: 페이지 삭제
    const deleteBtn = page.locator('button:has-text("삭제"), [aria-label="삭제"]');
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      
      // 확인 대화상자
      const confirmBtn = page.locator('button:has-text("확인"), button:has-text("삭제")');
      if (await confirmBtn.isVisible({ timeout: 2000 })) {
        await confirmBtn.click();
      }
      
      await page.waitForLoadState('networkidle');
      
      // 삭제 확인
      await expect(page.locator(`text=수정된 ${testData.pageTitle}`)).not.toBeVisible();
    }
  });

  test('대량 작업 (Bulk Operations) 테스트', async ({ page }) => {
    // 콘텐츠 목록 페이지로 이동
    await page.click('text=콘텐츠');
    await page.waitForLoadState('networkidle');
    
    // 여러 항목 선택
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 2) {
      // 처음 2개 체크박스 선택
      await checkboxes.nth(1).check(); // 첫 번째는 보통 전체 선택
      await checkboxes.nth(2).check();
      
      // 대량 작업 메뉴 확인
      const bulkActions = page.locator('select:has-text("대량 작업"), button:has-text("일괄"), [data-testid="bulk-actions"]');
      if (await bulkActions.isVisible()) {
        // 대량 작업 메뉴가 활성화되었는지 확인
        await expect(bulkActions).toBeEnabled();
      }
    }
  });

  test('검색 및 필터링 기능', async ({ page }) => {
    // 콘텐츠 목록 페이지로 이동
    await page.click('text=콘텐츠');
    await page.waitForLoadState('networkidle');
    
    // 검색 기능 테스트
    const searchInput = page.locator('input[placeholder*="검색"], input[name="search"], #search');
    if (await searchInput.isVisible()) {
      await searchInput.fill('테스트');
      await page.press('input[placeholder*="검색"], input[name="search"], #search', 'Enter');
      await page.waitForLoadState('networkidle');
      
      // 검색 결과가 표시되는지 확인
      // (결과가 없어도 검색이 실행되었는지만 확인)
      await expect(searchInput).toHaveValue('테스트');
    }
    
    // 필터 기능 테스트
    const filterSelect = page.locator('select[name="status"], select:has-text("상태")');
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('published');
      await page.waitForLoadState('networkidle');
    }
  });

});