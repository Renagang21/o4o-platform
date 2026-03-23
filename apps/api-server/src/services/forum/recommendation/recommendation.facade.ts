/**
 * Forum Recommendation — Facade (Service Class)
 *
 * WO-O4O-FORUM-RECOMMENDATION-SERVICE-SPLIT-V1
 * Preserves original ForumRecommendationService class API.
 * All logic delegated to standalone functions in sibling modules.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { ForumPost } from '@o4o/forum-core/entities';
import type {
  UserContext,
  RecommendationItem,
  RecommendationWeights,
  RecencyConfig,
  RecommendationOptions,
} from './recommendation.types.js';
import { DEFAULT_WEIGHTS, DEFAULT_RECENCY_CONFIG } from './recommendation.types.js';
import {
  getPersonalizedRecommendations,
  getCosmeticsRecommendations,
  getYaksaRecommendations,
  getTrendingPosts,
  getRelatedPosts,
} from './recommendation-query.js';

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
  // Main Recommendation Methods (delegated)
  // ===========================================================================

  async getPersonalizedRecommendations(
    userContext: UserContext,
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const repository = await this.getRepository();
    return getPersonalizedRecommendations(
      repository, userContext, this.weights, this.recencyConfig, options
    );
  }

  async getCosmeticsRecommendations(
    userContext: UserContext,
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const repository = await this.getRepository();
    return getCosmeticsRecommendations(
      repository, userContext, this.recencyConfig, options
    );
  }

  async getYaksaRecommendations(
    userContext: UserContext,
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const repository = await this.getRepository();
    return getYaksaRecommendations(
      repository, userContext, this.recencyConfig, options
    );
  }

  async getTrendingPosts(
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const repository = await this.getRepository();
    return getTrendingPosts(repository, options);
  }

  async getRelatedPosts(
    postId: string,
    options: RecommendationOptions = {}
  ): Promise<RecommendationItem[]> {
    const repository = await this.getRepository();
    return getRelatedPosts(repository, postId, options);
  }

  // ===========================================================================
  // Configuration Methods
  // ===========================================================================

  setWeights(weights: Partial<RecommendationWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  getWeights(): RecommendationWeights {
    return { ...this.weights };
  }

  setRecencyConfig(config: Partial<RecencyConfig>): void {
    this.recencyConfig = { ...this.recencyConfig, ...config };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const forumRecommendationService = new ForumRecommendationService();
export { ForumRecommendationService as default };
