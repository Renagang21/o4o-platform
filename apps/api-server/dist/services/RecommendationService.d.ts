/**
 * 상품 추천 서비스
 * 개인화 추천, 연관 상품, 인기 상품 등
 */
import { Product } from '../entities/Product';
interface RecommendationScore {
    productId: string;
    score: number;
    reasons: string[];
    product?: Product;
}
interface RelatedProduct {
    productId: string;
    score: number;
    type: 'frequently_bought' | 'similar' | 'complementary' | 'same_brand';
}
export declare class RecommendationService {
    private redis;
    private productRepository;
    private orderRepository;
    private reviewRepository;
    private wishlistRepository;
    private userRepository;
    constructor();
    /**
     * 개인화 추천
     */
    getPersonalizedRecommendations(userId: string, limit?: number): Promise<RecommendationScore[]>;
    /**
     * 연관 상품 추천
     */
    getRelatedProducts(productId: string, type?: 'all' | 'frequently_bought' | 'similar' | 'complementary', limit?: number): Promise<RelatedProduct[]>;
    /**
     * 자주 함께 구매한 상품
     */
    private getFrequentlyBoughtTogether;
    /**
     * 유사 상품
     */
    private getSimilarProducts;
    /**
     * 보완 상품
     */
    private getComplementaryProducts;
    /**
     * 사용자 선호도 분석
     */
    private analyzeUserPreferences;
    /**
     * 구매 이력 기반 추천
     */
    private getPurchaseBasedRecommendations;
    /**
     * 브라우징 이력 기반 추천
     */
    private getBrowsingBasedRecommendations;
    /**
     * 위시리스트 기반 추천
     */
    private getWishlistBasedRecommendations;
    /**
     * 협업 필터링
     */
    private getCollaborativeRecommendations;
    /**
     * 트렌딩 상품
     */
    private getTrendingProducts;
    /**
     * 점수 병합
     */
    private mergeScores;
    /**
     * 중복 제거
     */
    private deduplicateProducts;
    /**
     * 추천 캐싱
     */
    private cacheRecommendations;
    /**
     * 폴백 추천 (개인화 실패 시)
     */
    private getFallbackRecommendations;
    /**
     * 사용자 행동 기록
     */
    trackUserBehavior(userId: string, event: 'view' | 'cart' | 'purchase' | 'wishlist', productId: string): Promise<void>;
    /**
     * A/B 테스트용 추천
     */
    getABTestRecommendations(userId: string, variant: 'A' | 'B', limit?: number): Promise<RecommendationScore[]>;
}
export declare const recommendationService: RecommendationService;
export {};
//# sourceMappingURL=RecommendationService.d.ts.map