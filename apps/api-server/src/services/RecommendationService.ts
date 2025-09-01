/**
 * 상품 추천 서비스
 * 개인화 추천, 연관 상품, 인기 상품 등
 */

import { AppDataSource } from '../database/connection';
import { Product, ProductStatus } from '../entities/Product';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { ProductReview } from '../entities/ProductReview';
import { Wishlist } from '../entities/ProductReview';
import logger from '../utils/simpleLogger';
import { Redis } from 'ioredis';

interface RecommendationScore {
  productId: string;
  score: number;
  reasons: string[];
  product?: Product;
}

interface UserPreference {
  userId: string;
  categories: Map<string, number>;
  priceRange: { min: number; max: number };
  brands: Map<string, number>;
  attributes: Map<string, Map<string, number>>;
  lastUpdated: Date;
}

interface RelatedProduct {
  productId: string;
  score: number;
  type: 'frequently_bought' | 'similar' | 'complementary' | 'same_brand';
}

export class RecommendationService {
  private redis: Redis;
  private productRepository = AppDataSource.getRepository(Product);
  private orderRepository = AppDataSource.getRepository(Order);
  private reviewRepository = AppDataSource.getRepository(ProductReview);
  private wishlistRepository = AppDataSource.getRepository(Wishlist);
  private userRepository = AppDataSource.getRepository(User);

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
  }

  /**
   * 개인화 추천
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<RecommendationScore[]> {
    try {
      // 사용자 선호도 분석
      const preferences = await this.analyzeUserPreferences(userId);
      
      // 추천 점수 계산
      const scores = new Map<string, RecommendationScore>();
      
      // 1. 구매 이력 기반 추천
      const purchaseBasedRecs = await this.getPurchaseBasedRecommendations(userId);
      this.mergeScores(scores, purchaseBasedRecs, 0.3);
      
      // 2. 브라우징 이력 기반 추천
      const browsingBasedRecs = await this.getBrowsingBasedRecommendations(userId);
      this.mergeScores(scores, browsingBasedRecs, 0.2);
      
      // 3. 위시리스트 기반 추천
      const wishlistBasedRecs = await this.getWishlistBasedRecommendations(userId);
      this.mergeScores(scores, wishlistBasedRecs, 0.15);
      
      // 4. 협업 필터링 (유사 사용자)
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId);
      this.mergeScores(scores, collaborativeRecs, 0.25);
      
      // 5. 트렌딩 상품
      const trendingRecs = await this.getTrendingProducts();
      this.mergeScores(scores, trendingRecs, 0.1);
      
      // 점수 정렬 및 상위 N개 반환
      const sortedRecommendations = Array.from(scores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // 상품 정보 추가
      for (const rec of sortedRecommendations) {
        rec.product = await this.productRepository.findOne({
          where: { id: rec.productId }
        }) || undefined;
      }
      
      // 캐시 저장
      await this.cacheRecommendations(userId, sortedRecommendations);
      
      return sortedRecommendations;
    } catch (error) {
      logger.error('Failed to get personalized recommendations:', error);
      return this.getFallbackRecommendations(limit);
    }
  }

  /**
   * 연관 상품 추천
   */
  async getRelatedProducts(
    productId: string,
    type?: 'all' | 'frequently_bought' | 'similar' | 'complementary',
    limit: number = 6
  ): Promise<RelatedProduct[]> {
    const relatedProducts: RelatedProduct[] = [];
    
    if (type === 'all' || type === 'frequently_bought') {
      const frequentlyBought = await this.getFrequentlyBoughtTogether(productId);
      relatedProducts.push(...frequentlyBought);
    }
    
    if (type === 'all' || type === 'similar') {
      const similarProducts = await this.getSimilarProducts(productId);
      relatedProducts.push(...similarProducts);
    }
    
    if (type === 'all' || type === 'complementary') {
      const complementaryProducts = await this.getComplementaryProducts(productId);
      relatedProducts.push(...complementaryProducts);
    }
    
    // 중복 제거 및 정렬
    const uniqueProducts = this.deduplicateProducts(relatedProducts);
    
    return uniqueProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 자주 함께 구매한 상품
   */
  private async getFrequentlyBoughtTogether(
    productId: string
  ): Promise<RelatedProduct[]> {
    // 같은 주문에 포함된 상품들 조회
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .innerJoin('order.items', 'otherItem')
      .where('item.productId = :productId', { productId })
      .andWhere('otherItem.productId != :productId', { productId })
      .select('otherItem.productId', 'productId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('otherItem.productId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
    
    return orders.map(o => ({
      productId: o.productId,
      score: parseFloat(o.count) / 10, // 정규화
      type: 'frequently_bought' as const
    }));
  }

  /**
   * 유사 상품
   */
  private async getSimilarProducts(productId: string): Promise<RelatedProduct[]> {
    const product = await this.productRepository.findOne({
      where: { id: productId }
    });
    
    if (!product) return [];
    
    // 같은 카테고리, 비슷한 가격대의 상품
    const similarProducts = await this.productRepository
      .createQueryBuilder('product')
      .where('product.categoryId = :categoryId', { categoryId: product.categoryId })
      .andWhere('product.id != :productId', { productId })
      .andWhere('product.price BETWEEN :minPrice AND :maxPrice', {
        minPrice: product.price * 0.7,
        maxPrice: product.price * 1.3
      })
      .andWhere('product.status = :status', { status: 'active' })
      .orderBy('product.rating', 'DESC')
      .limit(10)
      .getMany();
    
    return similarProducts.map((p, index) => ({
      productId: p.id,
      score: 1 - (index * 0.1), // 순위에 따른 점수
      type: 'similar' as const
    }));
  }

  /**
   * 보완 상품
   */
  private async getComplementaryProducts(
    productId: string
  ): Promise<RelatedProduct[]> {
    // 카테고리 매핑 (예시)
    const complementaryCategories: Record<string, string[]> = {
      'phones': ['phone-cases', 'screen-protectors', 'chargers'],
      'laptops': ['laptop-bags', 'mice', 'keyboards'],
      'cameras': ['lenses', 'tripods', 'memory-cards']
    };
    
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['category']
    });
    
    if (!product) return [];
    
    const relatedCategories = complementaryCategories[product.category || ''] || [];
    
    if (relatedCategories.length === 0) return [];
    
    const complementary = await this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.category', 'category')
      .where('category.slug IN (:...categories)', { categories: relatedCategories })
      .andWhere('product.status = :status', { status: 'active' })
      .orderBy('product.salesCount', 'DESC')
      .limit(10)
      .getMany();
    
    return complementary.map((p, index) => ({
      productId: p.id,
      score: 0.8 - (index * 0.08),
      type: 'complementary' as const
    }));
  }

  /**
   * 사용자 선호도 분석
   */
  private async analyzeUserPreferences(userId: string): Promise<UserPreference> {
    const cacheKey = `user_preference:${userId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const preference: UserPreference = {
      userId,
      categories: new Map(),
      priceRange: { min: 0, max: 1000000 },
      brands: new Map(),
      attributes: new Map(),
      lastUpdated: new Date()
    };
    
    // 구매 이력 분석
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.category']
    });
    
    let totalPrice = 0;
    let priceCount = 0;
    
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (item.product) {
          // 카테고리 선호도
          const categoryId = item.product.categoryId;
          if (categoryId) {
            preference.categories.set(
              categoryId,
              (preference.categories.get(categoryId) || 0) + 1
            );
          }
          
          // 가격대
          totalPrice += item.price;
          priceCount++;
          
          // 브랜드 선호도
          const brand = item.product.brand;
          if (brand) {
            preference.brands.set(
              brand,
              (preference.brands.get(brand) || 0) + 1
            );
          }
        }
      });
    });
    
    // 평균 구매 가격대 계산
    if (priceCount > 0) {
      const avgPrice = totalPrice / priceCount;
      preference.priceRange = {
        min: avgPrice * 0.5,
        max: avgPrice * 2
      };
    }
    
    // 캐시 저장 (1시간)
    await this.redis.setex(cacheKey, 3600, JSON.stringify(preference));
    
    return preference;
  }

  /**
   * 구매 이력 기반 추천
   */
  private async getPurchaseBasedRecommendations(
    userId: string
  ): Promise<RecommendationScore[]> {
    const preference = await this.analyzeUserPreferences(userId);
    const recommendations: RecommendationScore[] = [];
    
    // 선호 카테고리의 인기 상품
    for (const [categoryId, score] of preference.categories) {
      const products = await this.productRepository
        .createQueryBuilder('product')
        .where('product.categoryId = :categoryId', { categoryId })
        .andWhere('product.status = :status', { status: 'active' })
        .orderBy('product.salesCount', 'DESC')
        .limit(5)
        .getMany();
      
      products.forEach(product => {
        recommendations.push({
          productId: product.id,
          score: score * 0.1,
          reasons: ['Based on your purchase history']
        });
      });
    }
    
    return recommendations;
  }

  /**
   * 브라우징 이력 기반 추천
   */
  private async getBrowsingBasedRecommendations(
    userId: string
  ): Promise<RecommendationScore[]> {
    // Redis에서 최근 본 상품 조회
    const viewedProducts = await this.redis.lrange(`viewed:${userId}`, 0, 20);
    const recommendations: RecommendationScore[] = [];
    
    for (const productId of viewedProducts) {
      const related = await this.getSimilarProducts(productId);
      related.forEach(r => {
        recommendations.push({
          productId: r.productId,
          score: r.score * 0.5,
          reasons: ['Similar to items you viewed']
        });
      });
    }
    
    return recommendations;
  }

  /**
   * 위시리스트 기반 추천
   */
  private async getWishlistBasedRecommendations(
    userId: string
  ): Promise<RecommendationScore[]> {
    const wishlistItems = await this.wishlistRepository.find({
      where: { userId },
      relations: ['product']
    });
    
    const recommendations: RecommendationScore[] = [];
    
    for (const item of wishlistItems) {
      if (item.product) {
        // 위시리스트 상품과 유사한 상품 추천
        const similar = await this.getSimilarProducts(item.productId);
        similar.forEach(s => {
          recommendations.push({
            productId: s.productId,
            score: s.score * 0.3,
            reasons: ['Similar to items in your wishlist']
          });
        });
      }
    }
    
    return recommendations;
  }

  /**
   * 협업 필터링
   */
  private async getCollaborativeRecommendations(
    userId: string
  ): Promise<RecommendationScore[]> {
    // 유사한 구매 패턴을 가진 사용자 찾기
    const userOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .select('DISTINCT order.items.productId', 'productId')
      .getRawMany();
    
    const userProducts = userOrders.map(o => o.productId);
    
    if (userProducts.length === 0) return [];
    
    // 같은 상품을 구매한 다른 사용자들 찾기
    const similarUsers = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('item.productId IN (:...products)', { products: userProducts })
      .andWhere('order.userId != :userId', { userId })
      .select('DISTINCT order.userId', 'userId')
      .limit(50)
      .getRawMany();
    
    const recommendations: RecommendationScore[] = [];
    
    // 유사 사용자들이 구매한 다른 상품들
    for (const simUser of similarUsers) {
      const otherProducts = await this.orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.items', 'item')
        .where('order.userId = :userId', { userId: simUser.userId })
        .andWhere('item.productId NOT IN (:...excluded)', { excluded: userProducts })
        .select('item.productId', 'productId')
        .addSelect('COUNT(*)', 'count')
        .groupBy('item.productId')
        .limit(5)
        .getRawMany();
      
      otherProducts.forEach(p => {
        recommendations.push({
          productId: p.productId,
          score: parseFloat(p.count) * 0.1,
          reasons: ['Users like you also bought']
        });
      });
    }
    
    return recommendations;
  }

  /**
   * 트렌딩 상품
   */
  private async getTrendingProducts(): Promise<RecommendationScore[]> {
    // 최근 7일간 가장 많이 판매된 상품
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const trending = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('order.createdAt > :date', { date: sevenDaysAgo })
      .select('item.productId', 'productId')
      .addSelect('COUNT(*)', 'salesCount')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .groupBy('item.productId')
      .orderBy('salesCount', 'DESC')
      .limit(20)
      .getRawMany();
    
    return trending.map((t, index) => ({
      productId: t.productId,
      score: (20 - index) * 0.05,
      reasons: ['Trending now']
    }));
  }

  /**
   * 점수 병합
   */
  private mergeScores(
    scores: Map<string, RecommendationScore>,
    newScores: RecommendationScore[],
    weight: number
  ): void {
    newScores.forEach(newScore => {
      const existing = scores.get(newScore.productId);
      if (existing) {
        existing.score += newScore.score * weight;
        existing.reasons = [...new Set([...existing.reasons, ...newScore.reasons])];
      } else {
        scores.set(newScore.productId, {
          ...newScore,
          score: newScore.score * weight
        });
      }
    });
  }

  /**
   * 중복 제거
   */
  private deduplicateProducts(products: RelatedProduct[]): RelatedProduct[] {
    const seen = new Set<string>();
    return products.filter(p => {
      if (seen.has(p.productId)) return false;
      seen.add(p.productId);
      return true;
    });
  }

  /**
   * 추천 캐싱
   */
  private async cacheRecommendations(
    userId: string,
    recommendations: RecommendationScore[]
  ): Promise<void> {
    const cacheKey = `recommendations:${userId}`;
    await this.redis.setex(
      cacheKey,
      3600, // 1시간
      JSON.stringify(recommendations)
    );
  }

  /**
   * 폴백 추천 (개인화 실패 시)
   */
  private async getFallbackRecommendations(limit: number): Promise<RecommendationScore[]> {
    const bestSellers = await this.productRepository.find({
      where: { status: ProductStatus.ACTIVE },
      order: { salesCount: 'DESC' },
      take: limit
    });
    
    return bestSellers.map((product, index) => ({
      productId: product.id,
      score: 1 - (index * 0.1),
      reasons: ['Best seller'],
      product
    }));
  }

  /**
   * 사용자 행동 기록
   */
  async trackUserBehavior(
    userId: string,
    event: 'view' | 'cart' | 'purchase' | 'wishlist',
    productId: string
  ): Promise<void> {
    const key = `behavior:${userId}:${event}`;
    const timestamp = Date.now();
    
    // Redis에 저장 (최근 100개만 유지)
    await this.redis.zadd(key, timestamp, productId);
    await this.redis.zremrangebyrank(key, 0, -101);
    
    // 최근 본 상품 리스트 업데이트
    if (event === 'view') {
      await this.redis.lpush(`viewed:${userId}`, productId);
      await this.redis.ltrim(`viewed:${userId}`, 0, 50);
    }
  }

  /**
   * A/B 테스트용 추천
   */
  async getABTestRecommendations(
    userId: string,
    variant: 'A' | 'B',
    limit: number = 10
  ): Promise<RecommendationScore[]> {
    if (variant === 'A') {
      // 기존 알고리즘
      return this.getPersonalizedRecommendations(userId, limit);
    } else {
      // 새 알고리즘 (예: 더 많은 가중치를 협업 필터링에)
      const scores = new Map<string, RecommendationScore>();
      
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId);
      this.mergeScores(scores, collaborativeRecs, 0.5);
      
      const trendingRecs = await this.getTrendingProducts();
      this.mergeScores(scores, trendingRecs, 0.5);
      
      return Array.from(scores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }
  }
}

// 싱글톤 인스턴스
export const recommendationService = new RecommendationService();