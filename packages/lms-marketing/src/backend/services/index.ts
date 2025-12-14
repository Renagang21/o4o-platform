/**
 * LMS-Marketing Services
 *
 * Phase R6: ProductContentService for product info delivery
 * Phase R7: MarketingQuizCampaignService for quiz campaigns
 */

// Phase R6: Product Content Service
export {
  ProductContentService,
  getProductContentService,
  initProductContentService,
} from './ProductContentService.js';
export type {
  CreateProductContentDto,
  UpdateProductContentDto,
  UserContext,
  ProductContentListOptions,
} from './ProductContentService.js';

// Phase R7: Quiz Campaign Service
export {
  MarketingQuizCampaignService,
  getMarketingQuizCampaignService,
  initMarketingQuizCampaignService,
} from './MarketingQuizCampaignService.js';
export type {
  CreateQuizCampaignDto,
  UpdateQuizCampaignDto,
  QuizUserContext,
  QuizCampaignListOptions,
  QuizAttemptResult,
} from './MarketingQuizCampaignService.js';

// Phase R8: Survey Campaign Service
export {
  SurveyCampaignService,
  getSurveyCampaignService,
  initSurveyCampaignService,
} from './SurveyCampaignService.js';
export type {
  CreateSurveyCampaignDto,
  UpdateSurveyCampaignDto,
  SubmitSurveyResponseDto,
  SurveyCampaignListOptions,
  UserCampaignFilter,
  SurveyCampaignStatistics,
} from './SurveyCampaignService.js';

// Phase R9: Analytics Service (placeholder)
// export { AnalyticsService } from './AnalyticsService.js';
