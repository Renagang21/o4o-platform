/**
 * 상품 리뷰 서비스
 * 리뷰 작성, 조회, 평점 계산, 리뷰 도움됨 투표 등
 */

import { AppDataSource } from '../database/connection';
import { ProductReview, ReviewVote } from '../entities/ProductReview';
import { Product } from '../entities/Product';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import logger from '../utils/simpleLogger';
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

export class ReviewService extends EventEmitter {
  private reviewRepository = AppDataSource.getRepository(ProductReview);
  private voteRepository = AppDataSource.getRepository(ReviewVote);
  private productRepository = AppDataSource.getRepository(Product);
  private orderRepository = AppDataSource.getRepository(Order);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * 리뷰 작성
   */
  async createReview(
    userId: string,
    productId: string,
    data: {
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
    }
  ): Promise<ProductReview> {
    // 중복 리뷰 확인
    const existingReview = await this.reviewRepository.findOne({
      where: { userId, productId }
    });

    if (existingReview) {
      throw new Error('You have already reviewed this product');
    }

    // 구매 확인
    let isVerifiedPurchase = false;
    if (data.orderId) {
      const order = await this.orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.items', 'item')
        .where('order.id = :orderId', { orderId: data.orderId })
        .andWhere('order.userId = :userId', { userId })
        .andWhere('item.productId = :productId', { productId })
        .andWhere('order.status IN (:...statuses)', {
          statuses: ['delivered', 'completed']
        })
        .getOne();

      isVerifiedPurchase = !!order;
    }

    // 리뷰 생성
    const review = this.reviewRepository.create({
      userId,
      productId,
      ...data,
      isVerifiedPurchase,
      status: this.shouldAutoApprove(data) ? 'approved' : 'pending'
    });

    await this.reviewRepository.save(review);

    // 상품 평점 업데이트
    await this.updateProductRating(productId);

    // 리뷰 작성 포인트 지급
    if (isVerifiedPurchase) {
      this.emit('reviewCreated', {
        userId,
        productId,
        reviewId: review.id,
        points: data.images?.length ? 500 : 200 // 사진 리뷰는 추가 포인트
      });
    }

    // 리뷰 알림
    await this.notifyMerchant(review);

    logger.info(`Review created for product ${productId} by user ${userId}`);

    return review;
  }

  /**
   * 리뷰 수정
   */
  async updateReview(
    reviewId: string,
    userId: string,
    data: Partial<ProductReview>
  ): Promise<ProductReview> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, userId }
    });

    if (!review) {
      throw new Error('Review not found or unauthorized');
    }

    // 수정 가능 기간 체크 (30일)
    const daysSinceCreation = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30) {
      throw new Error('Review can only be edited within 30 days');
    }

    // 업데이트
    Object.assign(review, data);
    review.status = 'pending'; // 재검토 필요

    await this.reviewRepository.save(review);

    // 상품 평점 재계산
    await this.updateProductRating(review.productId);

    return review;
  }

  /**
   * 리뷰 삭제
   */
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, userId }
    });

    if (!review) {
      throw new Error('Review not found or unauthorized');
    }

    await this.reviewRepository.remove(review);

    // 상품 평점 재계산
    await this.updateProductRating(review.productId);

    logger.info(`Review ${reviewId} deleted`);
  }

  /**
   * 리뷰 목록 조회
   */
  async getReviews(
    productId: string,
    filter: ReviewFilter = {}
  ): Promise<{ reviews: ProductReview[]; total: number }> {
    const query = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.productId = :productId', { productId })
      .andWhere('review.status = :status', { status: 'approved' });

    // 필터 적용
    if (filter.rating) {
      query.andWhere('review.rating = :rating', { rating: filter.rating });
    }

    if (filter.verifiedPurchase !== undefined) {
      query.andWhere('review.isVerifiedPurchase = :verified', {
        verified: filter.verifiedPurchase
      });
    }

    if (filter.hasPhotos) {
      query.andWhere('review.images IS NOT NULL AND JSON_LENGTH(review.images) > 0');
    }

    // 정렬
    switch (filter.sortBy) {
      case 'oldest':
        query.orderBy('review.createdAt', 'ASC');
        break;
      case 'helpful':
        query.orderBy('review.helpfulCount', 'DESC');
        break;
      case 'rating_high':
        query.orderBy('review.rating', 'DESC');
        break;
      case 'rating_low':
        query.orderBy('review.rating', 'ASC');
        break;
      case 'newest':
      default:
        query.orderBy('review.createdAt', 'DESC');
    }

    // 페이징
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    query.skip((page - 1) * limit).take(limit);

    const [reviews, total] = await query.getManyAndCount();

    return { reviews, total };
  }

  /**
   * 리뷰 통계 조회
   */
  async getReviewStats(productId: string): Promise<ReviewStats> {
    const reviews = await this.reviewRepository.find({
      where: { productId, status: 'approved' }
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedPurchaseCount: 0,
        recommendationRate: 0,
        topKeywords: [],
        averagePhotosPerReview: 0
      };
    }

    // 평점 분포
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    let verifiedCount = 0;
    let recommendedCount = 0;
    let totalPhotos = 0;

    reviews.forEach(review => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
      totalRating += review.rating;
      if (review.isVerifiedPurchase) verifiedCount++;
      if (review.isRecommended) recommendedCount++;
      totalPhotos += review.images?.length || 0;
    });

    // 키워드 추출 (간단한 버전)
    const keywords = this.extractKeywords(reviews);

    return {
      averageRating: Number((totalRating / reviews.length).toFixed(1)),
      totalReviews: reviews.length,
      ratingDistribution,
      verifiedPurchaseCount: verifiedCount,
      recommendationRate: Number((recommendedCount / reviews.length * 100).toFixed(1)),
      topKeywords: keywords.slice(0, 5),
      averagePhotosPerReview: Number((totalPhotos / reviews.length).toFixed(1))
    };
  }

  /**
   * 리뷰 요약 조회
   */
  async getReviewSummary(productId: string, userId?: string): Promise<ReviewSummary> {
    const stats = await this.getReviewStats(productId);

    // 가장 도움이 된 리뷰
    const mostHelpfulReviews = await this.reviewRepository.find({
      where: { productId, status: 'approved' },
      order: { helpfulCount: 'DESC' },
      take: 3,
      relations: ['user']
    });

    // 최근 리뷰
    const recentReviews = await this.reviewRepository.find({
      where: { productId, status: 'approved' },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['user']
    });

    // 특징 리뷰 (높은 평점, 사진 포함, 인증 구매)
    const featuredReview = await this.reviewRepository.findOne({
      where: {
        productId,
        status: 'approved',
        isVerifiedPurchase: true,
        rating: 5
      },
      order: { helpfulCount: 'DESC' },
      relations: ['user']
    });

    // 사용자 리뷰
    let userReview: ProductReview | undefined;
    if (userId) {
      userReview = await this.reviewRepository.findOne({
        where: { productId, userId },
        relations: ['user']
      }) || undefined;
    }

    return {
      productId,
      stats,
      featuredReview: featuredReview || undefined,
      mostHelpfulReviews,
      recentReviews,
      userReview
    };
  }

  /**
   * 리뷰 도움됨 투표
   */
  async voteReview(
    reviewId: string,
    userId: string,
    voteType: 'helpful' | 'unhelpful'
  ): Promise<void> {
    // 기존 투표 확인
    const existingVote = await this.voteRepository.findOne({
      where: { reviewId, userId }
    });

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // 같은 투표면 취소
        await this.voteRepository.remove(existingVote);
        
        // 카운트 감소
        await this.updateVoteCount(reviewId, voteType, -1);
      } else {
        // 다른 투표로 변경
        const oldType = existingVote.voteType;
        existingVote.voteType = voteType;
        await this.voteRepository.save(existingVote);
        
        // 카운트 업데이트
        await this.updateVoteCount(reviewId, oldType, -1);
        await this.updateVoteCount(reviewId, voteType, 1);
      }
    } else {
      // 새 투표
      const vote = this.voteRepository.create({
        reviewId,
        userId,
        voteType
      });
      await this.voteRepository.save(vote);
      
      // 카운트 증가
      await this.updateVoteCount(reviewId, voteType, 1);
    }
  }

  /**
   * 판매자 답변
   */
  async replyToReview(
    reviewId: string,
    merchantId: string,
    reply: string
  ): Promise<ProductReview> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['product']
    });

    if (!review) {
      throw new Error('Review not found');
    }

    // 판매자 권한 확인 (구현 필요)
    // ...

    review.merchantReply = reply;
    review.merchantReplyAt = new Date();

    await this.reviewRepository.save(review);

    // 리뷰 작성자에게 알림
    this.emit('merchantReplied', {
      reviewId,
      userId: review.userId,
      productId: review.productId
    });

    return review;
  }

  /**
   * 리뷰 검토 (관리자)
   */
  async moderateReview(
    reviewId: string,
    status: 'approved' | 'rejected',
    note?: string
  ): Promise<ProductReview> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId }
    });

    if (!review) {
      throw new Error('Review not found');
    }

    review.status = status;
    review.moderationNote = note;

    await this.reviewRepository.save(review);

    // 상품 평점 재계산
    if (status === 'approved') {
      await this.updateProductRating(review.productId);
    }

    return review;
  }

  /**
   * 자동 승인 여부 판단
   */
  private shouldAutoApprove(data: any): boolean {
    // 욕설, 스팸 필터링 (간단한 예시)
    const bannedWords = ['spam', 'fake', '광고'];
    const content = `${data.title} ${data.content}`.toLowerCase();
    
    for (const word of bannedWords) {
      if (content.includes(word)) {
        return false;
      }
    }

    // 인증 구매는 자동 승인
    return data.isVerifiedPurchase || false;
  }

  /**
   * 상품 평점 업데이트
   */
  private async updateProductRating(productId: string): Promise<void> {
    const stats = await this.getReviewStats(productId);
    
    const product = await this.productRepository.findOne({
      where: { id: productId }
    });

    if (product) {
      product.rating = stats.averageRating;
      product.reviewCount = stats.totalReviews;
      
      await this.productRepository.save(product);
    }
  }

  /**
   * 투표 카운트 업데이트
   */
  private async updateVoteCount(
    reviewId: string,
    voteType: 'helpful' | 'unhelpful',
    delta: number
  ): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId }
    });

    if (review) {
      if (voteType === 'helpful') {
        review.helpfulCount = Math.max(0, review.helpfulCount + delta);
      } else {
        review.unhelpfulCount = Math.max(0, review.unhelpfulCount + delta);
      }
      
      await this.reviewRepository.save(review);
    }
  }

  /**
   * 키워드 추출
   */
  private extractKeywords(reviews: ProductReview[]): string[] {
    const wordCount: Record<string, number> = {};
    
    reviews.forEach(review => {
      // 장점과 단점에서 키워드 추출
      const words = [
        ...(review.pros || []),
        ...(review.cons || [])
      ];
      
      words.forEach(word => {
        const normalized = word.toLowerCase().trim();
        wordCount[normalized] = (wordCount[normalized] || 0) + 1;
      });
    });

    // 빈도순 정렬
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  /**
   * 판매자 알림
   */
  private async notifyMerchant(review: ProductReview): Promise<void> {
    // 낮은 평점 리뷰는 즉시 알림
    if (review.rating <= 2) {
      this.emit('lowRatingReview', {
        productId: review.productId,
        reviewId: review.id,
        rating: review.rating
      });
    }
  }

  /**
   * 리뷰 요청 이메일
   */
  async sendReviewRequest(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user']
    });

    if (!order || !order.user?.email) return;

    // 배송 완료 후 3일 후 발송
    const daysSinceDelivery = (Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery < 3) return;

    // 이메일 발송 (EmailService 연동)
    logger.info(`Sending review request for order ${orderId}`);
  }
}

// 싱글톤 인스턴스
export const reviewService = new ReviewService();