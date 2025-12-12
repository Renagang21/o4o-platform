/**
 * Forum Services Index
 * Phase 13: Forum Notification System
 * Phase 16: AI Summary & Auto-Tagging
 * Phase 17: AI Recommendation Engine
 */

export {
  ForumNotificationService,
  forumNotificationService,
  type NotificationPayload,
  type NotificationResult,
  type GetNotificationsOptions,
} from './ForumNotificationService.js';

export {
  ForumAIService,
  forumAIService,
  RuleBasedProvider,
  type AIProvider,
  type AISummaryResult,
  type AITagsResult,
  type SummaryOptions,
} from './ForumAIService.js';

export {
  ForumRecommendationService,
  forumRecommendationService,
  DEFAULT_WEIGHTS,
  DEFAULT_RECENCY_CONFIG,
  type RecommendationWeights,
  type RecencyConfig,
  type UserContext,
  type RecommendationItem,
  type RecommendationOptions,
  type ReasonCode,
  type ScoreBreakdown,
} from './ForumRecommendationService.js';
