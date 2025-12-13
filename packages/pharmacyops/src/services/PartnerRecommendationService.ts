/**
 * Partner Recommendation Service
 *
 * 약국에 파트너 제품을 추천하는 서비스입니다.
 *
 * IMPORTANT: PHARMACEUTICAL 제품은 추천에서 제외됩니다.
 * 오직 COSMETICS, HEALTH, GENERAL 제품만 추천합니다.
 *
 * @package @o4o/pharmacyops
 */

import type { DataSource } from 'typeorm';

// 파트너 추천 허용 제품 타입
const PARTNER_ALLOWED_PRODUCT_TYPES = ['cosmetics', 'health', 'general'];

// 추천 제외 제품 타입
const PARTNER_EXCLUDED_PRODUCT_TYPES = ['pharmaceutical'];

/**
 * 파트너 추천 제품
 */
export interface PartnerRecommendation {
  id: string;
  partnerId: string;
  partnerName: string;
  productId: string;
  productName: string;
  productType: string;
  description?: string;
  imageUrl?: string;
  price: number;
  discountRate?: number;
  finalPrice: number;
  rating?: number;
  reviewCount?: number;
  conversionRate?: number;
  metadata?: Record<string, any>;
}

/**
 * 추천 필터
 */
export interface RecommendationFilter {
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  partnerId?: string;
  page?: number;
  limit?: number;
}

/**
 * 추천 통계
 */
export interface RecommendationStats {
  totalRecommendations: number;
  byProductType: Record<string, number>;
  topPartners: Array<{
    partnerId: string;
    partnerName: string;
    productCount: number;
  }>;
}

export class PartnerRecommendationService {
  constructor(private readonly dataSource?: DataSource) {}

  /**
   * 파트너 추천 제품 목록 조회
   *
   * PHARMACEUTICAL 제품은 자동으로 제외됩니다.
   */
  async getRecommendations(
    pharmacyId: string,
    filter: RecommendationFilter = {}
  ): Promise<{
    items: PartnerRecommendation[];
    total: number;
    page: number;
    limit: number;
  }> {
    // TODO: 실제 구현 시 partner-core와 연동
    // 현재는 mock 데이터 반환

    const { page = 1, limit = 20, productType, minPrice, maxPrice } = filter;

    // Mock 추천 데이터
    const mockRecommendations: PartnerRecommendation[] = [
      {
        id: 'rec-001',
        partnerId: 'partner-001',
        partnerName: '뷰티파트너',
        productId: 'prod-001',
        productName: '히알루론산 세럼 50ml',
        productType: 'cosmetics',
        description: '고농축 히알루론산으로 깊은 보습',
        price: 45000,
        discountRate: 15,
        finalPrice: 38250,
        rating: 4.8,
        reviewCount: 256,
        conversionRate: 12.5,
      },
      {
        id: 'rec-002',
        partnerId: 'partner-002',
        partnerName: '헬스웰',
        productId: 'prod-002',
        productName: '종합비타민 60정',
        productType: 'health',
        description: '하루 한 알로 충분한 영양',
        price: 32000,
        discountRate: 10,
        finalPrice: 28800,
        rating: 4.6,
        reviewCount: 189,
        conversionRate: 8.3,
      },
      {
        id: 'rec-003',
        partnerId: 'partner-001',
        partnerName: '뷰티파트너',
        productId: 'prod-003',
        productName: '레티놀 크림 30ml',
        productType: 'cosmetics',
        description: '피부 탄력 개선',
        price: 58000,
        discountRate: 20,
        finalPrice: 46400,
        rating: 4.7,
        reviewCount: 324,
        conversionRate: 15.2,
      },
      {
        id: 'rec-004',
        partnerId: 'partner-003',
        partnerName: '라이프케어',
        productId: 'prod-004',
        productName: '프로바이오틱스 30포',
        productType: 'health',
        description: '장 건강 유산균',
        price: 42000,
        discountRate: 12,
        finalPrice: 36960,
        rating: 4.5,
        reviewCount: 412,
        conversionRate: 10.1,
      },
    ];

    // 필터 적용
    let filtered = mockRecommendations.filter(
      (r) => !PARTNER_EXCLUDED_PRODUCT_TYPES.includes(r.productType)
    );

    if (productType && PARTNER_ALLOWED_PRODUCT_TYPES.includes(productType)) {
      filtered = filtered.filter((r) => r.productType === productType);
    }

    if (minPrice !== undefined) {
      filtered = filtered.filter((r) => r.finalPrice >= minPrice);
    }

    if (maxPrice !== undefined) {
      filtered = filtered.filter((r) => r.finalPrice <= maxPrice);
    }

    // 페이지네이션
    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit };
  }

  /**
   * 추천 통계 조회
   */
  async getRecommendationStats(pharmacyId: string): Promise<RecommendationStats> {
    // TODO: 실제 구현 시 partner-core와 연동
    return {
      totalRecommendations: 156,
      byProductType: {
        cosmetics: 78,
        health: 65,
        general: 13,
      },
      topPartners: [
        { partnerId: 'partner-001', partnerName: '뷰티파트너', productCount: 45 },
        { partnerId: 'partner-002', partnerName: '헬스웰', productCount: 38 },
        { partnerId: 'partner-003', partnerName: '라이프케어', productCount: 32 },
      ],
    };
  }

  /**
   * 추천 제품 상세 조회
   */
  async getRecommendationById(
    pharmacyId: string,
    recommendationId: string
  ): Promise<PartnerRecommendation | null> {
    // TODO: 실제 구현
    return null;
  }

  /**
   * 추천 클릭 기록
   */
  async recordRecommendationClick(
    pharmacyId: string,
    recommendationId: string
  ): Promise<void> {
    // TODO: 클릭 이벤트 발행 (pharmacy-events.ts 사용)
    console.log(`[PartnerRecommendation] Click recorded: ${recommendationId}`);
  }

  /**
   * 제품 타입이 추천 가능한지 확인
   */
  isProductTypeAllowed(productType: string): boolean {
    return (
      PARTNER_ALLOWED_PRODUCT_TYPES.includes(productType.toLowerCase()) &&
      !PARTNER_EXCLUDED_PRODUCT_TYPES.includes(productType.toLowerCase())
    );
  }
}

export const partnerRecommendationService = new PartnerRecommendationService();
export default partnerRecommendationService;
