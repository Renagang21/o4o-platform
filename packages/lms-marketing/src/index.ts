/**
 * LMS-Marketing Extension
 *
 * Marketing LMS Extension for O4O Platform
 * - Product info delivery to sellers/consumers
 * - Marketing quiz/survey campaigns
 * - Engagement capture and analytics
 * - Supplier engagement dashboard
 *
 * Phase R9: Engagement Dashboard
 */

// Manifest
export { lmsMarketingManifest, manifest } from './manifest.js';

// Backend
export {
  routes,
  createRoutes,
  createServices,
  createHooks,
  entities,
} from './backend/index.js';

// Re-export entities for direct import
export { ProductContent, MarketingQuizCampaign, SurveyCampaign } from './backend/entities/index.js';

// Re-export types
export type {
  TargetAudience,
  ProductContentTargeting,
  QuizTargetAudience,
  QuizQuestionType,
  QuizQuestion,
  QuizOption,
  QuizCampaignTargeting,
  RewardType,
  QuizReward,
  CampaignStatus,
  SurveyTargetAudience,
  SurveyCampaignStatus,
  SurveyCampaignTargeting,
  SurveyRewardType,
  SurveyReward,
  SurveyQuestionType,
  SurveyQuestionOption,
  SurveyQuestion,
  SurveyAnswer,
  SurveyCampaignResponse,
} from './backend/entities/index.js';

// Lifecycle
export { onInstall } from './lifecycle/install.js';
export { onActivate } from './lifecycle/activate.js';
export { onDeactivate } from './lifecycle/deactivate.js';
export { onUninstall } from './lifecycle/uninstall.js';
