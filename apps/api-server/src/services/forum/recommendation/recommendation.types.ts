/**
 * Forum Recommendation — Types & Configuration
 *
 * WO-O4O-FORUM-RECOMMENDATION-SERVICE-SPLIT-V1
 * Extracted from ForumRecommendationService.ts
 */

import type {
  ForumPostMetadata,
  ForumPostAIMeta,
  NetureForumMeta,
  YaksaForumMeta,
} from '../../../types/forum.types.js';

// Re-export for internal use
export type { ForumPostMetadata, ForumPostAIMeta, NetureForumMeta, YaksaForumMeta };

/** Cosmetics AI tags (domain-specific) */
export interface CosmeticsAITags {
  skinType?: string;
  concerns?: string[];
  productTypes?: string[];
}

/** Yaksa AI tags (domain-specific) */
export interface YaksaAITags {
  documentType?: 'notice' | 'admin' | 'education' | 'resource' | 'inquiry';
  isOrganizational?: boolean;
  topics?: string[];
}

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
