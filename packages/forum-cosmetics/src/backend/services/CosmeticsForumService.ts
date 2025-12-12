import { Repository, DataSource } from 'typeorm';
import {
  CosmeticsForumMeta,
  CosmeticsSkinType,
  CosmeticsConcern,
  CosmeticsPostType,
} from '../entities/CosmeticsForumMeta.js';

/**
 * Forum Post Data type (without class methods)
 * Used for API responses where we don't need the class methods
 */
export interface ForumPostData {
  id: string;
  title: string;
  slug: string;
  content: unknown[];
  excerpt?: string;
  type: string;
  status: string;
  categoryId: string;
  authorId: string;
  organizationId?: string;
  isOrganizationExclusive: boolean;
  isPinned: boolean;
  isLocked: boolean;
  allowComments: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  publishedAt?: Date;
  lastCommentAt?: Date;
  lastCommentBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query options for listing cosmetics forum posts
 */
export interface CosmeticsForumQueryOptions {
  skinType?: CosmeticsSkinType;
  concerns?: CosmeticsConcern[];
  brand?: string;
  productId?: string;
  postType?: CosmeticsPostType;
  minRating?: number;
  ingredients?: string[];
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'rating' | 'viewCount';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * DTO for creating cosmetics forum metadata
 */
export interface CreateCosmeticsMetaDto {
  postId: string;
  skinType?: CosmeticsSkinType;
  concerns?: string[];
  brand?: string;
  productId?: string;
  productName?: string;
  rating?: number;
  ingredients?: string[];
  postType?: CosmeticsPostType;
  isVerifiedPurchase?: boolean;
  additionalData?: Record<string, unknown>;
}

/**
 * DTO for updating cosmetics forum metadata
 */
export interface UpdateCosmeticsMetaDto {
  skinType?: CosmeticsSkinType;
  concerns?: string[];
  brand?: string;
  productId?: string;
  productName?: string;
  rating?: number;
  ingredients?: string[];
  postType?: CosmeticsPostType;
  isVerifiedPurchase?: boolean;
  isFeatured?: boolean;
  additionalData?: Record<string, unknown>;
}

/**
 * Result type for paginated queries
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Product Forum Summary (Phase 14-2: Ecommerce Integration)
 * Aggregated forum data for a specific product
 */
export interface ProductForumSummary {
  productId: string;
  avgRating: number;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
  topConcerns: string[];
  topSkinTypes: string[];
  verifiedPurchaseCount: number;
  latestPosts: (ForumPostData & { cosmeticsMeta?: CosmeticsForumMeta })[];
}

/**
 * CosmeticsForumService
 *
 * Handles cosmetics-specific forum operations:
 * - Cosmetics metadata management
 * - Skin type filtering
 * - Concerns-based search
 * - Product and brand filtering
 * - Rating-based sorting
 * - Ingredient filtering
 * - Product integration for ecommerce (Phase 14-2)
 */
export class CosmeticsForumService {
  private metaRepository: Repository<CosmeticsForumMeta>;
  private forumPostRepository: Repository<ForumPostData>;

  constructor(
    metaRepository: Repository<CosmeticsForumMeta>,
    forumPostRepository: Repository<ForumPostData>
  ) {
    this.metaRepository = metaRepository;
    this.forumPostRepository = forumPostRepository;
  }

  /**
   * Create from DataSource
   */
  static fromDataSource(dataSource: DataSource): CosmeticsForumService {
    const metaRepo = dataSource.getRepository(CosmeticsForumMeta);
    const forumPostRepo = dataSource.getRepository('forum_post') as Repository<ForumPostData>;
    return new CosmeticsForumService(metaRepo, forumPostRepo);
  }

  /**
   * Create cosmetics metadata for a post
   */
  async createMeta(data: CreateCosmeticsMetaDto): Promise<CosmeticsForumMeta> {
    const meta = this.metaRepository.create({
      postId: data.postId,
      skinType: data.skinType,
      concerns: data.concerns,
      brand: data.brand,
      productId: data.productId,
      productName: data.productName,
      rating: data.rating,
      ingredients: data.ingredients,
      postType: data.postType || CosmeticsPostType.REVIEW,
      isVerifiedPurchase: data.isVerifiedPurchase || false,
      additionalData: data.additionalData,
    });

    return await this.metaRepository.save(meta);
  }

  /**
   * Get cosmetics metadata by post ID
   */
  async getMetaByPostId(postId: string): Promise<CosmeticsForumMeta | null> {
    return await this.metaRepository.findOne({
      where: { postId },
    });
  }

  /**
   * Update cosmetics metadata
   */
  async updateMeta(postId: string, data: UpdateCosmeticsMetaDto): Promise<CosmeticsForumMeta | null> {
    const meta = await this.metaRepository.findOne({
      where: { postId },
    });

    if (!meta) {
      return null;
    }

    Object.assign(meta, data);
    return await this.metaRepository.save(meta);
  }

  /**
   * Delete cosmetics metadata
   */
  async deleteMeta(postId: string): Promise<boolean> {
    const result = await this.metaRepository.delete({ postId });
    return (result.affected || 0) > 0;
  }

  /**
   * List cosmetics forum posts with filters
   */
  async listPosts(options: CosmeticsForumQueryOptions = {}): Promise<PaginatedResult<ForumPostData & { cosmeticsMeta?: CosmeticsForumMeta }>> {
    const {
      skinType,
      brand,
      productId,
      postType,
      minRating,
      isFeatured,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const metaQueryBuilder = this.metaRepository.createQueryBuilder('meta');

    if (skinType) {
      metaQueryBuilder.andWhere('meta.skinType = :skinType', { skinType });
    }
    if (brand) {
      metaQueryBuilder.andWhere('meta.brand ILIKE :brand', { brand: `%${brand}%` });
    }
    if (productId) {
      metaQueryBuilder.andWhere('meta.productId = :productId', { productId });
    }
    if (postType) {
      metaQueryBuilder.andWhere('meta.postType = :postType', { postType });
    }
    if (minRating !== undefined) {
      metaQueryBuilder.andWhere('meta.rating >= :minRating', { minRating });
    }
    if (isFeatured !== undefined) {
      metaQueryBuilder.andWhere('meta.isFeatured = :isFeatured', { isFeatured });
    }

    const metaResults = await metaQueryBuilder.getMany();
    const postIds = metaResults.map(m => m.postId);

    if (postIds.length === 0) {
      return { items: [], total: 0, page: Math.floor(offset / limit) + 1, limit, totalPages: 0 };
    }

    const postQueryBuilder = this.forumPostRepository
      .createQueryBuilder('post')
      .where('post.id IN (:...postIds)', { postIds })
      .andWhere("post.status = :status", { status: 'publish' });

    if (sortBy === 'viewCount') {
      postQueryBuilder.orderBy('post.viewCount', sortOrder as 'ASC' | 'DESC');
    } else {
      postQueryBuilder.orderBy('post.createdAt', sortOrder as 'ASC' | 'DESC');
    }

    const total = await postQueryBuilder.getCount();
    const posts = await postQueryBuilder.skip(offset).take(limit).getMany();

    const postsWithMeta = posts.map(post => ({
      ...post,
      cosmeticsMeta: metaResults.find(m => m.postId === post.id),
    }));

    return {
      items: postsWithMeta,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get posts by skin type
   */
  async getPostsBySkinType(skinType: CosmeticsSkinType, options?: { limit?: number; offset?: number }): Promise<ForumPostData[]> {
    const result = await this.listPosts({ skinType, ...options });
    return result.items;
  }

  /**
   * Get posts by concerns
   */
  async getPostsByConcerns(concerns: CosmeticsConcern[], options?: { limit?: number; offset?: number }): Promise<ForumPostData[]> {
    const metaResults = await this.metaRepository.createQueryBuilder('meta').getMany();
    const matchingMeta = metaResults.filter(meta => {
      if (!meta.concerns || meta.concerns.length === 0) return false;
      return concerns.some(concern => meta.concerns?.includes(concern));
    });

    const postIds = matchingMeta.map(m => m.postId);
    if (postIds.length === 0) return [];

    return await this.forumPostRepository
      .createQueryBuilder('post')
      .where('post.id IN (:...postIds)', { postIds })
      .andWhere("post.status = :status", { status: 'publish' })
      .orderBy('post.createdAt', 'DESC')
      .skip(options?.offset || 0)
      .take(options?.limit || 20)
      .getMany();
  }

  /**
   * Get posts by brand
   */
  async getPostsByBrand(brand: string, options?: { limit?: number; offset?: number }): Promise<ForumPostData[]> {
    const result = await this.listPosts({ brand, ...options });
    return result.items;
  }

  /**
   * Get top-rated posts
   */
  async getTopRatedPosts(options?: { limit?: number; minRating?: number }): Promise<(ForumPostData & { cosmeticsMeta?: CosmeticsForumMeta })[]> {
    const limit = options?.limit || 10;
    const minRating = options?.minRating || 4;

    const metaResults = await this.metaRepository
      .createQueryBuilder('meta')
      .where('meta.rating >= :minRating', { minRating })
      .orderBy('meta.rating', 'DESC')
      .take(limit)
      .getMany();

    const postIds = metaResults.map(m => m.postId);
    if (postIds.length === 0) return [];

    const posts = await this.forumPostRepository
      .createQueryBuilder('post')
      .where('post.id IN (:...postIds)', { postIds })
      .andWhere("post.status = :status", { status: 'publish' })
      .getMany();

    return posts.map(post => ({
      ...post,
      cosmeticsMeta: metaResults.find(m => m.postId === post.id),
    }));
  }

  /**
   * Get featured posts
   */
  async getFeaturedPosts(limit: number = 5): Promise<(ForumPostData & { cosmeticsMeta?: CosmeticsForumMeta })[]> {
    const result = await this.listPosts({ isFeatured: true, limit });
    return result.items;
  }

  /**
   * Feature a post
   */
  async featurePost(postId: string): Promise<CosmeticsForumMeta | null> {
    return await this.updateMeta(postId, { isFeatured: true });
  }

  /**
   * Unfeature a post
   */
  async unfeaturePost(postId: string): Promise<CosmeticsForumMeta | null> {
    return await this.updateMeta(postId, { isFeatured: false });
  }

  /**
   * Get statistics for cosmetics forum
   */
  async getStatistics(): Promise<{
    totalPosts: number;
    byPostType: Record<string, number>;
    bySkinType: Record<string, number>;
    averageRating: number;
    topBrands: { brand: string; count: number }[];
  }> {
    const allMeta = await this.metaRepository.find();

    const byPostType: Record<string, number> = {};
    const bySkinType: Record<string, number> = {};
    const brandCounts: Record<string, number> = {};
    let ratingSum = 0;
    let ratingCount = 0;

    for (const meta of allMeta) {
      byPostType[meta.postType] = (byPostType[meta.postType] || 0) + 1;
      if (meta.skinType) {
        bySkinType[meta.skinType] = (bySkinType[meta.skinType] || 0) + 1;
      }
      if (meta.brand) {
        brandCounts[meta.brand] = (brandCounts[meta.brand] || 0) + 1;
      }
      if (meta.rating) {
        ratingSum += Number(meta.rating);
        ratingCount++;
      }
    }

    const topBrands = Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalPosts: allMeta.length,
      byPostType,
      bySkinType,
      averageRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
      topBrands,
    };
  }

  /**
   * Search posts by product name or brand
   */
  async searchPosts(query: string, options?: { limit?: number; offset?: number }): Promise<(ForumPostData & { cosmeticsMeta?: CosmeticsForumMeta })[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const metaResults = await this.metaRepository
      .createQueryBuilder('meta')
      .where('meta.brand ILIKE :query', { query: `%${query}%` })
      .orWhere('meta.productName ILIKE :query', { query: `%${query}%` })
      .take(limit + offset)
      .getMany();

    const postIds = metaResults.map(m => m.postId);
    if (postIds.length === 0) return [];

    const posts = await this.forumPostRepository
      .createQueryBuilder('post')
      .where('post.id IN (:...postIds)', { postIds })
      .andWhere("post.status = :status", { status: 'publish' })
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return posts.map(post => ({
      ...post,
      cosmeticsMeta: metaResults.find(m => m.postId === post.id),
    }));
  }

  // =========================================================================
  // Product Integration Methods (Phase 14-2: Ecommerce Integration)
  // =========================================================================

  /**
   * Get forum posts for a specific product
   * Used by ecommerce product detail pages
   */
  async getPostsByProduct(
    productId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<PaginatedResult<ForumPostData & { cosmeticsMeta?: CosmeticsForumMeta }>> {
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    const metaResults = await this.metaRepository
      .createQueryBuilder('meta')
      .where('meta.productId = :productId', { productId })
      .orderBy('meta.createdAt', 'DESC')
      .getMany();

    const postIds = metaResults.map(m => m.postId);
    if (postIds.length === 0) {
      return { items: [], total: 0, page: Math.floor(offset / limit) + 1, limit, totalPages: 0 };
    }

    const total = await this.forumPostRepository
      .createQueryBuilder('post')
      .where('post.id IN (:...postIds)', { postIds })
      .andWhere("post.status = :status", { status: 'publish' })
      .getCount();

    const posts = await this.forumPostRepository
      .createQueryBuilder('post')
      .where('post.id IN (:...postIds)', { postIds })
      .andWhere("post.status = :status", { status: 'publish' })
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      items: posts.map(post => ({ ...post, cosmeticsMeta: metaResults.find(m => m.postId === post.id) })),
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get aggregated rating for a product
   */
  async getAggregatedRatingByProduct(productId: string): Promise<{
    avgRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    verifiedPurchaseCount: number;
  }> {
    const metaResults = await this.metaRepository
      .createQueryBuilder('meta')
      .where('meta.productId = :productId', { productId })
      .andWhere('meta.rating IS NOT NULL')
      .getMany();

    if (metaResults.length === 0) {
      return { avgRating: 0, totalReviews: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, verifiedPurchaseCount: 0 };
    }

    const ratings = metaResults.filter(m => m.rating !== null && m.rating !== undefined).map(m => Number(m.rating));
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const rating of ratings) {
      const rounded = Math.round(rating);
      if (rounded >= 1 && rounded <= 5) ratingDistribution[rounded]++;
    }

    return {
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: metaResults.length,
      ratingDistribution,
      verifiedPurchaseCount: metaResults.filter(m => m.isVerifiedPurchase).length,
    };
  }

  /**
   * Get comprehensive forum stats for a product (for product detail page)
   */
  async getForumStatsForProduct(productId: string): Promise<ProductForumSummary> {
    const metaResults = await this.metaRepository
      .createQueryBuilder('meta')
      .where('meta.productId = :productId', { productId })
      .orderBy('meta.createdAt', 'DESC')
      .getMany();

    if (metaResults.length === 0) {
      return {
        productId, avgRating: 0, reviewCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        topConcerns: [], topSkinTypes: [], verifiedPurchaseCount: 0, latestPosts: [],
      };
    }

    const ratingStats = await this.getAggregatedRatingByProduct(productId);

    const concernCounts: Record<string, number> = {};
    const skinTypeCounts: Record<string, number> = {};
    for (const meta of metaResults) {
      if (meta.concerns && Array.isArray(meta.concerns)) {
        for (const concern of meta.concerns) concernCounts[concern] = (concernCounts[concern] || 0) + 1;
      }
      if (meta.skinType) skinTypeCounts[meta.skinType] = (skinTypeCounts[meta.skinType] || 0) + 1;
    }

    const topConcerns = Object.entries(concernCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
    const topSkinTypes = Object.entries(skinTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);

    const postIds = metaResults.slice(0, 5).map(m => m.postId);
    let latestPosts: (ForumPostData & { cosmeticsMeta?: CosmeticsForumMeta })[] = [];
    if (postIds.length > 0) {
      const posts = await this.forumPostRepository
        .createQueryBuilder('post')
        .where('post.id IN (:...postIds)', { postIds })
        .andWhere("post.status = :status", { status: 'publish' })
        .orderBy('post.createdAt', 'DESC')
        .take(5)
        .getMany();
      latestPosts = posts.map(post => ({ ...post, cosmeticsMeta: metaResults.find(m => m.postId === post.id) }));
    }

    return {
      productId,
      avgRating: ratingStats.avgRating,
      reviewCount: metaResults.length,
      ratingDistribution: ratingStats.ratingDistribution,
      topConcerns,
      topSkinTypes,
      verifiedPurchaseCount: ratingStats.verifiedPurchaseCount,
      latestPosts,
    };
  }

  /**
   * Get brand statistics for ecommerce brand pages
   */
  async getProductBrandStats(brand: string): Promise<{
    brand: string;
    totalPosts: number;
    avgRating: number;
    productCount: number;
    topProducts: { productId: string; postCount: number; avgRating: number }[];
  }> {
    const metaResults = await this.metaRepository
      .createQueryBuilder('meta')
      .where('meta.brand ILIKE :brand', { brand: `%${brand}%` })
      .getMany();

    if (metaResults.length === 0) {
      return { brand, totalPosts: 0, avgRating: 0, productCount: 0, topProducts: [] };
    }

    const ratings = metaResults.filter(m => m.rating !== null && m.rating !== undefined).map(m => Number(m.rating));
    const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10 : 0;

    const productStats: Record<string, { count: number; ratingSum: number; ratingCount: number }> = {};
    for (const meta of metaResults) {
      if (meta.productId) {
        if (!productStats[meta.productId]) productStats[meta.productId] = { count: 0, ratingSum: 0, ratingCount: 0 };
        productStats[meta.productId].count++;
        if (meta.rating) {
          productStats[meta.productId].ratingSum += Number(meta.rating);
          productStats[meta.productId].ratingCount++;
        }
      }
    }

    const topProducts = Object.entries(productStats)
      .map(([pid, stats]) => ({
        productId: pid,
        postCount: stats.count,
        avgRating: stats.ratingCount > 0 ? Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 10);

    return { brand, totalPosts: metaResults.length, avgRating, productCount: Object.keys(productStats).length, topProducts };
  }
}
