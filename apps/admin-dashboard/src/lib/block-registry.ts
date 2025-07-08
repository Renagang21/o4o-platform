import { BlockDefinition, BlockType } from '@/types/block-editor';
import { nanoid } from 'nanoid';

/**
 * 블록 레지스트리 - WordPress Gutenberg와 유사한 블록 시스템
 */
export class BlockRegistry {
  private blocks: Map<string, BlockDefinition> = new Map();

  /**
   * 새 블록 타입 등록
   */
  register(blockDef: BlockDefinition): void {
    this.blocks.set(blockDef.name, blockDef);
  }

  /**
   * 블록 타입 해제
   */
  unregister(name: string): void {
    this.blocks.delete(name);
  }

  /**
   * 블록 정의 가져오기
   */
  getBlock(name: string): BlockDefinition | undefined {
    return this.blocks.get(name);
  }

  /**
   * 모든 블록 정의 가져오기
   */
  getAllBlocks(): BlockDefinition[] {
    return Array.from(this.blocks.values());
  }

  /**
   * 카테고리별 블록 가져오기
   */
  getBlocksByCategory(category: string): BlockDefinition[] {
    return this.getAllBlocks().filter(block => block.category === category);
  }

  /**
   * 블록 검색
   */
  searchBlocks(searchTerm: string): BlockDefinition[] {
    const term = searchTerm.toLowerCase();
    return this.getAllBlocks().filter(
      block => 
        block.title.toLowerCase().includes(term) ||
        block.name.toLowerCase().includes(term)
    );
  }

  /**
   * 새 블록 인스턴스 생성
   */
  createBlock(type: string, attributes: Record<string, any> = {}): BlockType | null {
    const blockDef = this.getBlock(type);
    if (!blockDef) {
      console.error(`Block type "${type}" not found`);
      return null;
    }

    return {
      id: nanoid(),
      type: type as any,
      content: '',
      attributes: {
        ...blockDef.defaultAttributes,
        ...attributes
      },
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: 1
      }
    };
  }

  /**
   * 블록 복제
   */
  cloneBlock(block: BlockType): BlockType {
    return {
      ...block,
      id: nanoid(),
      metadata: {
        ...block.metadata,
        created: new Date(),
        modified: new Date(),
        version: 1
      }
    };
  }

  /**
   * 블록 유효성 검사
   */
  validateBlock(block: BlockType): boolean {
    const blockDef = this.getBlock(block.type);
    if (!blockDef) {
      return false;
    }

    // 필수 속성 검사
    for (const [attrName, attrDef] of Object.entries(blockDef.attributes)) {
      if (attrDef.required && !(attrName in block.attributes)) {
        console.error(`Required attribute "${attrName}" missing in block ${block.id}`);
        return false;
      }

      // 유효성 검사 함수 실행
      const value = block.attributes[attrName];
      if (value !== undefined && attrDef.validation && !attrDef.validation(value)) {
        console.error(`Validation failed for attribute "${attrName}" in block ${block.id}`);
        return false;
      }
    }

    return true;
  }
}

// 전역 블록 레지스트리 인스턴스
export const blockRegistry = new BlockRegistry();