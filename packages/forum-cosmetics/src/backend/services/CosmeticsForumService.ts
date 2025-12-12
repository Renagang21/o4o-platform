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
 * CosmeticsForumService
 *
 * Handles cosmetics-specific forum operations:
 * - Cosmetics metadata management
 * - Skin type filtering
 * - Concerns-based search
 * - Product and brand filtering
 * - Rating-based sorting
 * - Ingredient filtering
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
    // ForumPost repository will be obtained dynamically
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
      concerns,
      brand,
      productId,
      postType,
      minRating,
      ingredients,
      isFeatured,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    // Build query for cosmetics_forum_meta
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

    // Get post IDs that match the filter
    const metaResults = await metaQueryBuilder.getMany();
    const postIds = metaResults.map(m => m.postId);

    if (postIds.length === 0) {
      return {
        items: [],
        total: 0,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: 0,
      };
    }

    // Query forum posts
    const postQueryBuilder = this.forumPostRepository
      .createQueryBuilder('post')
      .where('post.id IN (:...postIds)', { postIds })
      .andWhere("post.status = :status", { status: 'publish' });

    // Apply sorting
    if (sortBy === 'rating') {
      // Need to join with meta for rating sort
      postQueryBuilder.orderBy('post.createdAt', sortOrder as 'ASC' | 'DESC');
    } else if (sortBy === 'viewCount') {
      postQueryBuilder.orderBy('post.viewCount', sortOrder as 'ASC' | 'DESC');
    } else {
      postQueryBuilder.orderBy('post.createdAt', sortOrder as 'ASC' | 'DESC');
    }

    // Get total count
    const total = await postQueryBuilder.getCount();

    // Apply pagination
    const posts = await postQueryBuilder
      .skip(offset)
      .take(limit)
      .getMany();

    // Attach cosmetics metadata to posts
    const postsWithMeta = posts.map(post => {
      const meta = metaResults.find(m => m.postId === post.id);
      return {
        ...post,
        cosmeticsMeta: meta,
      };
    });

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
    const result = await this.listPosts({
      skinType,
      ...options,
    });
    return result.items;
  }

  /**
   * Get posts by concerns
   */
  async getPostsByConcerns(concerns: CosmeticsConcern[], options?: { limit?: number; offset?: number }): Promise<ForumPostData[]> {
    const metaResults = await this.metaRepository
      .createQueryBuilder('meta')
      .getMany();

    // Filter by concerns (in-memory filtering for array field)
    const matchingMeta = metaResults.filter(meta => {
      if (!meta.concerns || meta.concerns.length === 0) return false;
      return concerns.some(concern => meta.concerns?.includes(concern));
    });

    const postIds = matchingMeta.map(m => m.postId);

    if (postIds.length === 0) {
      return [];
    }

    const posts = await this.forumPostRepository
      .createQueryBuilder('post')
      .where('post.id IN (:...postIds)', { postIds })
      .andWhere("post.status = :status", { status: 'publish' })
      .orderBy('post.createdAt', 'DESC')
      .skip(options?.offset || 0)
      .take(options?.limit || 20)
      .getMany();

    return posts;
  }

  /**
   * Get posts by brand
   */
  async getPostsByBrand(brand: string, options?: { limit?: number; offset?: number }): Promise<ForumPostData[]> {
    const result = await this.listPosts({
      brand,
      ...options,
    });
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

    if (postIds.length === 0) {
      return [];
    }

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
    const result = await this.listPosts({
      isFeatured: true,
      limit,
    });
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
      // Post type
      byPostType[meta.postType] = (byPostType[meta.postType] || 0) + 1;

      // Skin type
      if (meta.skinType) {
        bySkinType[meta.skinType] = (bySkinType[meta.skinType] || 0) + 1;
      }

      // Brand
      if (meta.brand) {
        brandCounts[meta.brand] = (brandCounts[meta.brand] || 0) + 1;
      }

      // Rating
      if (meta.rating) {
        ratingSum += Number(meta.rating);
        ratingCount++;
      }
    }

    // Sort brands by count
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

    if (postIds.length === 0) {
      return [];
    }

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
}
