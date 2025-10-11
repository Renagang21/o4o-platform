/**
 * Block Registry Service
 * AI 페이지 생성을 위한 블록 관리 시스템 (SSOT)
 */

import {
  BlockInfo,
  BlockCategory,
  BlockAIReference,
  BlockRegistryResponse
} from '../types/block.types';
import logger from '../utils/logger';

class BlockRegistryService {
  private static instance: BlockRegistryService;
  private blocks: Map<string, BlockInfo> = new Map();
  private categories: Map<string, BlockCategory> = new Map();
  private lastUpdated: Date = new Date();
  private schemaVersion = '1.0.0';

  private constructor() {
    this.initializeDefaultCategories();
    this.registerBuiltinBlocks();
  }

  static getInstance(): BlockRegistryService {
    if (!BlockRegistryService.instance) {
      BlockRegistryService.instance = new BlockRegistryService();
    }
    return BlockRegistryService.instance;
  }

  /**
   * 기본 카테고리 초기화
   */
  private initializeDefaultCategories() {
    const defaultCategories: BlockCategory[] = [
      {
        name: 'text',
        title: '텍스트',
        icon: 'text',
        priority: 1
      },
      {
        name: 'media',
        title: '미디어',
        icon: 'image',
        priority: 2
      },
      {
        name: 'design',
        title: '디자인',
        icon: 'palette',
        priority: 3
      },
      {
        name: 'layout',
        title: '레이아웃',
        icon: 'layout',
        priority: 4
      },
      {
        name: 'widgets',
        title: '위젯',
        icon: 'widget',
        priority: 5
      },
      {
        name: 'embed',
        title: '임베드',
        icon: 'link',
        priority: 6
      },
      {
        name: 'common',
        title: '일반',
        icon: 'star',
        priority: 7
      }
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category.name, category);
    });
  }

  /**
   * 내장 블록 등록
   */
  private registerBuiltinBlocks() {
    // 텍스트 블록
    this.register('core/paragraph', {
      name: 'core/paragraph',
      title: '단락',
      description: '텍스트 단락을 추가합니다',
      category: 'text',
      attributes: {
        content: {
          type: 'string',
          default: '',
          description: '단락 내용'
        },
        align: {
          type: 'string',
          enum: ['left', 'center', 'right'],
          description: '정렬'
        },
        textColor: {
          type: 'string',
          description: '텍스트 색상'
        },
        backgroundColor: {
          type: 'string',
          description: '배경 색상'
        }
      },
      example: {
        json: JSON.stringify({
          type: 'core/paragraph',
          attributes: { content: '여기에 텍스트를 입력하세요' }
        }, null, 2),
        text: '기본 텍스트 단락 블록'
      },
      version: '1.0.0',
      tags: ['텍스트', '단락', 'p'],
      aiPrompts: [
        '일반 텍스트를 입력할 때',
        '설명이나 본문 내용을 작성할 때'
      ]
    });

    this.register('core/heading', {
      name: 'core/heading',
      title: '제목',
      description: '제목(H1-H6)을 추가합니다',
      category: 'text',
      attributes: {
        content: {
          type: 'string',
          default: '',
          description: '제목 내용'
        },
        level: {
          type: 'number',
          default: 2,
          description: '제목 레벨 (1-6)'
        },
        align: {
          type: 'string',
          enum: ['left', 'center', 'right']
        }
      },
      example: {
        json: JSON.stringify({
          type: 'core/heading',
          attributes: { content: '페이지 제목', level: 1 }
        }, null, 2),
        text: 'H1 제목 블록'
      },
      version: '1.0.0',
      tags: ['제목', 'heading', 'h1', 'h2'],
      aiPrompts: [
        '제목이나 소제목이 필요할 때',
        '섹션을 구분할 때'
      ]
    });

    // 미디어 블록
    this.register('core/image', {
      name: 'core/image',
      title: '이미지',
      description: '이미지를 추가합니다',
      category: 'media',
      attributes: {
        url: {
          type: 'string',
          description: '이미지 URL'
        },
        alt: {
          type: 'string',
          default: '',
          description: '대체 텍스트'
        },
        caption: {
          type: 'string',
          description: '캡션'
        },
        width: {
          type: 'number',
          description: '너비 (픽셀)'
        },
        height: {
          type: 'number',
          description: '높이 (픽셀)'
        }
      },
      example: {
        json: JSON.stringify({
          type: 'core/image',
          attributes: {
            url: 'https://example.com/image.jpg',
            alt: '이미지 설명',
            caption: '이미지 캡션'
          }
        }, null, 2),
        text: '이미지 블록'
      },
      version: '1.0.0',
      tags: ['이미지', 'image', '사진'],
      aiPrompts: [
        '이미지를 추가할 때',
        '시각적 콘텐츠가 필요할 때'
      ]
    });

    // 레이아웃 블록
    this.register('core/columns', {
      name: 'core/columns',
      title: '컬럼',
      description: '다중 컬럼 레이아웃을 만듭니다',
      category: 'layout',
      attributes: {
        columnCount: {
          type: 'number',
          default: 2,
          description: '컬럼 수'
        },
        verticalAlignment: {
          type: 'string',
          enum: ['top', 'center', 'bottom']
        }
      },
      example: {
        json: JSON.stringify({
          type: 'core/columns',
          attributes: { columnCount: 2 },
          innerBlocks: [
            { type: 'core/column', innerBlocks: [] },
            { type: 'core/column', innerBlocks: [] }
          ]
        }, null, 2),
        text: '2열 컬럼 레이아웃'
      },
      version: '1.0.0',
      tags: ['컬럼', '레이아웃', '다단'],
      aiPrompts: [
        '좌우 2단 레이아웃이 필요할 때',
        '콘텐츠를 나란히 배치할 때'
      ]
    });

    // 버튼 블록
    this.register('core/button', {
      name: 'core/button',
      title: '버튼',
      description: 'CTA 버튼을 추가합니다',
      category: 'design',
      attributes: {
        text: {
          type: 'string',
          default: '버튼',
          description: '버튼 텍스트'
        },
        url: {
          type: 'string',
          description: '링크 URL'
        },
        backgroundColor: {
          type: 'string',
          description: '배경색'
        },
        textColor: {
          type: 'string',
          description: '텍스트 색상'
        },
        borderRadius: {
          type: 'number',
          description: '모서리 둥글기'
        }
      },
      example: {
        json: JSON.stringify({
          type: 'core/button',
          attributes: {
            text: '지금 시작하기',
            url: '#',
            backgroundColor: '#0066cc'
          }
        }, null, 2),
        text: 'CTA 버튼'
      },
      version: '1.0.0',
      tags: ['버튼', 'button', 'CTA'],
      aiPrompts: [
        '사용자 행동을 유도할 때',
        '링크나 다운로드 버튼이 필요할 때'
      ]
    });

    logger.info(`✅ ${this.blocks.size} blocks registered successfully`);
  }

  /**
   * 블록 등록
   */
  public register(name: string, info: BlockInfo): void {
    this.blocks.set(name, info);
    this.lastUpdated = new Date();

    logger.info(`📦 Block registered: ${name} in category "${info.category}"`);
  }

  /**
   * 블록 제거
   */
  public unregister(name: string): boolean {
    const removed = this.blocks.delete(name);
    if (removed) {
      this.lastUpdated = new Date();
      logger.info(`🗑️ Block unregistered: ${name}`);
    }
    return removed;
  }

  /**
   * 모든 블록 조회
   */
  public getAll(): BlockInfo[] {
    return Array.from(this.blocks.values());
  }

  /**
   * 카테고리별 블록 조회
   */
  public getByCategory(categoryName: string): BlockInfo[] {
    return this.getAll().filter(block => block.category === categoryName);
  }

  /**
   * 단일 블록 조회
   */
  public get(name: string): BlockInfo | undefined {
    return this.blocks.get(name);
  }

  /**
   * AI를 위한 포맷된 참조 데이터 생성
   */
  public getAIReference(): BlockRegistryResponse {
    const blocks = this.getAll();
    const categories = Array.from(this.categories.values())
      .sort((a, b) => a.priority - b.priority);

    const aiBlocks: BlockAIReference[] = blocks.map(block => ({
      name: block.name,
      title: block.title,
      description: block.description,
      category: block.category,
      attributes: block.attributes,
      example: block.example,
      version: block.version,
      tags: block.tags,
      aiPrompts: block.aiPrompts || [],
      deprecated: block.deprecated,
      replacedBy: block.replacedBy
    }));

    return {
      total: blocks.length,
      categories,
      blocks: aiBlocks,
      schemaVersion: this.schemaVersion,
      lastUpdated: this.lastUpdated.toISOString()
    };
  }

  /**
   * 검색
   */
  public search(query: string): BlockInfo[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAll().filter(block =>
      block.name.toLowerCase().includes(lowercaseQuery) ||
      block.title.toLowerCase().includes(lowercaseQuery) ||
      block.description.toLowerCase().includes(lowercaseQuery) ||
      block.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      block.aiPrompts?.some(prompt => prompt.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * 통계 정보
   */
  public getStats() {
    const blocks = this.getAll();
    const categoryStats = Array.from(this.categories.keys()).map(categoryName => ({
      category: categoryName,
      count: blocks.filter(block => block.category === categoryName).length
    }));

    return {
      total: blocks.length,
      categories: this.categories.size,
      categoryStats,
      schemaVersion: this.schemaVersion,
      lastUpdated: this.lastUpdated.toISOString()
    };
  }
}

export const blockRegistry = BlockRegistryService.getInstance();
