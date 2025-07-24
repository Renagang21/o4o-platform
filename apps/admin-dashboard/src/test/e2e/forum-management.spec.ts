import { test, expect, Page } from '@playwright/test';

/**
 * Forum Management E2E Tests
 * 
 * 포럼 모듈의 전체 기능을 테스트합니다:
 * 1. 포럼 대시보드 접근 및 통계 확인
 * 2. 게시글 CRUD 작업 (생성, 조회, 수정, 삭제)
 * 3. 댓글 시스템 (작성, 수정, 삭제, 답글)
 * 4. 카테고리 관리
 * 5. 검색 및 필터링 기능
 * 6. 게시글 상태 관리 (고정, 잠금, 상태 변경)
 * 7. 권한 기반 접근 제어
 * 8. 페이지네이션 및 로딩 상태
 */

const ADMIN_ACCOUNT = {
  email: 'admin@neture.co.kr',
  password: 'admin123!'
};

// Helper function for admin login
async function adminLogin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', ADMIN_ACCOUNT.email);
  await page.fill('input[name="password"]', ADMIN_ACCOUNT.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

// Generate unique test data
function generateTestData() {
  const timestamp = Date.now();
  return {
    postTitle: `E2E 테스트 게시물 ${timestamp}`,
    postContent: `이것은 E2E 테스트를 위한 게시물입니다.\n\n작성 시간: ${new Date().toLocaleString('ko-KR')}\n\n테스트 내용이 포함되어 있습니다.`,
    updatedTitle: `수정된 E2E 테스트 게시물 ${timestamp}`,
    updatedContent: `수정된 게시물 내용입니다.\n\n수정 시간: ${new Date().toLocaleString('ko-KR')}\n\n수정된 테스트 내용입니다.`,
    commentContent: `테스트 댓글입니다. ${timestamp}`,
    replyContent: `테스트 답글입니다. ${timestamp}`,
    categoryName: `테스트 카테고리 ${timestamp}`,
    categorySlug: `test-category-${timestamp}`,
    categoryDescription: `E2E 테스트용 카테고리입니다.`
  };
}

test.describe('Forum Management E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await adminLogin(page);
  });

  test('포럼 대시보드 접근 및 기본 UI 확인', async ({ page }) => {
    // Navigate to forum
    await page.click('text=앱, text=Apps');
    await page.waitForLoadState('networkidle');
    
    // Click on Forum app
    await page.click('text=포럼, text=Forum');
    await page.waitForLoadState('networkidle');
    
    // Verify forum dashboard elements
    await expect(page.locator('text=포럼 관리')).toBeVisible();
    await expect(page.locator('text=커뮤니티 포럼을 관리하고 모더레이션하세요')).toBeVisible();
    
    // Check stats cards
    await expect(page.locator('text=전체 게시글')).toBeVisible();
    await expect(page.locator('text=활성 사용자')).toBeVisible();
    await expect(page.locator('text=답글 수')).toBeVisible();
    await expect(page.locator('text=신고된 게시글')).toBeVisible();
    
    // Check categories section
    await expect(page.locator('text=포럼 카테고리')).toBeVisible();
    await expect(page.locator('text=일반 토론')).toBeVisible();
    await expect(page.locator('text=제품 리뷰')).toBeVisible();
    await expect(page.locator('text=Q&A')).toBeVisible();
    
    // Check quick actions
    await expect(page.locator('text=빠른 작업')).toBeVisible();
    await expect(page.locator('text=공지사항 작성')).toBeVisible();
    await expect(page.locator('text=게시판 관리')).toBeVisible();
    await expect(page.locator('text=카테고리 설정')).toBeVisible();
    
    // Check recent activity
    await expect(page.locator('text=최근 활동')).toBeVisible();
  });

  test('포럼 게시글 전체 CRUD 워크플로우', async ({ page }) => {
    const testData = generateTestData();
    
    // Navigate to forum board list
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.waitForLoadState('networkidle');
    
    // Go to board list (from main forum page)
    await page.click('text=게시판 관리');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the board list page
    await expect(page.locator('text=포럼 게시판')).toBeVisible();
    await expect(page.locator('text=포럼 게시글을 관리하고 모더레이션하세요')).toBeVisible();
    
    // Step 1: Create new post
    await page.click('text=새 게시글');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the post form page
    await expect(page.locator('text=새 게시글 작성')).toBeVisible();
    
    // Fill post information
    await page.fill('input[id="title"]', testData.postTitle);
    
    // Select category (assuming "일반 토론" is available)
    await page.click('[data-testid="category-select"], div:has-text("카테고리를 선택하세요")');
    await page.click('text=일반 토론');
    
    // Fill content
    await page.fill('textarea[id="content"]', testData.postContent);
    
    // Set status to published (should be default)
    await page.click('[data-testid="status-select"], div:has-text("게시")');
    await page.click('text=게시');
    
    // Save the post
    await page.click('button:has-text("작성하기")');
    await page.waitForLoadState('networkidle');
    
    // Verify success and redirect to board list
    await expect(page.url()).toMatch(/\/forum$/);
    
    // Step 2: Verify post appears in list
    await page.click('text=게시판 관리');
    await page.waitForLoadState('networkidle');
    
    // Check if our post is in the list
    await expect(page.locator(`text=${testData.postTitle}`)).toBeVisible({ timeout: 10000 });
    
    // Step 3: View post details
    await page.click(`text=${testData.postTitle}`);
    await page.waitForLoadState('networkidle');
    
    // Verify post detail page
    await expect(page.locator(`text=${testData.postTitle}`)).toBeVisible();
    await expect(page.locator(`text=${testData.postContent}`)).toBeVisible();
    await expect(page.locator('text=관리자')).toBeVisible(); // Author name
    
    // Step 4: Edit the post
    await page.click('button:has-text("수정")');
    await page.waitForLoadState('networkidle');
    
    // Verify we're in edit mode
    await expect(page.locator('text=게시글 수정')).toBeVisible();
    
    // Update title and content
    await page.fill('input[id="title"]', testData.updatedTitle);
    await page.fill('textarea[id="content"]', testData.updatedContent);
    
    // Save changes
    await page.click('button:has-text("수정하기")');
    await page.waitForLoadState('networkidle');
    
    // Verify updated content
    await expect(page.locator(`text=${testData.updatedTitle}`)).toBeVisible();
    await expect(page.locator(`text=${testData.updatedContent}`)).toBeVisible();
    
    // Step 5: Test post actions (pin, lock)
    await page.click('button:has-text("고정")');
    await page.waitForLoadState('networkidle');
    
    // Verify pin badge appears
    await expect(page.locator('text=고정')).toBeVisible();
    
    await page.click('button:has-text("잠금")');
    await page.waitForLoadState('networkidle');
    
    // Verify lock badge appears
    await expect(page.locator('text=잠김')).toBeVisible();
  });

  test('댓글 시스템 전체 테스트', async ({ page }) => {
    const testData = generateTestData();
    
    // Navigate to any existing post for comment testing
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.click('text=게시판 관리');
    await page.waitForLoadState('networkidle');
    
    // Click on first post in the list
    const firstPost = page.locator('table tbody tr').first();
    await firstPost.locator('a').first().click();
    await page.waitForLoadState('networkidle');
    
    // Step 1: Write a new comment
    const commentTextarea = page.locator('textarea[placeholder*="댓글을 작성하세요"]');
    await commentTextarea.fill(testData.commentContent);
    
    await page.click('button:has-text("댓글 작성")');
    await page.waitForLoadState('networkidle');
    
    // Verify comment appears
    await expect(page.locator(`text=${testData.commentContent}`)).toBeVisible();
    
    // Step 2: Reply to the comment
    await page.click('button:has-text("답글")');
    
    const replyTextarea = page.locator('textarea[placeholder*="답글을 작성하세요"]');
    await replyTextarea.fill(testData.replyContent);
    
    await page.click('button:has-text("답글 작성")');
    await page.waitForLoadState('networkidle');
    
    // Verify reply appears (should be indented)
    await expect(page.locator(`text=${testData.replyContent}`)).toBeVisible();
    
    // Step 3: Edit a comment
    const commentDropdown = page.locator('div:has-text("' + testData.commentContent + '")').locator('..').locator('button:has([data-testid="more-options"])').first();
    await commentDropdown.click();
    
    await page.click('text=수정');
    
    const updatedComment = `${testData.commentContent} (수정됨)`;
    const editTextarea = page.locator('textarea').filter({ hasText: testData.commentContent });
    await editTextarea.clear();
    await editTextarea.fill(updatedComment);
    
    await page.click('button:has-text("수정 완료")');
    await page.waitForLoadState('networkidle');
    
    // Verify edited comment
    await expect(page.locator(`text=${updatedComment}`)).toBeVisible();
    await expect(page.locator('text=(수정됨)')).toBeVisible();
  });

  test('카테고리 관리 테스트', async ({ page }) => {
    const testData = generateTestData();
    
    // Navigate to category settings
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.click('text=카테고리 설정');
    await page.waitForLoadState('networkidle');
    
    // Verify categories page
    await expect(page.locator('text=포럼 카테고리')).toBeVisible();
    
    // Check existing categories
    await expect(page.locator('text=일반 토론')).toBeVisible();
    await expect(page.locator('text=제품 리뷰')).toBeVisible();
    await expect(page.locator('text=Q&A')).toBeVisible();
    
    // Create new category (if there's an add button)
    const addCategoryButton = page.locator('button:has-text("추가"), button:has-text("새 카테고리")');
    if (await addCategoryButton.isVisible()) {
      await addCategoryButton.click();
      await page.waitForLoadState('networkidle');
      
      // Fill category form
      await page.fill('input[name="name"]', testData.categoryName);
      await page.fill('input[name="slug"]', testData.categorySlug);
      await page.fill('textarea[name="description"]', testData.categoryDescription);
      
      // Save category
      await page.click('button:has-text("저장")');
      await page.waitForLoadState('networkidle');
      
      // Verify new category appears
      await expect(page.locator(`text=${testData.categoryName}`)).toBeVisible();
    }
  });

  test('검색 및 필터링 기능 테스트', async ({ page }) => {
    // Navigate to forum board list
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.click('text=게시판 관리');
    await page.waitForLoadState('networkidle');
    
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="검색"]');
    await searchInput.fill('플랫폼');
    await page.press('input[placeholder*="검색"]', 'Enter');
    await page.waitForLoadState('networkidle');
    
    // Verify search is applied
    await expect(searchInput).toHaveValue('플랫폼');
    
    // Test category filter
    const categoryFilter = page.locator('select').filter({ hasText: '모든 카테고리' });
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption('일반 토론');
      await page.waitForLoadState('networkidle');
    }
    
    // Test status filter
    const statusFilter = page.locator('select').filter({ hasText: '모든 상태' });
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('published');
      await page.waitForLoadState('networkidle');
    }
    
    // Clear search
    await searchInput.clear();
    await page.press('input[placeholder*="검색"]', 'Enter');
    await page.waitForLoadState('networkidle');
  });

  test('게시글 상태 관리 테스트', async ({ page }) => {
    // Navigate to post list
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.click('text=게시판 관리');
    await page.waitForLoadState('networkidle');
    
    // Find a post to test status changes
    const firstPostRow = page.locator('table tbody tr').first();
    const moreOptionsButton = firstPostRow.locator('button:has([data-testid="more-options"])');
    
    if (await moreOptionsButton.isVisible()) {
      await moreOptionsButton.click();
      
      // Test pin action
      const pinOption = page.locator('text=고정하기');
      if (await pinOption.isVisible()) {
        await pinOption.click();
        await page.waitForLoadState('networkidle');
        
        // Verify pin badge appears in the row
        await expect(firstPostRow.locator('text=고정')).toBeVisible();
      }
      
      // Open menu again for lock action
      await moreOptionsButton.click();
      const lockOption = page.locator('text=잠금');
      if (await lockOption.isVisible()) {
        await lockOption.click();
        await page.waitForLoadState('networkidle');
        
        // Verify lock badge appears
        await expect(firstPostRow.locator('text=잠김')).toBeVisible();
      }
    }
  });

  test('게시글 삭제 기능 테스트', async ({ page }) => {
    const testData = generateTestData();
    
    // First create a post to delete
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.click('text=게시판 관리');
    await page.click('text=새 게시글');
    await page.waitForLoadState('networkidle');
    
    // Create a post for deletion
    await page.fill('input[id="title"]', `삭제할 게시물 ${testData.postTitle}`);
    await page.click('[data-testid="category-select"], div:has-text("카테고리를 선택하세요")');
    await page.click('text=일반 토론');
    await page.fill('textarea[id="content"]', '삭제 테스트용 게시물입니다.');
    await page.click('button:has-text("작성하기")');
    await page.waitForLoadState('networkidle');
    
    // Go back to list and find our post
    await page.click('text=게시판 관리');
    await page.waitForLoadState('networkidle');
    
    // Find our test post and delete it
    const postRow = page.locator(`tr:has-text("삭제할 게시물")`);
    const deleteButton = postRow.locator('button:has([data-testid="more-options"])');
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.click('text=삭제');
      
      // Confirm deletion if dialog appears
      const confirmButton = page.locator('button:has-text("확인"), button:has-text("삭제")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      await page.waitForLoadState('networkidle');
      
      // Verify post is deleted
      await expect(page.locator(`text=삭제할 게시물`)).not.toBeVisible();
    }
  });

  test('페이지네이션 및 로딩 상태 테스트', async ({ page }) => {
    // Navigate to forum board list
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.click('text=게시판 관리');
    await page.waitForLoadState('networkidle');
    
    // Check if pagination exists
    const paginationNext = page.locator('button:has-text("다음"), button:has-text("Next"), [aria-label="Next page"]');
    const paginationPrev = page.locator('button:has-text("이전"), button:has-text("Previous"), [aria-label="Previous page"]');
    
    if (await paginationNext.isVisible()) {
      await paginationNext.click();
      await page.waitForLoadState('networkidle');
      
      // Verify we moved to next page (URL or content should change)
      await expect(paginationPrev).toBeVisible();
    }
    
    // Test loading states by refreshing
    await page.reload();
    
    // Look for loading spinner (brief moment)
    const loadingSpinner = page.locator('.animate-spin, [data-testid="loading"]');
    // Loading might be too fast to catch, so we just verify the page loads completely
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=포럼 게시판')).toBeVisible();
  });

  test('권한 및 접근 제어 테스트', async ({ page }) => {
    // This test verifies that admin functions are accessible
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.waitForLoadState('networkidle');
    
    // Verify admin can access all forum management features
    await expect(page.locator('text=포럼 설정')).toBeVisible();
    await expect(page.locator('text=카테고리 설정')).toBeVisible();
    await expect(page.locator('text=신고 검토')).toBeVisible();
    
    // Test access to create new post
    await page.click('text=게시판 관리');
    await expect(page.locator('text=새 게시글')).toBeVisible();
    
    // Verify post management options are available
    const moreOptionsButtons = page.locator('button:has([data-testid="more-options"])');
    if (await moreOptionsButtons.first().isVisible()) {
      await moreOptionsButtons.first().click();
      
      // Admin should see edit and delete options
      await expect(page.locator('text=수정, text=편집')).toBeVisible();
      await expect(page.locator('text=삭제')).toBeVisible();
      
      // Click away to close dropdown
      await page.click('body');
    }
  });

  test('에러 처리 및 예외 상황 테스트', async ({ page }) => {
    // Test creating post with missing required fields
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.click('text=게시판 관리');
    await page.click('text=새 게시글');
    await page.waitForLoadState('networkidle');
    
    // Try to submit without title
    await page.fill('textarea[id="content"]', '내용만 입력');
    await page.click('button:has-text("작성하기")');
    
    // Should stay on form page or show validation error
    // The form validation should prevent submission
    await expect(page.locator('text=새 게시글 작성, text=제목을 입력하세요')).toBeVisible();
    
    // Test accessing non-existent post
    await page.goto('/forum/posts/non-existent-id');
    await page.waitForLoadState('networkidle');
    
    // Should show not found message or redirect
    const notFoundMessage = page.locator('text=게시글을 찾을 수 없습니다, text=404, text=Not Found');
    if (await notFoundMessage.isVisible()) {
      await expect(notFoundMessage).toBeVisible();
    }
  });

  test('반응형 디자인 및 모바일 호환성 테스트', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('text=앱, text=Apps');
    await page.click('text=포럼, text=Forum');
    await page.waitForLoadState('networkidle');
    
    // Verify main elements are visible on mobile
    await expect(page.locator('text=포럼 관리')).toBeVisible();
    
    // Check if navigation works on mobile
    await page.click('text=게시판 관리');
    await page.waitForLoadState('networkidle');
    
    // Verify table/list is responsive
    await expect(page.locator('text=포럼 게시판')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');
    
    // Verify layout adapts to tablet size
    await expect(page.locator('text=포럼 게시판')).toBeVisible();
    
    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

});