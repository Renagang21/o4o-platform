/**
 * Forum Recommendation — Query & Data Fetching
 *
 * WO-O4O-FORUM-RECOMMENDATION-SERVICE-SPLIT-V1
 * Extracted from ForumRecommendationService.ts
 */

import { Repository } from 'typeorm';
import { ForumPost, PostStatus } from '@o4o/forum-core/entities';
import type {
  UserContext,
  RecommendationItem,
  RecommendationOptions,
  RecommendationWeights,
  RecencyConfig,
  ReasonCode,
} from './recommendation.types.js';
import {
  scorePost,
  scoreCosmeticsPost,
  scoreYaksaPost,
  calculateTrendingScore,
  calculateTagSimilarity,
  extractAllTags,
} from './recommendation-score.js';

// =============================================================================
// Query Methods
// =============================================================================

/**
 * Get personalized recommendations for a user
 */
export async function getPersonalizedRecommendations(
  repository: Repository<ForumPost>,
  userContext: UserContext,
  weights: RecommendationWeights,
  recencyConfig: RecencyConfig,
  options: RecommendationOptions = {}
): Promise<RecommendationItem[]> {
  const { limit = 10, excludeViewed = true, includeBreakdown = false, categoryId } = options;

  const queryBuilder = repository.createQueryBuilder('post')
    .where('post.status = :status', { status: PostStatus.PUBLISHED })
    .orderBy('post.createdAt', 'DESC')
    .limit(limit * 3);

  if (categoryId) {
    queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId });
  }

  if (userContext.organizationId) {
    queryBuilder.andWhere(
      '(post.isOrganizationExclusive = false OR post.organizationId = :orgId)',
      { orgId: userContext.organizationId }
    );
  } else {
    queryBuilder.andWhere('post.isOrganizationExclusive = false');
  }

  const posts = await queryBuilder.getMany();

  const scoredPosts = posts.map(post =>
    scorePost(post, userContext, weights, recencyConfig, includeBreakdown)
  );

  let filtered = scoredPosts;
  if (excludeViewed && userContext.recentlyViewedPosts?.length) {
    filtered = scoredPosts.filter(
      item => !userContext.recentlyViewedPosts!.includes(item.postId)
    );
  }

  return filtered
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get cosmetics-domain recommendations
 */
export async function getCosmeticsRecommendations(
  repository: Repository<ForumPost>,
  userContext: UserContext,
  recencyConfig: RecencyConfig,
  options: RecommendationOptions = {}
): Promise<RecommendationItem[]> {
  const { limit = 10, includeBreakdown = false } = options;

  const posts = await repository.createQueryBuilder('post')
    .where('post.status = :status', { status: PostStatus.PUBLISHED })
    .andWhere('post.isOrganizationExclusive = false')
    .andWhere("post.metadata->>'extensions'->>'neture' IS NOT NULL OR post.metadata->>'neture' IS NOT NULL")
    .orderBy('post.createdAt', 'DESC')
    .limit(limit * 3)
    .getMany();

  const scoredPosts = posts.map(post =>
    scoreCosmeticsPost(post, userContext, recencyConfig, includeBreakdown)
  );

  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get yaksa-domain recommendations
 */
export async function getYaksaRecommendations(
  repository: Repository<ForumPost>,
  userContext: UserContext,
  recencyConfig: RecencyConfig,
  options: RecommendationOptions = {}
): Promise<RecommendationItem[]> {
  const { limit = 10, includeBreakdown = false } = options;

  const queryBuilder = repository.createQueryBuilder('post')
    .where('post.status = :status', { status: PostStatus.PUBLISHED })
    .orderBy('post.createdAt', 'DESC')
    .limit(limit * 3);

  if (userContext.organizationId) {
    queryBuilder.andWhere(
      '(post.organizationId = :orgId OR post.isOrganizationExclusive = false)',
      { orgId: userContext.organizationId }
    );
  } else {
    queryBuilder.andWhere('post.isOrganizationExclusive = false');
  }

  const posts = await queryBuilder.getMany();

  const scoredPosts = posts.map(post =>
    scoreYaksaPost(post, userContext, recencyConfig, includeBreakdown)
  );

  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get trending posts (high recent engagement)
 */
export async function getTrendingPosts(
  repository: Repository<ForumPost>,
  options: RecommendationOptions = {}
): Promise<RecommendationItem[]> {
  const { limit = 10, categoryId } = options;

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
    score: calculateTrendingScore(post),
    reason: '최근 인기 급상승 글입니다.',
    reasonCode: 'trending' as ReasonCode,
  }));
}

/**
 * Get related posts for a specific post
 */
export async function getRelatedPosts(
  repository: Repository<ForumPost>,
  postId: string,
  options: RecommendationOptions = {}
): Promise<RecommendationItem[]> {
  const { limit = 5 } = options;

  const sourcePost = await repository.findOne({ where: { id: postId } });
  if (!sourcePost) {
    return [];
  }

  const queryBuilder = repository.createQueryBuilder('post')
    .where('post.status = :status', { status: PostStatus.PUBLISHED })
    .andWhere('post.id != :postId', { postId })
    .andWhere('post.isOrganizationExclusive = false')
    .orderBy('post.createdAt', 'DESC')
    .limit(limit * 3);

  if (sourcePost.categoryId) {
    queryBuilder.andWhere('post.categoryId = :categoryId', {
      categoryId: sourcePost.categoryId,
    });
  }

  const posts = await queryBuilder.getMany();

  const sourceTags = extractAllTags(sourcePost);
  const scoredPosts = posts.map(post => {
    const postTags = extractAllTags(post);
    const similarity = calculateTagSimilarity(sourceTags, postTags);

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
