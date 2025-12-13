/**
 * ForumRecommendationService
 * Phase 17: AI-powered Personalized Recommendations
 *
 * Combines:
 * - Analytics data (views, engagement)
 * - AI-generated tags (Phase 16)
 * - User context (recent activity, preferences)
 * - Domain-specific strategies (cosmetics/yaksa)
 *
 * Provides explainable recommendations with reason text.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost, PostStatus } from '@o4o-apps/forum';
import type {
  ForumPostMetadata,
  ForumPostAIMeta,
  NetureForumMeta,
  YaksaForumMeta,
} from '@o4o-apps/forum';

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Weight configuration for recommendation scoring
 * All weights should sum to approximately 1.0 for normalization
 */
export interface RecommendationWeights {
  /** Weight for analytics score (views, likes, comments) */
  analytics: number;
  /** Weight for AI tag similarity */
  aiTagSimilarity: number;
  /** Weight for recency boost */
  recency: number;
  /** Weight for domain-specific match */
  domainMatch: number;
  /** Weight for organizational relevance */
  organizationMatch: number;
}

/**
 * Default weights configuration
 */
export const DEFAULT_WEIGHTS: RecommendationWeights = {
  analytics: 0.25,
  aiTagSimilarity: 0.30,
  recency: 0.15,
  domainMatch: 0.20,
  organizationMatch: 0.10,
};

/**
 * Recency decay configuration
 */
export interface RecencyConfig {
  /** Days for full recency score */
  fullScoreDays: number;
  /** Days after which score decays to half */
  halfLifeDays: number;
  /** Minimum recency score */
  minScore: number;
}

export const DEFAULT_RECENCY_CONFIG: RecencyConfig = {
  fullScoreDays: 7,
  halfLifeDays: 30,
  minScore: 0.1,
};

// =============================================================================
// User Context Types
// =============================================================================

/**
 * User context for personalized recommendations
 */
export interface UserContext {
  /** User ID */
  userId?: string;
  /** User role (admin, manager, member, pharmacist, etc.) */
  role?: string;
  /** Organization ID */
  organizationId?: string;
  /** Recently viewed post IDs (most recent first) */
  recentlyViewedPosts?: string[];
  /** User's preferred tags/topics */
  preferredTags?: string[];
  /** User's skin type (cosmetics domain) */
  skinType?: string;
  /** User's skin concerns (cosmetics domain) */
  concerns?: string[];
  /** Is user a pharmacist (yaksa domain) */
  isPharmacist?: boolean;
  /** Recent search queries */
  recentSearches?: string[];
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Single recommendation result
 */
export interface RecommendationItem {
  /** Post ID */
  postId: string;
  /** Final recommendation score (0-1) */
  score: number;
  /** Human-readable reason for recommendation */
  reason: string;
  /** Detailed reason code for analytics */
  reasonCode: ReasonCode;
  /** Score breakdown for debugging/admin */
  scoreBreakdown?: ScoreBreakdown;
}

/**
 * Reason codes for recommendation
 */
export type ReasonCode =
  | 'similar_tags'
  | 'similar_skin_type'
  | 'similar_concerns'
  | 'same_organization'
  | 'trending'
  | 'recent_popular'
  | 'related_search'
  | 'similar_document_type'
  | 'recommended_for_role'
  | 'personalized';

/**
 * Detailed score breakdown
 */
export interface ScoreBreakdown {
  analyticsScore: number;
  aiTagScore: number;
  recencyScore: number;
  domainScore: number;
  organizationScore: number;
}

/**
 * Recommendation query options
 */
export interface RecommendationOptions {
  /** Maximum number of recommendations */
  limit?: number;
  /** Recommendation scope */
  scope?: 'personal' | 'trending' | 'recent' | 'related';
  /** Post ID for related recommendations */
  relatedToPostId?: string;
  /** Category filter */
  categoryId?: string;
  /** Exclude already viewed posts */
  excludeViewed?: boolean;
  /** Include score breakdown in results */
  includeBreakdown?: boolean;
}

// =============================================================================
// ForumRecommendationService
// =============================================================================

export class ForumRecommendationService {
  private postRepository: Repository<ForumPost> | null = null;
  private weights: RecommendationWeights;
  private recencyConfig: RecencyConfig;

  constructor(
    weights: RecommendationWeights = DEFAULT_WEIGHTS,
    recencyConfig: RecencyConfig = DEFAULT_RECENCY_CONFIG
  ) {
    this.weights = weights;
    this.recencyConfig = recencyConfig;
  }

  private async getRepository(): Promise<Repository<ForumPost>> {
    if (!this.postRepository) {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      this.postRepository = AppDataSource.getRepository(ForumPost);
    }
    return this.postRepository;
  }

  // ===========================================================================
  // Main Recommendation Methods
  // ===========================================================================

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userContext: UserContext,
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const { limit = 10, excludeViewed = true, includeBreakdown = false, categoryId } = options;
    const repository = await this.getRepository();

    // Build base query
    const queryBuilder = repository.createQueryBuilder('post')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .orderBy('post.createdAt', 'DESC')
      .limit(limit * 3); // Fetch more to filter and sort

    // Category filter
    if (categoryId) {
      queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId });
    }

    // Organization filter for exclusive content
    if (userContext.organizationId) {
      queryBuilder.andWhere(
        '(post.isOrganizationExclusive = false OR post.organizationId = :orgId)',
        { orgId: userContext.organizationId }
      );
    } else {
      queryBuilder.andWhere('post.isOrganizationExclusive = false');
    }

    const posts = await queryBuilder.getMany();

    // Score and rank posts
    const scoredPosts = posts.map(post => this.scorePost(post, userContext, includeBreakdown));

    // Filter out viewed posts if requested
    let filtered = scoredPosts;
    if (excludeViewed && userContext.recentlyViewedPosts?.length) {
      filtered = scoredPosts.filter(
        item => !userContext.recentlyViewedPosts!.includes(item.postId)
      );
    }

    // Sort by score and limit
    return filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get cosmetics-domain recommendations
   */
  async getCosmeticsRecommendations(
    userContext: UserContext,
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const { limit = 10, includeBreakdown = false } = options;
    const repository = await this.getRepository();

    // Fetch posts with cosmetics metadata
    const posts = await repository.createQueryBuilder('post')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .andWhere('post.isOrganizationExclusive = false')
      .andWhere("post.metadata->>'extensions'->>'neture' IS NOT NULL OR post.metadata->>'neture' IS NOT NULL")
      .orderBy('post.createdAt', 'DESC')
      .limit(limit * 3)
      .getMany();

    // Score with cosmetics-specific strategy
    const scoredPosts = posts.map(post =>
      this.scoreCosmeticsPost(post, userContext, includeBreakdown)
    );

    return scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get yaksa-domain recommendations
   */
  async getYaksaRecommendations(
    userContext: UserContext,
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const { limit = 10, includeBreakdown = false } = options;
    const repository = await this.getRepository();

    // Build query for yaksa content
    const queryBuilder = repository.createQueryBuilder('post')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .orderBy('post.createdAt', 'DESC')
      .limit(limit * 3);

    // Filter by organization if user has one
    if (userContext.organizationId) {
      queryBuilder.andWhere(
        '(post.organizationId = :orgId OR post.isOrganizationExclusive = false)',
        { orgId: userContext.organizationId }
      );
    } else {
      queryBuilder.andWhere('post.isOrganizationExclusive = false');
    }

    const posts = await queryBuilder.getMany();

    // Score with yaksa-specific strategy
    const scoredPosts = posts.map(post =>
      this.scoreYaksaPost(post, userContext, includeBreakdown)
    );

    return scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get trending posts (high recent engagement)
   */
  async getTrendingPosts(
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const { limit = 10, categoryId } = options;
    const repository = await this.getRepository();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const queryBuilder = repository.createQueryBuilder('post')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .andWhere('post.isOrganizationExclusive = false')
      .andWhere('post.createdAt > :since', { since: sevenDaysAgo })
      .orderBy('(post.viewCount + post.likeCount * 3 + post.commentCount * 5)', 'DESC')
      .limit(limit);

    if (categoryId) {
      queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId });
    }

    const posts = await queryBuilder.getMany();

    return posts.map(post => ({
      postId: post.id,
      score: this.calculateTrendingScore(post),
      reason: '최근 인기 급상승 글입니다.',
      reasonCode: 'trending' as ReasonCode,
    }));
  }

  /**
   * Get related posts for a specific post
   */
  async getRelatedPosts(
    postId: string,
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const { limit = 5 } = options;
    const repository = await this.getRepository();

    // Get the source post
    const sourcePost = await repository.findOne({ where: { id: postId } });
    if (!sourcePost) {
      return [];
    }

    // Find posts with similar tags or in same category
    const queryBuilder = repository.createQueryBuilder('post')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .andWhere('post.id != :postId', { postId })
      .andWhere('post.isOrganizationExclusive = false')
      .orderBy('post.createdAt', 'DESC')
      .limit(limit * 3);

    // Prefer same category
    if (sourcePost.categoryId) {
      queryBuilder.andWhere('post.categoryId = :categoryId', {
        categoryId: sourcePost.categoryId,
      });
    }

    const posts = await queryBuilder.getMany();

    // Score by tag similarity
    const sourceTags = this.extractAllTags(sourcePost);
    const scoredPosts = posts.map(post => {
      const postTags = this.extractAllTags(post);
      const similarity = this.calculateTagSimilarity(sourceTags, postTags);

      return {
        postId: post.id,
        score: similarity,
        reason: '현재 글과 관련된 주제입니다.',
        reasonCode: 'similar_tags' as ReasonCode,
      };
    });

    return scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ===========================================================================
  // Scoring Methods
  // ===========================================================================

  /**
   * Score a post for general recommendations
   */
  private scorePost(
    post: ForumPost,
    userContext: UserContext,
    includeBreakdown: boolean
  ): RecommendationItem {
    const analyticsScore = this.calculateAnalyticsScore(post);
    const aiTagScore = this.calculateAITagScore(post, userContext);
    const recencyScore = this.calculateRecencyScore(post);
    const domainScore = this.calculateDomainScore(post, userContext);
    const organizationScore = this.calculateOrganizationScore(post, userContext);

    const finalScore =
      analyticsScore * this.weights.analytics +
      aiTagScore * this.weights.aiTagSimilarity +
      recencyScore * this.weights.recency +
      domainScore * this.weights.domainMatch +
      organizationScore * this.weights.organizationMatch;

    const { reason, reasonCode } = this.generateReason(
      post,
      userContext,
      { analyticsScore, aiTagScore, recencyScore, domainScore, organizationScore }
    );

    const result: RecommendationItem = {
      postId: post.id,
      score: Math.min(1, Math.max(0, finalScore)),
      reason,
      reasonCode,
    };

    if (includeBreakdown) {
      result.scoreBreakdown = {
        analyticsScore,
        aiTagScore,
        recencyScore,
        domainScore,
        organizationScore,
      };
    }

    return result;
  }

  /**
   * Score a post for cosmetics recommendations
   */
  private scoreCosmeticsPost(
    post: ForumPost,
    userContext: UserContext,
    includeBreakdown: boolean
  ): RecommendationItem {
    const metadata = post.metadata;
    const cosmeticsData = metadata?.extensions?.neture || metadata?.neture;
    const aiTags = metadata?.ai?.tags?.cosmeticsTags;

    let domainScore = 0;
    let reasonCode: ReasonCode = 'personalized';
    let reason = '회원님을 위한 추천 글입니다.';

    // 1. Skin type match (highest priority)
    if (userContext.skinType) {
      const postSkinType = cosmeticsData?.skinType || aiTags?.skinType;
      if (postSkinType === userContext.skinType) {
        domainScore += 0.4;
        reason = `회원님의 피부타입(${this.translateSkinType(userContext.skinType)})과 유사한 글입니다.`;
        reasonCode = 'similar_skin_type';
      }
    }

    // 2. Concerns match
    if (userContext.concerns?.length) {
      const postConcerns = cosmeticsData?.concerns || aiTags?.concerns || [];
      const matchingConcerns = userContext.concerns.filter(c => postConcerns.includes(c));
      if (matchingConcerns.length > 0) {
        domainScore += 0.3 * (matchingConcerns.length / userContext.concerns.length);
        if (reasonCode !== 'similar_skin_type') {
          reason = `회원님의 고민(${matchingConcerns.join(', ')})과 관련된 글입니다.`;
          reasonCode = 'similar_concerns';
        } else {
          reason = `회원님의 피부타입(${this.translateSkinType(userContext.skinType!)})과 고민(${matchingConcerns.join(', ')})에 유사한 글입니다.`;
        }
      }
    }

    // 3. AI tag similarity
    const aiTagScore = this.calculateAITagScore(post, userContext);
    domainScore += aiTagScore * 0.2;

    // 4. Popularity
    const analyticsScore = this.calculateAnalyticsScore(post);
    const recencyScore = this.calculateRecencyScore(post);

    const finalScore =
      domainScore * 0.5 +
      analyticsScore * 0.25 +
      recencyScore * 0.15 +
      aiTagScore * 0.10;

    const result: RecommendationItem = {
      postId: post.id,
      score: Math.min(1, Math.max(0, finalScore)),
      reason,
      reasonCode,
    };

    if (includeBreakdown) {
      result.scoreBreakdown = {
        analyticsScore,
        aiTagScore,
        recencyScore,
        domainScore,
        organizationScore: 0,
      };
    }

    return result;
  }

  /**
   * Score a post for yaksa recommendations
   */
  private scoreYaksaPost(
    post: ForumPost,
    userContext: UserContext,
    includeBreakdown: boolean
  ): RecommendationItem {
    const metadata = post.metadata;
    const yaksaData = metadata?.extensions?.yaksa || metadata?.yaksa;
    const aiTags = metadata?.ai?.tags?.yaksaTags;

    let domainScore = 0;
    let reasonCode: ReasonCode = 'personalized';
    let reason = '회원님을 위한 추천 글입니다.';

    // 1. Same organization (highest priority for yaksa)
    if (userContext.organizationId && post.organizationId === userContext.organizationId) {
      domainScore += 0.5;
      reason = '같은 분회에서 작성된 글입니다.';
      reasonCode = 'same_organization';
    }

    // 2. Document type match based on role
    const documentType = yaksaData?.documentType || aiTags?.documentType;
    if (documentType) {
      if (userContext.role === 'admin' || userContext.role === 'manager') {
        // Admins prefer admin/notice documents
        if (['notice', 'admin'].includes(documentType)) {
          domainScore += 0.3;
          if (reasonCode !== 'same_organization') {
            reason = `관리자용 ${this.translateDocumentType(documentType)} 문서입니다.`;
            reasonCode = 'recommended_for_role';
          }
        }
      } else if (userContext.isPharmacist) {
        // Pharmacists prefer education/resource documents
        if (['education', 'resource'].includes(documentType)) {
          domainScore += 0.3;
          if (reasonCode !== 'same_organization') {
            reason = `약사님을 위한 ${this.translateDocumentType(documentType)} 자료입니다.`;
            reasonCode = 'similar_document_type';
          }
        }
      }
    }

    // 3. Announcement priority
    if (yaksaData?.isAnnouncement || post.type === 'announcement') {
      domainScore += 0.2;
    }

    // 4. Organization-verified content
    if (aiTags?.isOrganizational) {
      domainScore += 0.1;
    }

    // 5. Recent updates and engagement
    const analyticsScore = this.calculateAnalyticsScore(post);
    const recencyScore = this.calculateRecencyScore(post);
    const aiTagScore = this.calculateAITagScore(post, userContext);

    const finalScore =
      domainScore * 0.5 +
      analyticsScore * 0.20 +
      recencyScore * 0.20 +
      aiTagScore * 0.10;

    const result: RecommendationItem = {
      postId: post.id,
      score: Math.min(1, Math.max(0, finalScore)),
      reason,
      reasonCode,
    };

    if (includeBreakdown) {
      result.scoreBreakdown = {
        analyticsScore,
        aiTagScore,
        recencyScore,
        domainScore,
        organizationScore: userContext.organizationId === post.organizationId ? 1 : 0,
      };
    }

    return result;
  }

  // ===========================================================================
  // Score Calculation Helpers
  // ===========================================================================

  /**
   * Calculate analytics-based score
   */
  private calculateAnalyticsScore(post: ForumPost): number {
    // Weighted engagement score
    const viewScore = Math.log10(Math.max(1, post.viewCount)) / 4; // Log scale, max ~4 for 10000 views
    const likeScore = Math.log10(Math.max(1, post.likeCount * 10 + 1)) / 3;
    const commentScore = Math.log10(Math.max(1, post.commentCount * 5 + 1)) / 3;

    // Additional analytics from metadata
    const analytics = post.metadata?.analytics;
    let additionalScore = 0;
    if (analytics) {
      if (analytics.bookmarkCount) {
        additionalScore += Math.min(0.2, analytics.bookmarkCount / 50);
      }
      if (analytics.shareCount) {
        additionalScore += Math.min(0.1, analytics.shareCount / 20);
      }
    }

    return Math.min(1, (viewScore + likeScore + commentScore + additionalScore) / 2);
  }

  /**
   * Calculate AI tag similarity score
   */
  private calculateAITagScore(post: ForumPost, userContext: UserContext): number {
    const aiTags = post.metadata?.ai?.tags?.suggestedTags || [];
    const postTags = [...(post.tags || []), ...aiTags];

    if (!postTags.length || !userContext.preferredTags?.length) {
      return 0;
    }

    const matchCount = userContext.preferredTags.filter(tag =>
      postTags.some(pt => pt.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(pt.toLowerCase()))
    ).length;

    return Math.min(1, matchCount / Math.min(3, userContext.preferredTags.length));
  }

  /**
   * Calculate recency score with decay
   */
  private calculateRecencyScore(post: ForumPost): number {
    const now = new Date();
    const postDate = post.publishedAt || post.createdAt;
    const daysDiff = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff <= this.recencyConfig.fullScoreDays) {
      return 1;
    }

    // Exponential decay
    const decayFactor = Math.pow(0.5, (daysDiff - this.recencyConfig.fullScoreDays) / this.recencyConfig.halfLifeDays);
    return Math.max(this.recencyConfig.minScore, decayFactor);
  }

  /**
   * Calculate domain-specific score
   */
  private calculateDomainScore(post: ForumPost, userContext: UserContext): number {
    const metadata = post.metadata;
    if (!metadata) return 0;

    // Check cosmetics domain
    const cosmeticsData = metadata.extensions?.neture || metadata.neture;
    if (cosmeticsData && userContext.skinType) {
      if (cosmeticsData.skinType === userContext.skinType) return 0.8;
      if (cosmeticsData.concerns?.some(c => userContext.concerns?.includes(c))) return 0.6;
    }

    // Check yaksa domain
    const yaksaData = metadata.extensions?.yaksa || metadata.yaksa;
    if (yaksaData && userContext.isPharmacist) {
      if (yaksaData.pharmacistVerified) return 0.7;
      if (yaksaData.professionalOnly) return 0.5;
    }

    return 0;
  }

  /**
   * Calculate organization match score
   */
  private calculateOrganizationScore(post: ForumPost, userContext: UserContext): number {
    if (!userContext.organizationId) return 0;
    if (post.organizationId === userContext.organizationId) return 1;
    return 0;
  }

  /**
   * Calculate trending score
   */
  private calculateTrendingScore(post: ForumPost): number {
    const now = new Date();
    const postDate = post.createdAt;
    const hoursDiff = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

    // Engagement per hour (decay over time)
    const engagement = post.viewCount + post.likeCount * 3 + post.commentCount * 5;
    const engagementRate = engagement / Math.max(1, hoursDiff);

    return Math.min(1, engagementRate / 10);
  }

  /**
   * Calculate tag similarity between two tag sets
   */
  private calculateTagSimilarity(tags1: string[], tags2: string[]): number {
    if (!tags1.length || !tags2.length) return 0;

    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));

    const intersection = [...set1].filter(t => set2.has(t)).length;
    const union = new Set([...set1, ...set2]).size;

    return intersection / union; // Jaccard similarity
  }

  /**
   * Extract all tags from a post (manual + AI)
   */
  private extractAllTags(post: ForumPost): string[] {
    const manualTags = post.tags || [];
    const aiTags = post.metadata?.ai?.tags?.suggestedTags || [];
    return [...new Set([...manualTags, ...aiTags])];
  }

  // ===========================================================================
  // Reason Generation
  // ===========================================================================

  /**
   * Generate human-readable reason for recommendation
   */
  private generateReason(
    post: ForumPost,
    userContext: UserContext,
    scores: ScoreBreakdown
  ): { reason: string; reasonCode: ReasonCode } {
    // Find the dominant factor
    const factors = [
      { name: 'organization', score: scores.organizationScore, threshold: 0.5 },
      { name: 'domain', score: scores.domainScore, threshold: 0.4 },
      { name: 'aiTag', score: scores.aiTagScore, threshold: 0.3 },
      { name: 'analytics', score: scores.analyticsScore, threshold: 0.5 },
      { name: 'recency', score: scores.recencyScore, threshold: 0.8 },
    ];

    const dominant = factors
      .filter(f => f.score >= f.threshold)
      .sort((a, b) => b.score - a.score)[0];

    switch (dominant?.name) {
      case 'organization':
        return {
          reason: '같은 조직에서 자주 조회된 글입니다.',
          reasonCode: 'same_organization',
        };
      case 'domain':
        if (userContext.skinType) {
          return {
            reason: `회원님의 피부타입과 관심사에 맞는 글입니다.`,
            reasonCode: 'similar_skin_type',
          };
        }
        if (userContext.isPharmacist) {
          return {
            reason: '약사님을 위한 전문 콘텐츠입니다.',
            reasonCode: 'recommended_for_role',
          };
        }
        return {
          reason: '회원님의 관심 분야와 관련된 글입니다.',
          reasonCode: 'personalized',
        };
      case 'aiTag':
        return {
          reason: '회원님이 관심있는 주제와 유사한 글입니다.',
          reasonCode: 'similar_tags',
        };
      case 'analytics':
        return {
          reason: '많은 사용자들에게 인기있는 글입니다.',
          reasonCode: 'trending',
        };
      case 'recency':
        return {
          reason: '최근 작성된 인기 글입니다.',
          reasonCode: 'recent_popular',
        };
      default:
        return {
          reason: '회원님을 위한 추천 글입니다.',
          reasonCode: 'personalized',
        };
    }
  }

  // ===========================================================================
  // Translation Helpers
  // ===========================================================================

  private translateSkinType(type: string): string {
    const translations: Record<string, string> = {
      dry: '건성',
      oily: '지성',
      combination: '복합성',
      sensitive: '민감성',
      normal: '중성',
    };
    return translations[type] || type;
  }

  private translateDocumentType(type: string): string {
    const translations: Record<string, string> = {
      notice: '공지',
      admin: '행정',
      education: '교육',
      resource: '자료',
      inquiry: '민원',
    };
    return translations[type] || type;
  }

  // ===========================================================================
  // Configuration Methods
  // ===========================================================================

  /**
   * Update weight configuration
   */
  setWeights(weights: Partial<RecommendationWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Get current weight configuration
   */
  getWeights(): RecommendationWeights {
    return { ...this.weights };
  }

  /**
   * Update recency configuration
   */
  setRecencyConfig(config: Partial<RecencyConfig>): void {
    this.recencyConfig = { ...this.recencyConfig, ...config };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const forumRecommendationService = new ForumRecommendationService();
export { ForumRecommendationService as default };
