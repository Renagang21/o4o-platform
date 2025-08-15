/**
 * 상품 리뷰 서비스
 * 리뷰 작성, 조회, 평점 계산, 리뷰 도움됨 투표 등
 */
import { ProductReview } from '../entities/ProductReview';
import { EventEmitter } from 'events';
interface ReviewStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
    verifiedPurchaseCount: number;
    recommendationRate: number;
    topKeywords: string[];
    averagePhotosPerReview: number;
}
interface ReviewFilter {
    rating?: number;
    verifiedPurchase?: boolean;
    hasPhotos?: boolean;
    sortBy?: 'newest' | 'oldest' | 'helpful' | 'rating_high' | 'rating_low';
    page?: number;
    limit?: number;
}
interface ReviewSummary {
    productId: string;
    stats: ReviewStats;
    featuredReview?: ProductReview;
    mostHelpfulReviews: ProductReview[];
    recentReviews: ProductReview[];
    userReview?: ProductReview;
}
export declare class ReviewService extends EventEmitter {
    private reviewRepository;
    private voteRepository;
    private productRepository;
    private orderRepository;
    private userRepository;
    /**
     * 리뷰 작성
     */
    createReview(userId: string, productId: string, data: {
        rating: number;
        title: string;
        content: string;
        images?: string[];
        pros?: string[];
        cons?: string[];
        isRecommended?: boolean;
        variationId?: string;
        orderId?: string;
        attributes?: Record<string, any>;
    }): Promise<ProductReview>;
    /**
     * 리뷰 수정
     */
    updateReview(reviewId: string, userId: string, data: Partial<ProductReview>): Promise<ProductReview>;
    /**
     * 리뷰 삭제
     */
    deleteReview(reviewId: string, userId: string): Promise<void>;
    /**
     * 리뷰 목록 조회
     */
    getReviews(productId: string, filter?: ReviewFilter): Promise<{
        reviews: ProductReview[];
        total: number;
    }>;
    /**
     * 리뷰 통계 조회
     */
    getReviewStats(productId: string): Promise<ReviewStats>;
    /**
     * 리뷰 요약 조회
     */
    getReviewSummary(productId: string, userId?: string): Promise<ReviewSummary>;
    /**
     * 리뷰 도움됨 투표
     */
    voteReview(reviewId: string, userId: string, voteType: 'helpful' | 'unhelpful'): Promise<void>;
    /**
     * 판매자 답변
     */
    replyToReview(reviewId: string, merchantId: string, reply: string): Promise<ProductReview>;
    /**
     * 리뷰 검토 (관리자)
     */
    moderateReview(reviewId: string, status: 'approved' | 'rejected', note?: string): Promise<ProductReview>;
    /**
     * 자동 승인 여부 판단
     */
    private shouldAutoApprove;
    /**
     * 상품 평점 업데이트
     */
    private updateProductRating;
    /**
     * 투표 카운트 업데이트
     */
    private updateVoteCount;
    /**
     * 키워드 추출
     */
    private extractKeywords;
    /**
     * 판매자 알림
     */
    private notifyMerchant;
    /**
     * 리뷰 요청 이메일
     */
    sendReviewRequest(orderId: string): Promise<void>;
}
export declare const reviewService: ReviewService;
export {};
//# sourceMappingURL=ReviewService.d.ts.map