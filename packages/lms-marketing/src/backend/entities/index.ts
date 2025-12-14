/**
 * LMS-Marketing Entities
 *
 * Phase R6: ProductContent entity for product info delivery
 * Phase R7: MarketingQuizCampaign entity for quiz campaigns
 * Phase R8: SurveyCampaign entity for survey campaigns
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

export { SurveyCampaign } from './SurveyCampaign.entity.js';
export type {
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
} from './SurveyCampaign.entity.js';

export { SupplierProfile } from './SupplierProfile.entity.js';
export type {
  OnboardingStatus,
  OnboardingChecklistItem,
} from './SupplierProfile.entity.js';
