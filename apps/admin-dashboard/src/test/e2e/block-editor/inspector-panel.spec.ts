import { test, expect } from '@playwright/test';
import { BlockEditorHelpers } from '../../helpers/block-helpers';

/**
 * TC004: 인스펙터 패널 테스트 (Inspector Panel)
 * 
 * 테스트 시나리오:
 * 1. 단락 블록 정렬 변경
 * 2. 제목 블록 색상 변경
 * 3. 폰트 크기 변경
 * 4. 배경색 설정
 */

test.describe('인스펙터 패널 테스트', () => {
  let helpers: BlockEditorHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new BlockEditorHelpers(page);
    await helpers.navigateToEditor();
  });

  test('단락 블록 정렬 변경', async ({ page }) => {
    // Given: 단락 블록이 있고 선택된 상태
    const blockId = await helpers.createParagraphBlock('정렬 테스트 텍스트');
    await helpers.selectBlock(blockId);

    // Then: 인스펙터 패널이 표시됨
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible();

    // When: 인스펙터 패널에서 가운데 정렬 선택
    await page.click('[data-testid="inspector-align-center"]');

    // Then: 블록이 가운데 정렬됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toHaveClass(/text-center/);

    // When: 오른쪽 정렬 선택
    await page.click('[data-testid="inspector-align-right"]');

    // Then: 블록이 오른쪽 정렬됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toHaveClass(/text-right/);

    // When: 왼쪽 정렬로 복원
    await page.click('[data-testid="inspector-align-left"]');

    // Then: 블록이 왼쪽 정렬됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toHaveClass(/text-left/);
  });

  test('제목 블록 색상 변경', async ({ page }) => {
    // Given: 제목 블록이 있고 선택된 상태
    const blockId = await helpers.createHeadingBlock('색상 테스트', 2);
    await helpers.selectBlock(blockId);

    // Then: 인스펙터 패널이 표시됨
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible();

    // When: 인스펙터 패널에서 텍스트 색상 변경
    await helpers.setTextColor(blockId, '#ff0000');

    // Then: 텍스트 색상이 빨간색으로 변경됨
    await expect(page.locator(`[data-block-id="${blockId}"] h2`)).toHaveCSS('color', 'rgb(255, 0, 0)');

    // When: 파란색으로 변경
    await helpers.setTextColor(blockId, '#0000ff');

    // Then: 텍스트 색상이 파란색으로 변경됨
    await expect(page.locator(`[data-block-id="${blockId}"] h2`)).toHaveCSS('color', 'rgb(0, 0, 255)');
  });

  test('폰트 크기 변경', async ({ page }) => {
    // Given: 단락 블록이 있고 선택된 상태
    const blockId = await helpers.createParagraphBlock('폰트 크기 테스트');
    await helpers.selectBlock(blockId);

    // When: 인스펙터 패널에서 큰 폰트 선택
    await page.click('[data-testid="inspector-font-size-large"]');

    // Then: 폰트 크기가 증가됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toHaveClass(/text-lg|text-xl/);

    // When: 작은 폰트 선택
    await page.click('[data-testid="inspector-font-size-small"]');

    // Then: 폰트 크기가 감소됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toHaveClass(/text-sm/);

    // When: 기본 폰트로 복원
    await page.click('[data-testid="inspector-font-size-normal"]');

    // Then: 기본 폰트 크기로 설정됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toHaveClass(/text-base/);
  });

  test('배경색 설정', async ({ page }) => {
    // Given: 단락 블록이 있고 선택된 상태
    const blockId = await helpers.createParagraphBlock('배경색 테스트');
    await helpers.selectBlock(blockId);

    // When: 인스펙터 패널에서 배경색 설정
    await page.fill('[data-testid="background-color-input"]', '#f0f0f0');

    // Then: 배경색이 적용됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toHaveCSS('background-color', 'rgb(240, 240, 240)');

    // When: 다른 배경색으로 변경
    await page.fill('[data-testid="background-color-input"]', '#ffffe0');

    // Then: 새로운 배경색이 적용됨
    await expect(page.locator(`[data-block-id="${blockId}"] .ProseMirror`)).toHaveCSS('background-color', 'rgb(255, 255, 224)');
  });

  test('제목 블록 정렬 변경', async ({ page }) => {
    // Given: 제목 블록이 있고 선택된 상태
    const blockId = await helpers.createHeadingBlock('제목 정렬 테스트', 1);
    await helpers.selectBlock(blockId);

    // When: 가운데 정렬 적용
    await helpers.setBlockAlignment(blockId, 'center');

    // Then: 제목이 가운데 정렬됨
    await expect(page.locator(`[data-block-id="${blockId}"] h1`)).toHaveClass(/text-center/);

    // When: 오른쪽 정렬 적용
    await helpers.setBlockAlignment(blockId, 'right');

    // Then: 제목이 오른쪽 정렬됨
    await expect(page.locator(`[data-block-id="${blockId}"] h1`)).toHaveClass(/text-right/);
  });

  test('복합 스타일 적용', async ({ page }) => {
    // Given: 단락 블록이 있고 선택된 상태
    const blockId = await helpers.createParagraphBlock('복합 스타일 테스트');
    await helpers.selectBlock(blockId);

    // When: 가운데 정렬 + 큰 폰트 + 빨간 텍스트 + 회색 배경
    await helpers.setBlockAlignment(blockId, 'center');
    await page.click('[data-testid="inspector-font-size-large"]');
    await helpers.setTextColor(blockId, '#ff0000');
    await page.fill('[data-testid="background-color-input"]', '#f5f5f5');

    // Then: 모든 스타일이 적용됨
    const blockElement = page.locator(`[data-block-id="${blockId}"] .ProseMirror`);
    await expect(blockElement).toHaveClass(/text-center/);
    await expect(blockElement).toHaveClass(/text-lg|text-xl/);
    await expect(blockElement).toHaveCSS('color', 'rgb(255, 0, 0)');
    await expect(blockElement).toHaveCSS('background-color', 'rgb(245, 245, 245)');
  });

  test('인스펙터 패널 블록 변경 시 업데이트', async ({ page }) => {
    // Given: 두 개의 서로 다른 블록이 있는 상태
    const paragraph1Id = await helpers.createParagraphBlock('첫 번째 단락');
    const paragraph2Id = await helpers.createParagraphBlock('두 번째 단락');

    // When: 첫 번째 블록 선택
    await helpers.selectBlock(paragraph1Id);

    // Then: 인스펙터 패널이 첫 번째 블록을 대상으로 함
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible();

    // When: 첫 번째 블록에 스타일 적용
    await helpers.setBlockAlignment(paragraph1Id, 'center');

    // When: 두 번째 블록 선택
    await helpers.selectBlock(paragraph2Id);

    // Then: 인스펙터 패널이 두 번째 블록을 대상으로 업데이트됨
    // 첫 번째 블록의 스타일은 유지되고, 두 번째 블록은 기본 상태
    await expect(page.locator(`[data-block-id="${paragraph1Id}"] .ProseMirror`)).toHaveClass(/text-center/);
    await expect(page.locator(`[data-block-id="${paragraph2Id}"] .ProseMirror`)).toHaveClass(/text-left/);
  });

  test('인스펙터 패널 숨김/표시', async ({ page }) => {
    // Given: 단락 블록이 있는 상태
    const blockId = await helpers.createParagraphBlock('패널 테스트');

    // When: 블록이 선택되지 않은 상태
    await page.click('.block-editor'); // 에디터 빈 공간 클릭

    // Then: 인스펙터 패널이 비어있거나 기본 상태
    const inspectorPanel = page.locator('[data-testid="inspector-panel"]');
    await expect(inspectorPanel).toBeVisible();

    // When: 블록 선택
    await helpers.selectBlock(blockId);

    // Then: 인스펙터 패널에 블록 설정이 표시됨
    await expect(page.locator('[data-testid="inspector-block-settings"]')).toBeVisible();
  });
});