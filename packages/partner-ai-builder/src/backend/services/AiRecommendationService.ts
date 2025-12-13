/**
 * AI Recommendation Service
 *
 * AI 기반 제품 추천 알고리즘
 *
 * @package @o4o/partner-ai-builder
 */

import type { AllowedIndustry, ProductMetadata } from './AiRoutineBuilderService.js';

// ========================================
// Types
// ========================================

export interface ProductScore {
  productId: string;
  score: number;
  reasons: string[];
}

export interface RecommendationRequest {
  industry: AllowedIndustry;
  category?: string;
  targetAudience?: string;
  existingProducts?: string[];
  routineGoal?: string;
  maxResults?: number;
}

export interface RecommendationResult {
  success: boolean;
  recommendations?: ProductScore[];
  error?: string;
}

export interface ProductCatalog {
  productId: string;
  productName: string;
  productType: AllowedIndustry;
  category: string;
  tags: string[];
  popularity: number;
  conversionRate: number;
  partnerClickRate: number;
  ingredients?: string[];
  functions?: string[];
}

// ========================================
// Configuration
// ========================================

export interface RecommendationConfig {
  weights: {
    categoryMatch: number;
    popularityScore: number;
    conversionScore: number;
    partnerClickScore: number;
    tagSimilarity: number;
    complementary: number;
  };
  blockedIndustries: string[];
  maxRecommendations: number;
}

const DEFAULT_CONFIG: RecommendationConfig = {
  weights: {
    categoryMatch: 0.25,
    popularityScore: 0.20,
    conversionScore: 0.20,
    partnerClickScore: 0.15,
    tagSimilarity: 0.10,
    complementary: 0.10,
  },
  blockedIndustries: ['PHARMACEUTICAL'],
  maxRecommendations: 5,
};

// ========================================
// Service Class
// ========================================

export class AiRecommendationService {
  private config: RecommendationConfig;

  constructor(config: Partial<RecommendationConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      weights: { ...DEFAULT_CONFIG.weights, ...config.weights },
    };
  }

  /**
   * 산업군 검증
   */
  private validateIndustry(industry: string): boolean {
    return (
      !this.config.blockedIndustries.includes(industry) &&
      ['COSMETICS', 'HEALTH', 'GENERAL'].includes(industry)
    );
  }

  /**
   * 카테고리 매칭 점수 계산
   */
  private calculateCategoryScore(
    product: ProductCatalog,
    targetCategory?: string
  ): number {
    if (!targetCategory) return 0.5;
    return product.category === targetCategory ? 1.0 : 0.3;
  }

  /**
   * 태그 유사도 점수 계산
   */
  private calculateTagSimilarity(
    product: ProductCatalog,
    targetTags: string[]
  ): number {
    if (targetTags.length === 0) return 0.5;
    const matchCount = product.tags.filter((t) => targetTags.includes(t)).length;
    return matchCount / Math.max(product.tags.length, targetTags.length);
  }

  /**
   * 보완 제품 점수 계산 (기존 제품과 얼마나 잘 어울리는지)
   */
  private calculateComplementaryScore(
    product: ProductCatalog,
    existingProducts: string[]
  ): number {
    if (existingProducts.length === 0) return 0.5;
    // 이미 있는 제품은 제외
    if (existingProducts.includes(product.productId)) return 0;
    // 같은 카테고리 제품이 없으면 높은 점수 (다양성)
    return 0.7;
  }

  /**
   * 제품 점수 계산
   */
  calculateProductScore(
    product: ProductCatalog,
    request: RecommendationRequest,
    targetTags: string[] = []
  ): ProductScore {
    const { weights } = this.config;
    const reasons: string[] = [];

    // 카테고리 매칭
    const categoryScore =
      this.calculateCategoryScore(product, request.category) * weights.categoryMatch;
    if (product.category === request.category) {
      reasons.push(`카테고리 일치: ${product.category}`);
    }

    // 인기도
    const popularityScore = product.popularity * weights.popularityScore;
    if (product.popularity > 0.7) {
      reasons.push('높은 인기 제품');
    }

    // 전환율
    const conversionScore = product.conversionRate * weights.conversionScore;
    if (product.conversionRate > 0.15) {
      reasons.push('높은 전환율');
    }

    // 파트너 클릭률
    const partnerClickScore = product.partnerClickRate * weights.partnerClickScore;
    if (product.partnerClickRate > 0.1) {
      reasons.push('파트너 활동 우수');
    }

    // 태그 유사도
    const tagScore =
      this.calculateTagSimilarity(product, targetTags) * weights.tagSimilarity;

    // 보완 점수
    const complementaryScore =
      this.calculateComplementaryScore(product, request.existingProducts || []) *
      weights.complementary;

    const totalScore =
      categoryScore +
      popularityScore +
      conversionScore +
      partnerClickScore +
      tagScore +
      complementaryScore;

    return {
      productId: product.productId,
      score: Math.round(totalScore * 100) / 100,
      reasons,
    };
  }

  /**
   * 제품 추천 (메인 메서드)
   */
  async recommend(request: RecommendationRequest): Promise<RecommendationResult> {
    // 1. 산업군 검증
    if (!this.validateIndustry(request.industry)) {
      return {
        success: false,
        error: `${request.industry} 산업군은 AI 추천이 허용되지 않습니다.`,
      };
    }

    // 2. 제품 카탈로그 조회 (Mock)
    const catalog = await this.getProductCatalog(request.industry);

    // 3. PHARMACEUTICAL 제품 필터링
    const filteredCatalog = catalog.filter(
      (p) => !this.config.blockedIndustries.includes(p.productType)
    );

    // 4. 목표에서 태그 추출
    const targetTags = this.extractTagsFromGoal(request.routineGoal);

    // 5. 각 제품 점수 계산
    const scoredProducts = filteredCatalog.map((product) =>
      this.calculateProductScore(product, request, targetTags)
    );

    // 6. 정렬 및 상위 N개 선택
    const maxResults = request.maxResults || this.config.maxRecommendations;
    const recommendations = scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return { success: true, recommendations };
  }

  /**
   * 목표에서 태그 추출
   */
  private extractTagsFromGoal(goal?: string): string[] {
    if (!goal) return [];

    const tagKeywords: Record<string, string[]> = {
      보습: ['보습', '수분', '촉촉'],
      미백: ['미백', '브라이트닝', '톤업'],
      주름: ['주름', '안티에이징', '탄력'],
      트러블: ['트러블', '여드름', '진정'],
      클렌징: ['클렌징', '세안', '세정'],
      건강: ['건강', '웰니스', '활력'],
      다이어트: ['다이어트', '체중', '슬림'],
      면역: ['면역', '면역력', '영양'],
    };

    const foundTags: string[] = [];
    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some((kw) => goal.includes(kw))) {
        foundTags.push(tag);
      }
    }

    return foundTags;
  }

  /**
   * 제품 카탈로그 조회 (Mock)
   */
  private async getProductCatalog(
    industry: AllowedIndustry
  ): Promise<ProductCatalog[]> {
    // Mock data - 실제로는 DB 조회
    const mockCatalog: ProductCatalog[] = [
      {
        productId: 'prod-001',
        productName: '하이드레이팅 세럼',
        productType: 'COSMETICS',
        category: '세럼',
        tags: ['보습', '수분', '세럼'],
        popularity: 0.85,
        conversionRate: 0.18,
        partnerClickRate: 0.12,
      },
      {
        productId: 'prod-002',
        productName: '비타민C 앰플',
        productType: 'COSMETICS',
        category: '앰플',
        tags: ['미백', '브라이트닝', '비타민'],
        popularity: 0.78,
        conversionRate: 0.15,
        partnerClickRate: 0.10,
      },
      {
        productId: 'prod-003',
        productName: '레티놀 크림',
        productType: 'COSMETICS',
        category: '크림',
        tags: ['주름', '안티에이징', '레티놀'],
        popularity: 0.72,
        conversionRate: 0.12,
        partnerClickRate: 0.08,
      },
      {
        productId: 'prod-004',
        productName: '진정 토너',
        productType: 'COSMETICS',
        category: '토너',
        tags: ['진정', '트러블', '민감성'],
        popularity: 0.68,
        conversionRate: 0.14,
        partnerClickRate: 0.09,
      },
      {
        productId: 'prod-005',
        productName: '클렌징 폼',
        productType: 'COSMETICS',
        category: '클렌저',
        tags: ['클렌징', '세안', '거품'],
        popularity: 0.82,
        conversionRate: 0.20,
        partnerClickRate: 0.11,
      },
      {
        productId: 'prod-h001',
        productName: '멀티비타민',
        productType: 'HEALTH',
        category: '비타민',
        tags: ['건강', '영양', '비타민'],
        popularity: 0.80,
        conversionRate: 0.16,
        partnerClickRate: 0.10,
      },
      {
        productId: 'prod-h002',
        productName: '오메가3',
        productType: 'HEALTH',
        category: '영양제',
        tags: ['건강', '오메가', '필수지방산'],
        popularity: 0.75,
        conversionRate: 0.14,
        partnerClickRate: 0.08,
      },
    ];

    return mockCatalog.filter((p) => p.productType === industry);
  }

  /**
   * 인기 트렌드 기반 추천
   */
  async getTrendingProducts(
    industry: AllowedIndustry,
    limit: number = 5
  ): Promise<ProductScore[]> {
    if (!this.validateIndustry(industry)) {
      return [];
    }

    const catalog = await this.getProductCatalog(industry);
    return catalog
      .map((p) => ({
        productId: p.productId,
        score: p.popularity,
        reasons: ['트렌딩 제품'],
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export default AiRecommendationService;
