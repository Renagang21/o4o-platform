import { Page, expect } from '@playwright/test';

/**
 * 블록 에디터 E2E 테스트 헬퍼 클래스
 */
export class BlockEditorHelpers {
  constructor(private page: Page) {}

  /**
   * 블록 에디터 페이지로 이동하고 초기화 대기
   */
  async navigateToEditor() {
    await this.page.goto('/block-editor');
    
    // 에디터가 완전히 로드될 때까지 대기
    await this.page.waitForSelector('[data-testid="block-editor"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    // 블록 레지스트리 초기화 대기 (약간의 지연)
    await this.page.waitForTimeout(1000);
  }

  /**
   * 단락 블록 생성
   */
  async createParagraphBlock(content?: string): Promise<string> {
    // 블록 추가 버튼 클릭
    await this.page.click('[data-testid="block-inserter"]');
    
    // 단락 블록 선택 (카테고리에서 찾기)
    await this.page.waitForSelector('[data-testid="block-paragraph"]', { 
      state: 'visible' 
    });
    await this.page.click('[data-testid="block-paragraph"]');
    
    // 새로 생성된 블록 ID 가져오기
    const blockElement = this.page.locator('[data-block-type="paragraph"]').last();
    await blockElement.waitFor({ state: 'visible' });
    const blockId = await blockElement.getAttribute('data-block-id');
    
    // 콘텐츠 입력
    if (content) {
      await this.enterBlockContent(blockId!, content);
    }
    
    return blockId!;
  }

  /**
   * 제목 블록 생성
   */
  async createHeadingBlock(content?: string, level: number = 2): Promise<string> {
    // 블록 추가 버튼 클릭
    await this.page.click('[data-testid="block-inserter"]');
    
    // 제목 블록 선택
    await this.page.waitForSelector('[data-testid="block-heading"]', { 
      state: 'visible' 
    });
    await this.page.click('[data-testid="block-heading"]');
    
    // 새로 생성된 블록 ID 가져오기
    const blockElement = this.page.locator('[data-block-type="heading"]').last();
    await blockElement.waitFor({ state: 'visible' });
    const blockId = await blockElement.getAttribute('data-block-id');
    
    // 레벨 변경 (기본값이 2가 아닌 경우)
    if (level !== 2) {
      await this.selectHeadingLevel(blockId!, level);
    }
    
    // 콘텐츠 입력
    if (content) {
      await this.enterBlockContent(blockId!, content);
    }
    
    return blockId!;
  }

  /**
   * 블록 선택
   */
  async selectBlock(blockId: string) {
    const blockSelector = `[data-block-id="${blockId}"]`;
    await this.page.click(blockSelector);
    
    // 선택 상태 확인
    await expect(this.page.locator(blockSelector)).toHaveClass(/ring-2/);
  }

  /**
   * 블록 콘텐츠 입력 (편집 모드)
   */
  async enterBlockContent(blockId: string, content: string) {
    const blockSelector = `[data-block-id="${blockId}"]`;
    
    // 블록 클릭하여 선택
    await this.page.click(blockSelector);
    
    // 다시 클릭하여 편집 모드 진입
    await this.page.click(blockSelector);
    
    // 에디터가 편집 모드가 될 때까지 대기
    await this.page.waitForSelector(`${blockSelector} .ProseMirror`, { 
      state: 'visible' 
    });
    
    // 기존 내용 지우고 새 내용 입력
    await this.page.fill(`${blockSelector} .ProseMirror`, content);
  }

  /**
   * 제목 레벨 선택
   */
  async selectHeadingLevel(blockId: string, level: number) {
    const blockSelector = `[data-block-id="${blockId}"]`;
    
    // 블록 선택하고 편집 모드 진입
    await this.selectBlock(blockId);
    await this.page.click(blockSelector);
    
    // 레벨 선택 드롭다운 클릭
    await this.page.click(`${blockSelector} [data-testid="heading-level-select"]`);
    
    // 특정 레벨 선택
    await this.page.click(`[data-testid="heading-level-${level}"]`);
  }

  /**
   * 텍스트 포맷팅 적용 (굵게, 기울임 등)
   */
  async applyTextFormatting(blockId: string, format: 'bold' | 'italic') {
    const blockSelector = `[data-block-id="${blockId}"]`;
    
    // 블록의 모든 텍스트 선택
    await this.page.click(`${blockSelector} .ProseMirror`);
    await this.page.keyboard.press('Control+a');
    
    // 포맷팅 버튼 클릭
    await this.page.click(`${blockSelector} [data-testid="format-${format}"]`);
  }

  /**
   * 블록 드래그 앤 드롭
   */
  async dragBlockToPosition(sourceBlockId: string, targetBlockId: string, position: 'above' | 'below' = 'below') {
    const sourceSelector = `[data-block-id="${sourceBlockId}"]`;
    const targetSelector = `[data-block-id="${targetBlockId}"]`;
    
    // 소스 블록의 드래그 핸들 찾기
    const dragHandle = this.page.locator(`${sourceSelector} [data-testid="drag-handle"]`);
    
    // 타겟 블록의 위치 계산
    const targetBox = await this.page.locator(targetSelector).boundingBox();
    if (!targetBox) throw new Error('Target block not found');
    
    const targetY = position === 'above' ? targetBox.y : targetBox.y + targetBox.height;
    
    // 드래그 앤 드롭 실행
    await dragHandle.dragTo(this.page.locator(targetSelector), {
      targetPosition: { x: targetBox.x + targetBox.width / 2, y: targetY }
    });
  }

  /**
   * 블록 삭제
   */
  async deleteBlock(blockId: string) {
    await this.selectBlock(blockId);
    
    // 삭제 버튼 클릭 (툴바에서)
    await this.page.click(`[data-block-id="${blockId}"] [data-testid="block-delete"]`);
  }

  /**
   * 블록 복제
   */
  async duplicateBlock(blockId: string): Promise<string> {
    await this.selectBlock(blockId);
    
    // 복제 버튼 클릭
    await this.page.click(`[data-block-id="${blockId}"] [data-testid="block-duplicate"]`);
    
    // 새로 복제된 블록 찾기 (원본 블록 다음에 위치)
    const originalBlock = this.page.locator(`[data-block-id="${blockId}"]`);
    const duplicatedBlock = originalBlock.locator('xpath=following-sibling::*[1]');
    
    const newBlockId = await duplicatedBlock.getAttribute('data-block-id');
    return newBlockId!;
  }

  /**
   * 인스펙터 패널에서 속성 변경
   */
  async setBlockAlignment(blockId: string, alignment: 'left' | 'center' | 'right' | 'justify') {
    await this.selectBlock(blockId);
    
    // 인스펙터 패널에서 정렬 변경
    await this.page.click(`[data-testid="inspector-align-${alignment}"]`);
  }

  /**
   * 인스펙터 패널에서 텍스트 색상 변경
   */
  async setTextColor(blockId: string, color: string) {
    await this.selectBlock(blockId);
    
    // 색상 입력 필드에 값 설정
    await this.page.fill('[data-testid="text-color-input"]', color);
  }

  /**
   * 저장 버튼 클릭
   */
  async saveDocument() {
    await this.page.click('[data-testid="save-button"]');
    
    // 저장 완료 대기
    await this.page.waitForSelector('[data-testid="save-success"]', { 
      state: 'visible',
      timeout: 10000 
    });
  }

  /**
   * 블록 개수 확인
   */
  async getBlockCount(): Promise<number> {
    const blocks = this.page.locator('[data-block-id]');
    return await blocks.count();
  }

  /**
   * 특정 타입의 블록 개수 확인
   */
  async getBlockCountByType(blockType: string): Promise<number> {
    const blocks = this.page.locator(`[data-block-type="${blockType}"]`);
    return await blocks.count();
  }

  /**
   * 블록 순서 확인
   */
  async getBlockOrder(): Promise<string[]> {
    const blocks = this.page.locator('[data-block-id]');
    const count = await blocks.count();
    const order: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const blockId = await blocks.nth(i).getAttribute('data-block-id');
      if (blockId) order.push(blockId);
    }
    
    return order;
  }

  /**
   * 블록 콘텐츠 확인
   */
  async getBlockContent(blockId: string): Promise<string> {
    const blockSelector = `[data-block-id="${blockId}"]`;
    const contentElement = this.page.locator(`${blockSelector} .ProseMirror, ${blockSelector} [class*="content"]`);
    
    return await contentElement.textContent() || '';
  }

  /**
   * 에디터 상태 초기화 (모든 블록 삭제)
   */
  async clearEditor() {
    const blocks = this.page.locator('[data-block-id]');
    const count = await blocks.count();
    
    // 뒤에서부터 삭제 (인덱스 변경 방지)
    for (let i = count - 1; i >= 0; i--) {
      const blockId = await blocks.nth(i).getAttribute('data-block-id');
      if (blockId) {
        await this.deleteBlock(blockId);
      }
    }
  }
}