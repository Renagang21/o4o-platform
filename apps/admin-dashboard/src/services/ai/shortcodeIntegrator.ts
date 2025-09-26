/**
 * Shortcode Integrator for AI Page Generation
 * AI 페이지 생성에서 shortcode 정보를 가져오고 통합하는 서비스
 */

import { authClient } from '@o4o/auth-client';

export interface ShortcodeInfo {
  name: string;
  usage: string;
  description: string;
  parameters: string;
  examples: string[];
  category: string;
  tags: string[];
  aiPrompts: string[];
}

export interface ShortcodeCategory {
  name: string;
  description: string;
  icon?: string;
  priority: number;
}

export interface ShortcodeRegistryResponse {
  total: number;
  categories: ShortcodeCategory[];
  shortcodes: ShortcodeInfo[];
  lastUpdated: string;
}

class ShortcodeIntegratorService {
  private static instance: ShortcodeIntegratorService;
  private shortcodeCache: ShortcodeInfo[] = [];
  private categories: ShortcodeCategory[] = [];
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분

  private constructor() {}

  static getInstance(): ShortcodeIntegratorService {
    if (!ShortcodeIntegratorService.instance) {
      ShortcodeIntegratorService.instance = new ShortcodeIntegratorService();
    }
    return ShortcodeIntegratorService.instance;
  }

  /**
   * shortcode 데이터 로드 (캐싱 지원)
   */
  async loadShortcodes(forceRefresh = false): Promise<ShortcodeInfo[]> {
    // 캐시 유효성 체크
    if (!forceRefresh && 
        this.shortcodeCache.length > 0 && 
        this.cacheExpiry && 
        new Date() < this.cacheExpiry) {
      return this.shortcodeCache;
    }

    try {
      console.log('🔄 Loading shortcodes from API...');
      
      const response = await authClient.api.get<{
        success: boolean;
        data: ShortcodeRegistryResponse;
      }>('/api/ai/shortcodes/reference');

      if (response.data.success) {
        this.shortcodeCache = response.data.data.shortcodes;
        this.categories = response.data.data.categories;
        this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION);
        
        console.log(`✅ Loaded ${this.shortcodeCache.length} shortcodes`);
        return this.shortcodeCache;
      } else {
        throw new Error('Failed to load shortcodes');
      }
    } catch (error) {
      console.error('❌ Failed to load shortcodes:', error);
      
      // 캐시된 데이터가 있으면 사용
      if (this.shortcodeCache.length > 0) {
        console.log('📦 Using cached shortcodes');
        return this.shortcodeCache;
      }
      
      // 기본 shortcode 반환
      return this.getDefaultShortcodes();
    }
  }

  /**
   * AI 프롬프트 생성 (향상된 버전)
   */
  async buildEnhancedAIPrompt(userRequest: string, options: {
    includeCategories?: string[];
    maxShortcodes?: number;
    includeExamples?: boolean;
    includeUsageHints?: boolean;
  } = {}): Promise<string> {
    const {
      includeCategories,
      maxShortcodes = 20,
      includeExamples = true,
      includeUsageHints = true
    } = options;

    await this.loadShortcodes();

    let filteredShortcodes = this.shortcodeCache;

    // 카테고리 필터링
    if (includeCategories && includeCategories.length > 0) {
      filteredShortcodes = filteredShortcodes.filter(sc =>
        includeCategories.includes(sc.category)
      );
    }

    // 개수 제한
    filteredShortcodes = filteredShortcodes.slice(0, maxShortcodes);

    // shortcode 목록 포맷팅
    const shortcodeList = filteredShortcodes.map(sc => {
      let entry = `- **[${sc.name}]**: ${sc.description}`;
      
      if (sc.parameters) {
        entry += `\n  Parameters: ${sc.parameters}`;
      }
      
      if (includeExamples && sc.examples.length > 0) {
        entry += `\n  Example: ${sc.examples[0]}`;
      }
      
      if (includeUsageHints && sc.aiPrompts.length > 0) {
        entry += `\n  Use when: ${sc.aiPrompts[0]}`;
      }
      
      if (sc.tags.length > 0) {
        entry += `\n  Tags: ${sc.tags.join(', ')}`;
      }
      
      return entry;
    }).join('\n\n');

    // 카테고리 정보
    const availableCategories = this.categories
      .filter(cat => filteredShortcodes.some(sc => sc.category === cat.name))
      .map(cat => `- ${cat.name}: ${cat.description}`)
      .join('\n');

    return `# Available Shortcodes

## Categories Available:
${availableCategories}

## Shortcodes (${filteredShortcodes.length} available):

${shortcodeList}

---

## User Request: 
"${userRequest}"

## Instructions:
1. **Analyze the user request** carefully to understand what they want to create
2. **Select appropriate shortcodes** from the list above that best match their needs
3. **Use shortcode parameters** when needed to customize the output
4. **Create a complete page structure** using HTML elements and shortcodes
5. **Consider user experience** - make the page intuitive and well-organized
6. **Only use shortcodes** from the list above - do not invent new ones
7. **Include proper HTML structure** with headers, sections, and semantic elements
8. **Add explanatory text** where it makes sense for context

## Output Format:
Provide a complete HTML page structure with embedded shortcodes that fulfills the user's request.`;
  }

  /**
   * 간단한 AI 프롬프트 생성 (기존 호환성 유지)
   */
  async buildAIPrompt(userRequest: string): Promise<string> {
    return this.buildEnhancedAIPrompt(userRequest, {
      maxShortcodes: 15,
      includeExamples: true,
      includeUsageHints: true
    });
  }

  /**
   * 카테고리별 shortcode 가져오기
   */
  async getShortcodesByCategory(category: string): Promise<ShortcodeInfo[]> {
    await this.loadShortcodes();
    return this.shortcodeCache.filter(sc => sc.category === category);
  }

  /**
   * shortcode 검색
   */
  async searchShortcodes(query: string): Promise<ShortcodeInfo[]> {
    await this.loadShortcodes();
    const lowercaseQuery = query.toLowerCase();
    
    return this.shortcodeCache.filter(sc =>
      sc.name.toLowerCase().includes(lowercaseQuery) ||
      sc.description.toLowerCase().includes(lowercaseQuery) ||
      sc.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      sc.aiPrompts.some(prompt => prompt.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * 사용 가능한 카테고리 목록
   */
  async getAvailableCategories(): Promise<ShortcodeCategory[]> {
    await this.loadShortcodes();
    return this.categories;
  }

  /**
   * shortcode 통계
   */
  async getShortcodeStats() {
    await this.loadShortcodes();
    
    const categoryStats = this.categories.map(cat => ({
      category: cat.name,
      count: this.shortcodeCache.filter(sc => sc.category === cat.name).length
    }));

    return {
      total: this.shortcodeCache.length,
      categories: this.categories.length,
      categoryStats,
      lastLoaded: this.cacheExpiry?.toISOString() || null
    };
  }

  /**
   * 캐시 무효화
   */
  invalidateCache(): void {
    this.shortcodeCache = [];
    this.categories = [];
    this.cacheExpiry = null;
    console.log('🗑️ Shortcode cache invalidated');
  }

  /**
   * 기본 shortcode (API 연결 실패 시 사용)
   */
  private getDefaultShortcodes(): ShortcodeInfo[] {
    return [
      {
        name: 'products',
        usage: '[products]',
        description: '상품 목록을 표시합니다',
        parameters: 'limit: 표시할 상품 수, category: 카테고리, featured: 추천 상품만',
        examples: ['[products limit="6"]'],
        category: 'ecommerce',
        tags: ['상품', '쇼핑'],
        aiPrompts: ['상품을 보여주고 싶을 때']
      },
      {
        name: 'contact-form',
        usage: '[contact-form]',
        description: '연락처 폼을 표시합니다',
        parameters: 'email: 수신 이메일 (필수), title: 폼 제목',
        examples: ['[contact-form email="contact@example.com"]'],
        category: 'forms',
        tags: ['폼', '연락처'],
        aiPrompts: ['연락처 폼이 필요할 때']
      },
      {
        name: 'recent-posts',
        usage: '[recent-posts]',
        description: '최근 게시물을 표시합니다',
        parameters: 'limit: 게시물 수, category: 카테고리',
        examples: ['[recent-posts limit="5"]'],
        category: 'content',
        tags: ['게시물', '블로그'],
        aiPrompts: ['최신 글을 보여주고 싶을 때']
      }
    ];
  }
}

export const shortcodeIntegrator = ShortcodeIntegratorService.getInstance();