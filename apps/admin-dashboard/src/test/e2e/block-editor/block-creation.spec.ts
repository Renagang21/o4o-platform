import { test, expect } from '@playwright/test';
import { BlockEditorHelpers } from '../../helpers/block-helpers';

/**
 * TC001: 블록 생성 테스트 (Block Creation)
 * 
 * 테스트 시나리오:
 * 1. 단락 블록 생성
 * 2. 제목 블록 생성
 * 3. 여러 블록 생성
 * 4. 블록 인서터 상태 확인
 */

test.describe('블록 생성 테스트', () => {
  let helpers: BlockEditorHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new BlockEditorHelpers(page);
    await helpers.navigateToEditor();
  });

  test('단락 블록 생성', async ({ page }) => {
    // Given: 블록 에디터 페이지 접속
    await expect(page.locator('[data-testid="block-editor"]')).toBeVisible();

    // When: '블록 추가' 버튼 클릭 → '단락' 선택
    await page.click('[data-testid="block-inserter"]');
    await page.waitForSelector('[data-testid="block-paragraph"]', { state: 'visible' });
    await page.click('[data-testid="block-paragraph"]');

    // Then: 새 단락 블록이 생성되고 편집 모드로 전환
    await expect(page.locator('[data-block-type="paragraph"]')).toBeVisible();
    await expect(page.locator('[data-block-type="paragraph"] .ProseMirror')).toBeFocused();
    
    // 생성된 블록 개수 확인
    const blockCount = await helpers.getBlockCount();
    expect(blockCount).toBe(1);
  });

  test('제목 블록 생성', async ({ page }) => {
    // Given: 블록 에디터 페이지 접속
    await expect(page.locator('[data-testid="block-editor"]')).toBeVisible();

    // When: '블록 추가' 버튼 클릭 → '제목' 선택
    await page.click('[data-testid="block-inserter"]');
    await page.waitForSelector('[data-testid="block-heading"]', { state: 'visible' });
    await page.click('[data-testid="block-heading"]');

    // Then: 새 제목 블록 생성, 기본 H2 레벨 설정
    await expect(page.locator('[data-block-type="heading"]')).toBeVisible();
    await expect(page.locator('[data-block-type="heading"] h2')).toBeVisible();
    
    // 생성된 블록 개수 확인
    const blockCount = await helpers.getBlockCount();
    expect(blockCount).toBe(1);
  });

  test('여러 블록 생성', async ({ page }) => {
    // Given: 블록 에디터 페이지 접속
    await expect(page.locator('[data-testid="block-editor"]')).toBeVisible();

    // When: 단락 블록 3개 생성
    const block1Id = await helpers.createParagraphBlock('첫 번째 단락');
    const block2Id = await helpers.createParagraphBlock('두 번째 단락');
    const block3Id = await helpers.createParagraphBlock('세 번째 단락');

    // Then: 3개의 블록이 생성되고 올바른 순서로 배치됨
    const blockCount = await helpers.getBlockCount();
    expect(blockCount).toBe(3);
    
    // 블록 순서 확인
    const blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([block1Id, block2Id, block3Id]);
    
    // 각 블록의 콘텐츠 확인
    await expect(page.locator(`[data-block-id="${block1Id}"]`)).toContainText('첫 번째 단락');
    await expect(page.locator(`[data-block-id="${block2Id}"]`)).toContainText('두 번째 단락');
    await expect(page.locator(`[data-block-id="${block3Id}"]`)).toContainText('세 번째 단락');
  });

  test('제목 블록 다양한 레벨 생성', async ({ page }) => {
    // Given: 블록 에디터 페이지 접속
    await expect(page.locator('[data-testid="block-editor"]')).toBeVisible();

    // When: 다양한 레벨의 제목 블록 생성
    const h1Id = await helpers.createHeadingBlock('제목 1', 1);
    const h2Id = await helpers.createHeadingBlock('제목 2', 2);
    const h3Id = await helpers.createHeadingBlock('제목 3', 3);

    // Then: 각 레벨의 제목 블록이 올바르게 생성됨
    await expect(page.locator(`[data-block-id="${h1Id}"] h1`)).toBeVisible();
    await expect(page.locator(`[data-block-id="${h2Id}"] h2`)).toBeVisible();
    await expect(page.locator(`[data-block-id="${h3Id}"] h3`)).toBeVisible();
    
    // 콘텐츠 확인
    await expect(page.locator(`[data-block-id="${h1Id}"] h1`)).toContainText('제목 1');
    await expect(page.locator(`[data-block-id="${h2Id}"] h2`)).toContainText('제목 2');
    await expect(page.locator(`[data-block-id="${h3Id}"] h3`)).toContainText('제목 3');
  });

  test('블록 인서터 상태 확인', async ({ page }) => {
    // Given: 블록 에디터 페이지 접속
    await expect(page.locator('[data-testid="block-editor"]')).toBeVisible();

    // When: 블록 인서터 열기
    await page.click('[data-testid="block-inserter"]');

    // Then: 블록 인서터 패널이 표시됨
    await expect(page.locator('[data-testid="block-inserter-panel"]')).toBeVisible();
    
    // 기본 블록 타입들이 표시됨
    await expect(page.locator('[data-testid="block-paragraph"]')).toBeVisible();
    await expect(page.locator('[data-testid="block-heading"]')).toBeVisible();
    
    // 블록 선택 후 인서터 패널 닫힘
    await page.click('[data-testid="block-paragraph"]');
    await expect(page.locator('[data-testid="block-inserter-panel"]')).not.toBeVisible();
  });

  test('빈 에디터 상태 확인', async ({ page }) => {
    // Given: 블록 에디터 페이지 접속
    await expect(page.locator('[data-testid="block-editor"]')).toBeVisible();

    // Then: 빈 에디터 상태 메시지 표시
    await expect(page.locator('.text-center')).toContainText('첫 번째 블록을 추가하여 콘텐츠 작성을 시작하세요');
    
    // 블록 추가 버튼 표시
    await expect(page.locator('[data-testid="block-inserter"]')).toBeVisible();
    
    // 블록 개수 0 확인
    const blockCount = await helpers.getBlockCount();
    expect(blockCount).toBe(0);
  });
});