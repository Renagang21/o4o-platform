import { test, expect } from '@playwright/test';
import { BlockEditorHelpers } from '../../helpers/block-helpers';

/**
 * TC003: 블록 재정렬 테스트 (Block Reordering)
 * 
 * 테스트 시나리오:
 * 1. 드래그 앤 드롭으로 블록 순서 변경
 * 2. 키보드로 블록 이동
 * 3. 복잡한 블록 순서 변경
 * 4. 블록 순서 확인
 */

test.describe('블록 재정렬 테스트', () => {
  let helpers: BlockEditorHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new BlockEditorHelpers(page);
    await helpers.navigateToEditor();
  });

  test('드래그 앤 드롭으로 블록 순서 변경', async ({ page }) => {
    // Given: 두 개의 블록이 있는 상태
    const firstBlockId = await helpers.createParagraphBlock('첫 번째 단락');
    const secondBlockId = await helpers.createParagraphBlock('두 번째 단락');

    // 초기 순서 확인
    let blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([firstBlockId, secondBlockId]);

    // When: 첫 번째 블록을 두 번째 블록 아래로 드래그
    await helpers.dragBlockToPosition(firstBlockId, secondBlockId, 'below');

    // Then: 블록 순서가 바뀜
    blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([secondBlockId, firstBlockId]);

    // 콘텐츠 순서 확인
    const blocks = page.locator('[data-block-id]');
    await expect(blocks.first()).toContainText('두 번째 단락');
    await expect(blocks.nth(1)).toContainText('첫 번째 단락');
  });

  test('키보드로 블록 이동', async ({ page }) => {
    // Given: 세 개의 블록이 있는 상태
    const block1Id = await helpers.createParagraphBlock('블록 1');
    const block2Id = await helpers.createParagraphBlock('블록 2');
    const block3Id = await helpers.createParagraphBlock('블록 3');

    // 초기 순서 확인
    let blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([block1Id, block2Id, block3Id]);

    // When: 첫 번째 블록 선택 후 키보드로 아래로 이동
    await helpers.selectBlock(block1Id);
    await page.keyboard.press('Alt+ArrowDown');

    // Then: 블록 순서가 바뀜 (1,2,3 → 2,1,3)
    blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([block2Id, block1Id, block3Id]);

    // When: 현재 두 번째 위치의 블록을 다시 아래로 이동
    await page.keyboard.press('Alt+ArrowDown');

    // Then: 블록이 마지막으로 이동 (2,1,3 → 2,3,1)
    blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([block2Id, block3Id, block1Id]);
  });

  test('복잡한 블록 순서 변경', async ({ page }) => {
    // Given: 다양한 타입의 블록들이 있는 상태
    const paragraphId = await helpers.createParagraphBlock('단락 블록');
    const headingId = await helpers.createHeadingBlock('제목 블록', 2);
    const paragraph2Id = await helpers.createParagraphBlock('두 번째 단락');
    const heading2Id = await helpers.createHeadingBlock('두 번째 제목', 1);

    // 초기 순서 확인
    let blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([paragraphId, headingId, paragraph2Id, heading2Id]);

    // When: 제목 블록을 맨 앞으로 이동
    await helpers.dragBlockToPosition(headingId, paragraphId, 'above');

    // Then: 순서 변경 확인
    blockOrder = await helpers.getBlockOrder();
    expect(blockOrder[0]).toBe(headingId);
    expect(blockOrder[1]).toBe(paragraphId);

    // When: 마지막 블록을 두 번째 위치로 이동
    await helpers.dragBlockToPosition(heading2Id, paragraphId, 'below');

    // Then: 최종 순서 확인
    blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([headingId, paragraphId, heading2Id, paragraph2Id]);
  });

  test('위로 이동 키보드 단축키', async ({ page }) => {
    // Given: 세 개의 블록이 있는 상태
    const block1Id = await helpers.createParagraphBlock('블록 1');
    const block2Id = await helpers.createParagraphBlock('블록 2');
    const block3Id = await helpers.createParagraphBlock('블록 3');

    // When: 세 번째 블록 선택 후 위로 이동
    await helpers.selectBlock(block3Id);
    await page.keyboard.press('Alt+ArrowUp');

    // Then: 블록 순서가 바뀜 (1,2,3 → 1,3,2)
    let blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([block1Id, block3Id, block2Id]);

    // When: 다시 위로 이동
    await page.keyboard.press('Alt+ArrowUp');

    // Then: 첫 번째 위치로 이동 (1,3,2 → 3,1,2)
    blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([block3Id, block1Id, block2Id]);
  });

  test('드래그 중 시각적 피드백 확인', async ({ page }) => {
    // Given: 두 개의 블록이 있는 상태
    const block1Id = await helpers.createParagraphBlock('드래그 소스');
    const block2Id = await helpers.createParagraphBlock('드래그 타겟');

    // When: 드래그 시작
    const dragHandle = page.locator(`[data-block-id="${block1Id}"] [data-testid="drag-handle"]`);
    
    // 드래그 핸들이 존재하는지 확인
    await expect(dragHandle).toBeVisible();

    // When: 드래그 중 상태 확인
    await dragHandle.hover();
    await page.mouse.down();

    // Then: 드래그 중 시각적 피드백 확인
    await expect(page.locator('.opacity-50')).toBeVisible(); // 드래그 오버레이
    
    // 드래그 완료
    const targetBlock = page.locator(`[data-block-id="${block2Id}"]`);
    await page.mouse.move(targetBlock.boundingBox().then(box => ({ x: box!.x, y: box!.y + box!.height })));
    await page.mouse.up();

    // Then: 순서가 변경됨
    const blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([block2Id, block1Id]);
  });

  test('빈 에디터에서 블록 추가 후 이동', async ({ page }) => {
    // Given: 빈 에디터 상태
    const blockCount = await helpers.getBlockCount();
    expect(blockCount).toBe(0);

    // When: 첫 번째 블록 추가
    const block1Id = await helpers.createParagraphBlock('첫 번째 블록');

    // When: 두 번째 블록 추가
    const block2Id = await helpers.createParagraphBlock('두 번째 블록');

    // When: 세 번째 블록 추가
    const block3Id = await helpers.createParagraphBlock('세 번째 블록');

    // Then: 순서 확인
    let blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([block1Id, block2Id, block3Id]);

    // When: 첫 번째 블록을 마지막으로 이동
    await helpers.selectBlock(block1Id);
    await page.keyboard.press('Alt+ArrowDown'); // 2번째로
    await page.keyboard.press('Alt+ArrowDown'); // 3번째로

    // Then: 최종 순서 확인
    blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([block2Id, block3Id, block1Id]);
  });

  test('블록 이동 불가능한 경우', async ({ page }) => {
    // Given: 한 개의 블록만 있는 상태
    const blockId = await helpers.createParagraphBlock('유일한 블록');

    // When: 위/아래로 이동 시도
    await helpers.selectBlock(blockId);
    await page.keyboard.press('Alt+ArrowUp');

    // Then: 순서 변경 없음 (이동할 곳이 없음)
    const blockOrder = await helpers.getBlockOrder();
    expect(blockOrder).toEqual([blockId]);

    // When: 아래로 이동 시도
    await page.keyboard.press('Alt+ArrowDown');

    // Then: 여전히 순서 변경 없음
    const finalOrder = await helpers.getBlockOrder();
    expect(finalOrder).toEqual([blockId]);
  });
});