/**
 * LMS-Marketing Entities
 *
 * Phase R6: ProductContent entity for product info delivery
 * Phase R7: MarketingQuizCampaign entity for quiz campaigns
 */

export { ProductContent } from './ProductContent.entity.js';
export type {
  TargetAudience,
  ProductContentTargeting,
} from './ProductContent.entity.js';

export { MarketingQuizCampaign } from './MarketingQuizCampaign.entity.js';
export type {
  QuizTargetAudience,
  QuizQuestionType,
  QuizQuestion,
  QuizOption,
  QuizCampaignTargeting,
  RewardType,
  QuizReward,
  CampaignStatus,
} from './MarketingQuizCampaign.entity.js';
