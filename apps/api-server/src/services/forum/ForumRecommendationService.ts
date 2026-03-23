/**
 * ForumRecommendationService — Barrel Re-export
 *
 * WO-O4O-FORUM-RECOMMENDATION-SERVICE-SPLIT-V1
 * Original 891-line file split into recommendation/ subdirectory.
 * This file preserves the import path for all existing consumers.
 */

// Facade (class + singleton)
export {
  ForumRecommendationService,
  ForumRecommendationService as default,
  forumRecommendationService,
} from './recommendation/recommendation.facade.js';

// Types & Constants
export {
  DEFAULT_WEIGHTS,
  DEFAULT_RECENCY_CONFIG,
  type RecommendationWeights,
  type RecencyConfig,
  type UserContext,
  type RecommendationItem,
  type RecommendationOptions,
  type ReasonCode,
  type ScoreBreakdown,
} from './recommendation/recommendation.types.js';
