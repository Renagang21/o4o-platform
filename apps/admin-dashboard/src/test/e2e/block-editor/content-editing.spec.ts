import { test, expect } from '@playwright/test';
import { BlockEditorHelpers } from '../../helpers/block-helpers';

/**
 * TC002: 콘텐츠 편집 테스트 (Content Editing)
 * 
 * 테스트 시나리오:
 * 1. 단락 블록 텍스트 입력 및 포맷팅
 * 2. 제목 블록 레벨 변경
 * 3. 텍스트 선택 및 포맷팅
 * 4. 실시간 편집 확인
 */

test.describe('콘텐츠 편집 테스트', () => {
  let helpers: BlockEditorHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new BlockEditorHelpers(page);
    await helpers.navigateToEditor();
  });

  test('단락 블록 텍스트 입력 및 포맷팅', async ({ page }) => {
    // Given: 단락 블록이 있는 상태
    const blockId = await helpers.createParagraphBlock();

    // When: 텍스트 입력
    await helpers.enterBlockContent(blockId, '이것은 테스트 텍스트입니다.');

    // Then: 텍스트가 입력됨
    const content = await helpers.getBlockContent(blockId);
    expect(content).toContain('이것은 테스트 텍스트입니다.');

    // When: 텍스트 선택 후 굵게 적용
    await helpers.selectBlock(blockId);
    await helpers.applyTextFormatting(blockId, 'bold');

    // Then: 굵은 글씨 적용됨
    await expect(page.locator(`[data-block-id="${blockId}"] strong`)).toBeVisible();
  });

  test('제목 블록 레벨 변경', async ({ page }) => {
    // Given: 제목 블록이 있는 상태
    const blockId = await helpers.createHeadingBlock('제목 테스트', 2);

    // When: 제목 텍스트 확인
    await expect(page.locator(`[data-block-id="${blockId}"] h2`)).toContainText('제목 테스트');

    // When: 툴바에서 H1으로 레벨 변경
    await helpers.selectHeadingLevel(blockId, 1);

    // Then: H1 태그로 변경됨
    await expect(page.locator(`[data-block-id="${blockId}"] h1`)).toContainText('제목 테스트');
    await expect(page.locator(`[data-block-id="${blockId}"] h2`)).not.toBeVisible();
  });

  test('텍스트 선택 및 기울임 포맷팅', async ({ page }) => {
    // Given: 단락 블록이 있는 상태
    const blockId = await helpers.createParagraphBlock('기울임 테스트 텍스트');

    // When: 텍스트 선택 후 기울임 적용
    await helpers.selectBlock(blockId);
    await helpers.applyTextFormatting(blockId, 'italic');

    // Then: 기울임 글씨 적용됨
    await expect(page.locator(`[data-block-id="${blockId}"] em`)).toBeVisible();
  });

  test('실시간 편집 확인', async ({ page }) => {
    // Given: 단락 블록이 있는 상태
    const blockId = await helpers.createParagraphBlock();

    // When: 한 글자씩 입력
    await helpers.selectBlock(blockId);
    await page.click(`[data-block-id="${blockId}"] .ProseMirror`);
    await page.keyboard.type('실시간', { delay: 100 });

    // Then: 실시간으로 텍스트가 나타남
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toContainText('실시간');

    // When: 추가 텍스트 입력
    await page.keyboard.type(' 편집 테스트', { delay: 100 });

    // Then: 전체 텍스트가 표시됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toContainText('실시간 편집 테스트');
  });

  test('제목 블록 전체 레벨 변경', async ({ page }) => {
    // Given: 다양한 레벨의 제목 블록들이 있는 상태
    const h1Id = await helpers.createHeadingBlock('제목 1', 1);
    const h2Id = await helpers.createHeadingBlock('제목 2', 2);
    const h3Id = await helpers.createHeadingBlock('제목 3', 3);

    // When: H2를 H4로 변경
    await helpers.selectHeadingLevel(h2Id, 4);

    // Then: H4 태그로 변경됨
    await expect(page.locator(`[data-block-id="${h2Id}"] h4`)).toContainText('제목 2');
    await expect(page.locator(`[data-block-id="${h2Id}"] h2`)).not.toBeVisible();

    // When: H3을 H1으로 변경
    await helpers.selectHeadingLevel(h3Id, 1);

    // Then: H1 태그로 변경됨
    await expect(page.locator(`[data-block-id="${h3Id}"] h1`)).toContainText('제목 3');
    await expect(page.locator(`[data-block-id="${h3Id}"] h3`)).not.toBeVisible();
  });

  test('복잡한 텍스트 편집', async ({ page }) => {
    // Given: 단락 블록이 있는 상태
    const blockId = await helpers.createParagraphBlock();

    // When: 복잡한 텍스트 입력
    await helpers.enterBlockContent(blockId, '첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.');

    // Then: 전체 텍스트가 입력됨
    const content = await helpers.getBlockContent(blockId);
    expect(content).toContain('첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.');

    // When: 특정 단어 선택하여 편집
    await page.click(`[data-block-id="${blockId}"] .ProseMirror`);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type('편집된 새로운 텍스트입니다.');

    // Then: 새로운 텍스트로 변경됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toContainText('편집된 새로운 텍스트입니다.');
  });

  test('키보드 단축키 편집', async ({ page }) => {
    // Given: 단락 블록이 있는 상태
    const blockId = await helpers.createParagraphBlock('단축키 테스트');

    // When: 전체 선택 후 굵게 (Ctrl+B)
    await page.click(`[data-block-id="${blockId}"] .ProseMirror`);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+b');

    // Then: 굵은 글씨 적용됨
    await expect(page.locator(`[data-block-id="${blockId}"] strong`)).toBeVisible();

    // When: 일부 선택 후 기울임 (Ctrl+I)
    await page.keyboard.press('Control+i');

    // Then: 기울임도 적용됨
    await expect(page.locator(`[data-block-id="${blockId}"] em`)).toBeVisible();
  });

  test('빈 블록 편집 상태', async ({ page }) => {
    // Given: 단락 블록이 있는 상태
    const blockId = await helpers.createParagraphBlock();

    // When: 블록 선택 후 편집 모드 진입
    await helpers.selectBlock(blockId);
    await page.click(`[data-block-id="${blockId}"] .ProseMirror`);

    // Then: 편집 모드 상태 확인
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toBeFocused();
    
    // 플레이스홀더가 표시됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toHaveAttribute('data-placeholder');
  });
});