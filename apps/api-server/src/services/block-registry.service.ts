/**
 * Block Registry Service
 * AI 페이지 생성을 위한 블록 관리 시스템 (SSOT)
 *
 * V2: Database-driven registry
 * - Reads from ai_references table (type='blocks')
 * - Fallback to built-in blocks if DB fails
 * - Returns markdown reference directly to AI
 */

import {
  BlockInfo,
  BlockCategory,
  BlockAIReference,
  BlockRegistryResponse
} from '../types/block.types.js';
import { AppDataSource } from '../database/connection.js';
import { AIReference } from '../entities/AIReference.js';
import logger from '../utils/logger.js';

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
   * 내장 블록 등록 (Frontend와 동기화 - o4o/* 네이밍)
   */
  private registerBuiltinBlocks() {
    // ============================================
    // 텍스트 블록 (Text Blocks)
    // ============================================

    this.register('o4o/paragraph', {
      name: 'o4o/paragraph',
      title: '단락',
      description: '텍스트 단락을 추가합니다',
      category: 'text',
      attributes: {
        content: { type: 'string', default: '', description: '단락 내용' },
        align: { type: 'string', enum: ['left', 'center', 'right'], description: '정렬' },
        textColor: { type: 'string', description: '텍스트 색상' },
        backgroundColor: { type: 'string', description: '배경 색상' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/paragraph', attributes: { content: '여기에 텍스트를 입력하세요' } }, null, 2),
        text: '기본 텍스트 단락'
      },
      version: '1.0.0',
      tags: ['텍스트', '단락', 'p'],
      aiPrompts: ['일반 텍스트를 입력할 때', '설명이나 본문 내용을 작성할 때']
    });

    this.register('o4o/heading', {
      name: 'o4o/heading',
      title: '제목',
      description: '제목(H1-H6)을 추가합니다',
      category: 'text',
      attributes: {
        content: { type: 'string', default: '', description: '제목 내용' },
        level: { type: 'number', default: 2, description: '제목 레벨 (1-6)' },
        align: { type: 'string', enum: ['left', 'center', 'right'] }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/heading', attributes: { content: '페이지 제목', level: 1 } }, null, 2),
        text: 'H1 제목'
      },
      version: '1.0.0',
      tags: ['제목', 'heading', 'h1', 'h2'],
      aiPrompts: ['제목이나 소제목이 필요할 때', '섹션을 구분할 때']
    });

    this.register('o4o/quote', {
      name: 'o4o/quote',
      title: '인용',
      description: '인용문을 추가합니다',
      category: 'text',
      attributes: {
        content: { type: 'string', default: '', description: '인용문 내용' },
        citation: { type: 'string', description: '출처' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/quote', attributes: { content: '인용문 내용', citation: '출처' } }, null, 2),
        text: '인용 블록'
      },
      version: '1.0.0',
      tags: ['인용', 'quote', 'blockquote'],
      aiPrompts: ['인용문이 필요할 때', '누군가의 말을 강조할 때']
    });

    this.register('o4o/code', {
      name: 'o4o/code',
      title: '코드',
      description: '코드 블록을 추가합니다',
      category: 'text',
      attributes: {
        content: { type: 'string', default: '', description: '코드 내용' },
        language: { type: 'string', description: '프로그래밍 언어' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/code', attributes: { content: 'const message = "Hello World";', language: 'javascript' } }, null, 2),
        text: '코드 블록'
      },
      version: '1.0.0',
      tags: ['코드', 'code', 'pre'],
      aiPrompts: ['코드를 표시할 때', '프로그래밍 예제가 필요할 때']
    });

    this.register('o4o/markdown', {
      name: 'o4o/markdown',
      title: '마크다운',
      description: '마크다운 편집기',
      category: 'text',
      attributes: {
        content: { type: 'string', default: '', description: '마크다운 내용' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/markdown', attributes: { content: '# 제목\n\n내용' } }, null, 2),
        text: '마크다운 편집기'
      },
      version: '1.0.0',
      tags: ['마크다운', 'markdown', 'md'],
      aiPrompts: ['마크다운 문법으로 작성할 때']
    });

    this.register('o4o/markdown-reader', {
      name: 'o4o/markdown-reader',
      title: '마크다운 뷰어',
      description: '마크다운을 렌더링합니다',
      category: 'text',
      attributes: {
        content: { type: 'string', default: '', description: '마크다운 내용' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/markdown-reader', attributes: { content: '# 제목' } }, null, 2),
        text: '마크다운 뷰어'
      },
      version: '1.0.0',
      tags: ['마크다운', 'viewer'],
      aiPrompts: ['마크다운을 읽기 전용으로 표시할 때']
    });

    this.register('o4o/list', {
      name: 'o4o/list',
      title: '목록',
      description: '순서 있는/없는 목록',
      category: 'text',
      attributes: {
        ordered: { type: 'boolean', default: false, description: '순서 있는 목록 여부' },
        items: { type: 'array', description: '목록 항목' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/list', attributes: { ordered: false, items: ['항목 1', '항목 2'] } }, null, 2),
        text: '목록'
      },
      version: '1.0.0',
      tags: ['목록', 'list', 'ul', 'ol'],
      aiPrompts: ['목록이 필요할 때', '항목을 나열할 때']
    });

    this.register('o4o/table', {
      name: 'o4o/table',
      title: '표',
      description: '표를 추가합니다',
      category: 'text',
      attributes: {
        rows: { type: 'number', default: 3, description: '행 수' },
        cols: { type: 'number', default: 3, description: '열 수' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/table', attributes: { rows: 3, cols: 3 } }, null, 2),
        text: '표'
      },
      version: '1.0.0',
      tags: ['표', 'table'],
      aiPrompts: ['표가 필요할 때', '데이터를 정리할 때']
    });

    // ============================================
    // 미디어 블록 (Media Blocks)
    // ============================================

    this.register('o4o/image', {
      name: 'o4o/image',
      title: '이미지',
      description: '이미지를 추가합니다',
      category: 'media',
      attributes: {
        url: { type: 'string', description: '이미지 URL' },
        alt: { type: 'string', default: '', description: '대체 텍스트' },
        caption: { type: 'string', description: '캡션' },
        width: { type: 'number', description: '너비' },
        height: { type: 'number', description: '높이' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/image', attributes: { url: 'https://example.com/image.jpg', alt: '설명' } }, null, 2),
        text: '이미지'
      },
      version: '1.0.0',
      tags: ['이미지', 'image', '사진'],
      aiPrompts: ['이미지를 추가할 때', '시각적 콘텐츠가 필요할 때']
    });

    this.register('o4o/cover', {
      name: 'o4o/cover',
      title: '커버',
      description: '배경 이미지가 있는 커버 블록',
      category: 'media',
      attributes: {
        url: { type: 'string', description: '배경 이미지 URL' },
        overlayColor: { type: 'string', description: '오버레이 색상' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/cover', attributes: { url: 'https://example.com/bg.jpg' }, innerBlocks: [] }, null, 2),
        text: '커버 블록'
      },
      version: '1.0.0',
      tags: ['커버', 'cover', '배경'],
      aiPrompts: ['히어로 섹션이 필요할 때', '배경 이미지 위에 콘텐츠를 배치할 때']
    });

    this.register('o4o/gallery', {
      name: 'o4o/gallery',
      title: '갤러리',
      description: '이미지 갤러리',
      category: 'media',
      attributes: {
        images: { type: 'array', description: '이미지 목록' },
        columns: { type: 'number', default: 3, description: '열 수' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/gallery', attributes: { columns: 3, images: [] } }, null, 2),
        text: '이미지 갤러리'
      },
      version: '1.0.0',
      tags: ['갤러리', 'gallery'],
      aiPrompts: ['여러 이미지를 한번에 표시할 때']
    });

    this.register('o4o/video', {
      name: 'o4o/video',
      title: '비디오',
      description: '비디오를 추가합니다',
      category: 'media',
      attributes: {
        url: { type: 'string', description: '비디오 URL' },
        autoplay: { type: 'boolean', default: false }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/video', attributes: { url: 'https://example.com/video.mp4' } }, null, 2),
        text: '비디오'
      },
      version: '1.0.0',
      tags: ['비디오', 'video'],
      aiPrompts: ['비디오를 추가할 때']
    });

    this.register('o4o/slider', {
      name: 'o4o/slider',
      title: '슬라이더',
      description: '이미지 슬라이더/캐러셀',
      category: 'media',
      attributes: {
        autoplay: { type: 'boolean', default: false },
        interval: { type: 'number', default: 3000 }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/slider', innerBlocks: [] }, null, 2),
        text: '슬라이더 컨테이너'
      },
      version: '1.0.0',
      tags: ['슬라이더', 'slider', 'carousel'],
      aiPrompts: ['이미지 슬라이더가 필요할 때']
    });

    this.register('o4o/slider-slide', {
      name: 'o4o/slider-slide',
      title: '슬라이드',
      description: '슬라이더 내부의 개별 슬라이드',
      category: 'media',
      attributes: {
        imageUrl: { type: 'string', description: '슬라이드 이미지' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/slider-slide', attributes: { imageUrl: '' } }, null, 2),
        text: '슬라이드'
      },
      version: '1.0.0',
      tags: ['슬라이드', 'slide'],
      aiPrompts: ['슬라이더 안에 사용']
    });

    this.register('o4o/slide', {
      name: 'o4o/slide',
      title: '슬라이드',
      description: '개별 슬라이드',
      category: 'media',
      attributes: {
        imageUrl: { type: 'string' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/slide', attributes: { imageUrl: '' } }, null, 2),
        text: '슬라이드'
      },
      version: '1.0.0',
      tags: ['슬라이드'],
      aiPrompts: ['슬라이드 컨텐츠']
    });

    // ============================================
    // 디자인 블록 (Design Blocks)
    // ============================================

    this.register('o4o/button', {
      name: 'o4o/button',
      title: '버튼',
      description: 'CTA 버튼을 추가합니다',
      category: 'design',
      attributes: {
        text: { type: 'string', default: '버튼', description: '버튼 텍스트' },
        url: { type: 'string', description: '링크 URL' },
        backgroundColor: { type: 'string', description: '배경색' },
        textColor: { type: 'string', description: '텍스트 색상' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/button', attributes: { text: '지금 시작하기', url: '#' } }, null, 2),
        text: 'CTA 버튼'
      },
      version: '1.0.0',
      tags: ['버튼', 'button', 'CTA'],
      aiPrompts: ['사용자 행동을 유도할 때', '링크 버튼이 필요할 때']
    });

    // ============================================
    // 레이아웃 블록 (Layout Blocks)
    // ============================================

    this.register('o4o/columns', {
      name: 'o4o/columns',
      title: '컬럼',
      description: '다중 컬럼 레이아웃',
      category: 'layout',
      attributes: {
        columnCount: { type: 'number', default: 2, description: '컬럼 수' },
        verticalAlignment: { type: 'string', enum: ['top', 'center', 'bottom'] }
      },
      example: {
        json: JSON.stringify({
          type: 'o4o/columns',
          attributes: { columnCount: 2 },
          innerBlocks: [
            { type: 'o4o/column', innerBlocks: [] },
            { type: 'o4o/column', innerBlocks: [] }
          ]
        }, null, 2),
        text: '2열 컬럼'
      },
      version: '1.0.0',
      tags: ['컬럼', 'columns', '레이아웃'],
      aiPrompts: ['좌우 2단 레이아웃이 필요할 때', '콘텐츠를 나란히 배치할 때']
    });

    this.register('o4o/column', {
      name: 'o4o/column',
      title: '컬럼 단일',
      description: 'Columns 내부의 개별 컬럼',
      category: 'layout',
      attributes: {
        width: { type: 'number', description: '컬럼 너비 (%)' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/column', attributes: { width: 50 }, innerBlocks: [] }, null, 2),
        text: '개별 컬럼'
      },
      version: '1.0.0',
      tags: ['컬럼', 'column'],
      aiPrompts: ['Columns 블록 내부에 사용']
    });

    this.register('o4o/group', {
      name: 'o4o/group',
      title: '그룹',
      description: '블록을 그룹화합니다',
      category: 'layout',
      attributes: {
        backgroundColor: { type: 'string', description: '배경색' },
        padding: { type: 'number', description: '패딩' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/group', attributes: {}, innerBlocks: [] }, null, 2),
        text: '그룹 컨테이너'
      },
      version: '1.0.0',
      tags: ['그룹', 'group', 'container'],
      aiPrompts: ['여러 블록을 하나로 묶을 때', '섹션을 만들 때']
    });

    this.register('o4o/conditional', {
      name: 'o4o/conditional',
      title: '조건부',
      description: '조건부 렌더링 블록',
      category: 'layout',
      attributes: {
        condition: { type: 'string', description: '조건' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/conditional', attributes: { condition: 'isLoggedIn' }, innerBlocks: [] }, null, 2),
        text: '조건부 블록'
      },
      version: '1.0.0',
      tags: ['조건부', 'conditional'],
      aiPrompts: ['특정 조건에서만 표시할 때']
    });

    // ============================================
    // 위젯 블록 (Widget Blocks)
    // ============================================

    this.register('o4o/social', {
      name: 'o4o/social',
      title: '소셜',
      description: '소셜 미디어 링크',
      category: 'widgets',
      attributes: {
        links: { type: 'array', description: '소셜 미디어 링크' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/social', attributes: { links: [] } }, null, 2),
        text: '소셜 미디어'
      },
      version: '1.0.0',
      tags: ['소셜', 'social'],
      aiPrompts: ['소셜 미디어 링크가 필요할 때']
    });

    this.register('o4o/shortcode', {
      name: 'o4o/shortcode',
      title: '쇼트코드',
      description: '커스텀 쇼트코드 실행',
      category: 'widgets',
      attributes: {
        shortcode: { type: 'string', description: '쇼트코드' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/shortcode', content: { shortcode: '[product id="123"]' } }, null, 2),
        text: '쇼트코드'
      },
      version: '1.0.0',
      tags: ['쇼트코드', 'shortcode'],
      aiPrompts: ['커스텀 쇼트코드를 사용할 때']
    });

    // ============================================
    // 임베드 블록 (Embed Blocks)
    // ============================================

    this.register('o4o/youtube', {
      name: 'o4o/youtube',
      title: '유튜브',
      description: '유튜브 비디오 임베드',
      category: 'embed',
      attributes: {
        url: { type: 'string', description: '유튜브 URL' },
        videoId: { type: 'string', description: '비디오 ID' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/youtube', attributes: { videoId: 'dQw4w9WgXcQ' } }, null, 2),
        text: '유튜브 비디오'
      },
      version: '1.0.0',
      tags: ['유튜브', 'youtube', 'video'],
      aiPrompts: ['유튜브 비디오를 추가할 때']
    });

    this.register('o4o/file', {
      name: 'o4o/file',
      title: '파일',
      description: '파일 다운로드 링크',
      category: 'embed',
      attributes: {
        url: { type: 'string', description: '파일 URL' },
        filename: { type: 'string', description: '파일명' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/file', attributes: { url: '/files/document.pdf', filename: 'document.pdf' } }, null, 2),
        text: '파일 다운로드'
      },
      version: '1.0.0',
      tags: ['파일', 'file', 'download'],
      aiPrompts: ['파일 다운로드가 필요할 때']
    });

    // ============================================
    // 폼 블록 (Form Blocks - Dynamic)
    // ============================================

    this.register('o4o/universal-form', {
      name: 'o4o/universal-form',
      title: '범용 폼',
      description: 'Post와 모든 CPT를 처리하는 통합 폼 (post, product, event 등)',
      category: 'dynamic',
      attributes: {
        postType: { type: 'string', default: 'post', description: 'Post type (post, product, event 등)' }
      },
      example: {
        json: JSON.stringify({
          type: 'o4o/universal-form',
          attributes: { postType: 'product' },
          innerBlocks: [
            { type: 'o4o/form-field', attributes: { name: 'title', label: '제품명', fieldType: 'text' } },
            { type: 'o4o/form-field', attributes: { name: 'content', label: '설명', fieldType: 'textarea' } },
            { type: 'o4o/form-submit', attributes: { text: '등록' } }
          ]
        }, null, 2),
        text: 'Product 등록 폼 예시'
      },
      version: '1.0.0',
      tags: ['폼', 'form', 'universal', 'post', 'cpt'],
      aiPrompts: [
        '사용자가 블로그 포스트를 작성할 수 있는 폼 → postType="post"',
        '사용자가 상품을 등록할 수 있는 폼 → postType="product"',
        '사용자가 이벤트를 등록할 수 있는 폼 → postType="event"',
        'Post나 CPT의 생성/편집 폼이 필요할 때',
        'innerBlocks로 form-field와 form-submit 포함 필수'
      ]
    });

    this.register('o4o/form-field', {
      name: 'o4o/form-field',
      title: '폼 필드',
      description: '폼 입력 필드',
      category: 'dynamic',
      attributes: {
        fieldName: { type: 'string' },
        fieldType: { type: 'string', default: 'text' },
        label: { type: 'string' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/form-field', attributes: { fieldName: 'email', fieldType: 'email', label: '이메일' } }, null, 2),
        text: '폼 필드'
      },
      version: '1.0.0',
      tags: ['폼', 'field', 'input'],
      aiPrompts: ['폼 내부에 입력 필드가 필요할 때']
    });

    this.register('o4o/form-submit', {
      name: 'o4o/form-submit',
      title: '폼 제출',
      description: '폼 제출 버튼',
      category: 'dynamic',
      attributes: {
        text: { type: 'string', default: '제출' }
      },
      example: {
        json: JSON.stringify({ type: 'o4o/form-submit', attributes: { text: '제출' } }, null, 2),
        text: '제출 버튼'
      },
      version: '1.0.0',
      tags: ['폼', 'submit', 'button'],
      aiPrompts: ['폼 제출 버튼이 필요할 때']
    });

    // ============================================
    // 기타 블록 (Common Blocks)
    // ============================================

    this.register('o4o/block-appender', {
      name: 'o4o/block-appender',
      title: '블록 추가',
      description: '블록 추가 버튼 (편집기 전용)',
      category: 'common',
      attributes: {},
      example: {
        json: JSON.stringify({ type: 'o4o/block-appender' }, null, 2),
        text: '블록 추가 버튼'
      },
      version: '1.0.0',
      tags: ['편집기', 'editor'],
      aiPrompts: ['편집기 내부에서만 사용 - AI가 직접 사용하지 않음']
    });

    logger.info(`✅ ${this.blocks.size} blocks registered successfully (o4o/* naming)`);
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
   * AI를 위한 포맷된 참조 데이터 생성 (V2: Database-driven)
   *
   * Tries to load from database first, falls back to built-in blocks
   */
  public async getAIReference(): Promise<BlockRegistryResponse> {
    try {
      // Try to load from database
      if (AppDataSource.isInitialized) {
        const repository = AppDataSource.getRepository(AIReference);
        const dbReference = await repository.findOne({
          where: { type: 'blocks', status: 'active' },
          order: { updatedAt: 'DESC' }
        });

        if (dbReference && dbReference.content) {
          logger.info('✅ Block reference loaded from database');

          // Return markdown reference directly for AI consumption
          return {
            total: 0, // Not applicable for markdown format
            categories: Array.from(this.categories.values()).sort((a, b) => a.priority - b.priority),
            blocks: [], // Not applicable for markdown format
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
      logger.warn('⚠️  Failed to load blocks from database, using built-in fallback:', error);
    }

    // Fallback to built-in blocks
    logger.info('Using built-in block registry (fallback)');
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
      lastUpdated: this.lastUpdated.toISOString(),
      format: 'structured'
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
