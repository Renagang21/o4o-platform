/**
 * Shortcode Registry Service
 * AI 페이지 생성을 위한 shortcode 관리 시스템
 *
 * V3 (Phase P0-B): Uses @o4o/shortcodes metadata as SSOT
 * - Reads from ai_references table (type='shortcodes')
 * - Fallback to metadata from @o4o/shortcodes package
 * - Returns markdown reference directly to AI
 */

import {
  ShortcodeInfo,
  ShortcodeCategory,
  ShortcodeAIReference,
  ShortcodeRegistryResponse
} from '../types/shortcode.types.js';
import { AppDataSource } from '../database/connection.js';
import { AIReference } from '../entities/AIReference.js';
import logger from '../utils/logger.js';
// Phase P0-B: Import metadata from SSOT
// TEMP FIX: Commented out to prevent server crash during deployment
// TODO: Re-enable once package exports are properly configured
// import { shortcodeMetadata, type ShortcodeMetadata } from '@o4o/shortcodes/metadata';

// Temporary fallback - AI shortcode features disabled
const shortcodeMetadata: any[] = [];
type ShortcodeMetadata = any;

class ShortcodeRegistryService {
  private static instance: ShortcodeRegistryService;
  private shortcodes: Map<string, ShortcodeInfo> = new Map();
  private categories: Map<string, ShortcodeCategory> = new Map();
  private lastUpdated: Date = new Date();
  private schemaVersion = '1.0.0';

  private constructor() {
    this.initializeDefaultCategories();
    this.registerBuiltinShortcodes();
  }

  static getInstance(): ShortcodeRegistryService {
    if (!ShortcodeRegistryService.instance) {
      ShortcodeRegistryService.instance = new ShortcodeRegistryService();
    }
    return ShortcodeRegistryService.instance;
  }

  /**
   * 기본 카테고리 초기화
   */
  private initializeDefaultCategories() {
    const defaultCategories: ShortcodeCategory[] = [
      {
        name: 'content',
        description: '콘텐츠 표시',
        icon: 'file-text',
        priority: 1
      },
      {
        name: 'ecommerce',
        description: '전자상거래',
        icon: 'shopping-cart',
        priority: 2
      },
      {
        name: 'forms',
        description: '폼 및 입력',
        icon: 'form',
        priority: 3
      },
      {
        name: 'media',
        description: '미디어',
        icon: 'image',
        priority: 4
      },
      {
        name: 'layout',
        description: '레이아웃',
        icon: 'layout',
        priority: 5
      },
      {
        name: 'social',
        description: '소셜',
        icon: 'share',
        priority: 6
      },
      {
        name: 'utility',
        description: '유틸리티',
        icon: 'tool',
        priority: 7
      }
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category.name, category);
    });
  }

  /**
   * Phase P0-B: Convert ShortcodeMetadata to ShortcodeInfo
   */
  private metadataToInfo(meta: ShortcodeMetadata): ShortcodeInfo {
    // Convert metadata parameters to ShortcodeParameter format
    const parameters: Record<string, any> = {};
    if (meta.parameters) {
      for (const [key, param] of Object.entries(meta.parameters)) {
        const p = param as any;
        parameters[key] = {
          type: p.type,
          required: p.required,
          default: p.default,
          description: p.description || '',
          options: p.options,
        };
      }
    }

    return {
      name: meta.name,
      description: meta.description,
      category: meta.category,
      parameters,
      examples: meta.examples || [],
      version: meta.version || '1.0.0',
      tags: meta.tags || [],
      aiPrompts: meta.aiPrompts || [],
    };
  }

  /**
   * Phase P0-B: Register shortcodes from @o4o/shortcodes metadata (SSOT)
   */
  private registerBuiltinShortcodes() {
    // Load from @o4o/shortcodes metadata package
    for (const meta of shortcodeMetadata) {
      const info = this.metadataToInfo(meta);
      this.register(meta.name, info);
    }

    logger.info(`✅ ${this.shortcodes.size} shortcodes registered from @o4o/shortcodes metadata`);
  }

  /**
   * DEPRECATED: Old hardcoded registration (kept for reference)
   * Phase P0-B: This method is no longer used
   */
  private registerBuiltinShortcodes_DEPRECATED() {
    // 이커머스 관련
    this.register('products', {
      name: 'products',
      description: '상품 목록을 표시합니다',
      category: 'ecommerce',
      parameters: {
        limit: {
          type: 'number',
          default: 10,
          description: '표시할 상품 수',
          validation: { min: 1, max: 100 }
        },
        category: {
          type: 'string',
          description: '카테고리 슬러그',
        },
        featured: {
          type: 'boolean',
          default: false,
          description: '추천 상품만 표시'
        },
        sort: {
          type: 'string',
          default: 'date',
          description: '정렬 방식',
          options: ['date', 'price', 'name', 'popularity']
        },
        columns: {
          type: 'number',
          default: 3,
          description: '열 수',
          validation: { min: 1, max: 6 }
        }
      },
      examples: [
        '[products limit="6" columns="3"]',
        '[products category="electronics" featured="true"]',
        '[products sort="price" limit="4"]'
      ],
      version: '1.0.0',
      tags: ['상품', '쇼핑', '목록'],
      aiPrompts: [
        '상품을 보여주고 싶을 때',
        '쇼핑몰 페이지를 만들 때',
        '추천 상품을 표시할 때'
      ]
    });

    this.register('categories', {
      name: 'categories',
      description: '상품 카테고리 목록을 표시합니다',
      category: 'ecommerce',
      parameters: {
        show_count: {
          type: 'boolean',
          default: true,
          description: '상품 수 표시'
        },
        parent: {
          type: 'string',
          description: '부모 카테고리 슬러그'
        },
        hide_empty: {
          type: 'boolean',
          default: true,
          description: '빈 카테고리 숨기기'
        }
      },
      examples: [
        '[categories show_count="true"]',
        '[categories parent="electronics"]'
      ],
      version: '1.0.0',
      tags: ['카테고리', '분류', '네비게이션'],
      aiPrompts: [
        '카테고리별로 상품을 분류하고 싶을 때',
        '상품 카테고리 네비게이션이 필요할 때'
      ]
    });

    // 콘텐츠 관련
    this.register('recent-posts', {
      name: 'recent-posts',
      description: '최근 게시물을 표시합니다',
      category: 'content',
      parameters: {
        limit: {
          type: 'number',
          default: 5,
          description: '표시할 게시물 수'
        },
        category: {
          type: 'string',
          description: '카테고리 슬러그'
        },
        show_date: {
          type: 'boolean',
          default: true,
          description: '날짜 표시'
        },
        show_excerpt: {
          type: 'boolean',
          default: false,
          description: '요약 표시'
        }
      },
      examples: [
        '[recent-posts limit="3"]',
        '[recent-posts category="news" show_excerpt="true"]'
      ],
      version: '1.0.0',
      tags: ['게시물', '블로그', '뉴스'],
      aiPrompts: [
        '최신 글을 보여주고 싶을 때',
        '블로그 사이드바에 최근 글을 표시할 때'
      ]
    });

    // 폼 관련
    this.register('contact-form', {
      name: 'contact-form',
      description: '연락처 폼을 표시합니다',
      category: 'forms',
      parameters: {
        title: {
          type: 'string',
          default: '문의하기',
          description: '폼 제목'
        },
        email: {
          type: 'string',
          required: true,
          description: '수신 이메일 주소'
        },
        fields: {
          type: 'string',
          default: 'name,email,message',
          description: '표시할 필드들'
        }
      },
      examples: [
        '[contact-form email="contact@example.com"]',
        '[contact-form title="견적 문의" fields="name,phone,company,message"]'
      ],
      version: '1.0.0',
      tags: ['폼', '연락처', '문의'],
      aiPrompts: [
        '연락처나 문의 폼이 필요할 때',
        '고객이 연락할 수 있는 방법을 제공하고 싶을 때'
      ]
    });

    // 미디어 관련
    this.register('gallery', {
      name: 'gallery',
      description: '이미지 갤러리를 표시합니다',
      category: 'media',
      parameters: {
        ids: {
          type: 'string',
          description: '이미지 ID들 (쉼표로 구분)'
        },
        columns: {
          type: 'number',
          default: 3,
          description: '열 수'
        },
        size: {
          type: 'string',
          default: 'medium',
          description: '이미지 크기',
          options: ['thumbnail', 'medium', 'large', 'full']
        },
        lightbox: {
          type: 'boolean',
          default: true,
          description: '라이트박스 사용'
        }
      },
      examples: [
        '[gallery ids="1,2,3,4" columns="2"]',
        '[gallery size="large" lightbox="true"]'
      ],
      version: '1.0.0',
      tags: ['갤러리', '이미지', '사진'],
      aiPrompts: [
        '여러 이미지를 보기 좋게 표시하고 싶을 때',
        '포트폴리오나 작품을 소개할 때'
      ]
    });

    // 소셜 관련
    this.register('social-icons', {
      name: 'social-icons',
      description: '소셜 미디어 아이콘을 표시합니다',
      category: 'social',
      parameters: {
        platforms: {
          type: 'string',
          default: 'facebook,twitter,instagram',
          description: '플랫폼들 (쉼표로 구분)'
        },
        size: {
          type: 'string',
          default: 'medium',
          description: '아이콘 크기',
          options: ['small', 'medium', 'large']
        },
        style: {
          type: 'string',
          default: 'default',
          description: '아이콘 스타일',
          options: ['default', 'rounded', 'square']
        }
      },
      examples: [
        '[social-icons platforms="facebook,instagram,youtube"]',
        '[social-icons size="large" style="rounded"]'
      ],
      version: '1.0.0',
      tags: ['소셜', 'SNS', '아이콘'],
      aiPrompts: [
        '소셜 미디어 링크를 제공하고 싶을 때',
        '페이지 하단에 SNS 연결을 추가할 때'
      ]
    });

    logger.info(`✅ ${this.shortcodes.size} shortcodes registered successfully`);
  }

  /**
   * shortcode 등록
   */
  public register(name: string, info: ShortcodeInfo): void {
    this.shortcodes.set(name, info);
    this.lastUpdated = new Date();
    
    logger.info(`📝 Shortcode registered: [${name}] in category "${info.category}"`);
  }

  /**
   * shortcode 제거
   */
  public unregister(name: string): boolean {
    const removed = this.shortcodes.delete(name);
    if (removed) {
      this.lastUpdated = new Date();
      logger.info(`🗑️ Shortcode unregistered: [${name}]`);
    }
    return removed;
  }

  /**
   * 모든 shortcode 조회
   */
  public getAll(): ShortcodeInfo[] {
    return Array.from(this.shortcodes.values());
  }

  /**
   * 카테고리별 shortcode 조회
   */
  public getByCategory(categoryName: string): ShortcodeInfo[] {
    return this.getAll().filter(sc => sc.category === categoryName);
  }

  /**
   * 단일 shortcode 조회
   */
  public get(name: string): ShortcodeInfo | undefined {
    return this.shortcodes.get(name);
  }

  /**
   * AI를 위한 포맷된 참조 데이터 생성 (V2: Database-driven)
   *
   * Tries to load from database first, falls back to built-in shortcodes
   */
  public async getAIReference(): Promise<ShortcodeRegistryResponse> {
    try {
      // Try to load from database
      if (AppDataSource.isInitialized) {
        const repository = AppDataSource.getRepository(AIReference);
        const dbReference = await repository.findOne({
          where: { type: 'shortcodes', status: 'active' },
          order: { updatedAt: 'DESC' }
        });

        if (dbReference && dbReference.content) {
          logger.info('✅ Shortcode reference loaded from database');

          // Return markdown reference directly for AI consumption
          return {
            total: 0, // Not applicable for markdown format
            categories: Array.from(this.categories.values()).sort((a, b) => a.priority - b.priority),
            shortcodes: [], // Not applicable for markdown format
            schemaVersion: dbReference.schemaVersion || this.schemaVersion,
            lastUpdated: dbReference.updatedAt.toISOString(),
            // NEW: Include raw markdown content for AI
            markdownContent: dbReference.content,
            format: 'markdown',
            version: dbReference.version || '1.0.0'
          };
        }
      }
    } catch (error) {
      logger.warn('⚠️  Failed to load shortcodes from database, using built-in fallback:', error);
    }

    // Fallback to built-in shortcodes
    logger.info('Using built-in shortcode registry (fallback)');
    const shortcodes = this.getAll();
    const categories = Array.from(this.categories.values())
      .sort((a, b) => a.priority - b.priority);

    const aiShortcodes: ShortcodeAIReference[] = shortcodes.map(sc => ({
      name: sc.name,
      usage: `[${sc.name}]`,
      description: sc.description,
      parameters: this.formatParametersForAI(sc.parameters),
      examples: sc.examples,
      category: sc.category,
      tags: sc.tags,
      aiPrompts: sc.aiPrompts || []
    }));

    return {
      total: shortcodes.length,
      categories,
      shortcodes: aiShortcodes,
      schemaVersion: this.schemaVersion,
      lastUpdated: this.lastUpdated.toISOString(),
      format: 'structured'
    };
  }

  /**
   * AI용 파라미터 포맷팅
   */
  private formatParametersForAI(parameters: Record<string, any>): string {
    return Object.entries(parameters)
      .map(([key, param]) => {
        let desc = `${key}: ${param.description}`;
        if (param.required) desc += ' (필수)';
        if (param.default !== undefined) desc += ` [기본값: ${param.default}]`;
        if (param.options) desc += ` [옵션: ${param.options.join(', ')}]`;
        return desc;
      })
      .join(', ');
  }

  /**
   * 검색
   */
  public search(query: string): ShortcodeInfo[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAll().filter(sc =>
      sc.name.toLowerCase().includes(lowercaseQuery) ||
      sc.description.toLowerCase().includes(lowercaseQuery) ||
      sc.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      sc.aiPrompts?.some(prompt => prompt.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * 통계 정보
   */
  public getStats() {
    const shortcodes = this.getAll();
    const categoryStats = Array.from(this.categories.keys()).map(categoryName => ({
      category: categoryName,
      count: shortcodes.filter(sc => sc.category === categoryName).length
    }));

    return {
      total: shortcodes.length,
      categories: this.categories.size,
      categoryStats,
      lastUpdated: this.lastUpdated.toISOString()
    };
  }
}

export const shortcodeRegistry = ShortcodeRegistryService.getInstance();