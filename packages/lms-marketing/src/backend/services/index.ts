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

// Phase R9: Supplier Insights Service
export {
  SupplierInsightsService,
  getSupplierInsightsService,
  initSupplierInsightsService,
} from './SupplierInsightsService.js';
export type {
  CampaignTypeSummary,
  SupplierDashboardSummary,
  RecentActivityItem,
  CampaignPerformance,
  EngagementTrends,
  TrendDataPoint,
  ExportFormat,
  ExportData,
  DateRangeFilter,
} from './SupplierInsightsService.js';

// Phase R11: Supplier Onboarding Service
export {
  SupplierOnboardingService,
  getSupplierOnboardingService,
  initSupplierOnboardingService,
} from './SupplierOnboardingService.js';
export type {
  UpdateSupplierProfileDto,
  OnboardingChecklistResponse,
} from './SupplierOnboardingService.js';

// Phase R11: Campaign Automation Service
export {
  CampaignAutomationService,
  getCampaignAutomationService,
  initCampaignAutomationService,
} from './CampaignAutomationService.js';
export type {
  AutomationRuleType,
  AutomationRule,
  AutomationSettings,
  AutomationLogEntry,
  AutomationRunResult,
} from './CampaignAutomationService.js';
