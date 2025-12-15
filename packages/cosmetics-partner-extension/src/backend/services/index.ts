/**
 * Cosmetics Partner Extension Services
 */

export { PartnerProfileService } from './partner-profile.service.js';
export type { CreatePartnerProfileDto, UpdatePartnerProfileDto } from './partner-profile.service.js';

export { PartnerLinkService } from './partner-link.service.js';
export type { CreatePartnerLinkDto, UpdatePartnerLinkDto, LinkFilter } from './partner-link.service.js';

export { PartnerRoutineService } from './partner-routine.service.js';
export type {
  CreatePartnerRoutineDto,
  UpdatePartnerRoutineDto,
  RoutineFilter,
} from './partner-routine.service.js';

export { PartnerEarningsService } from './partner-earnings.service.js';
export type {
  CreatePartnerEarningsDto,
  UpdatePartnerEarningsDto,
  EarningsFilter,
  EarningsSummary,
} from './partner-earnings.service.js';

// Phase 6-F: Influencer Tools
export { AIRoutineService } from './ai-routine.service.js';
export type {
  GenerateRoutineDto,
  GeneratedRoutine,
  AIRoutineStep,
} from './ai-routine.service.js';

export { AIDescriptionService } from './ai-description.service.js';
export type {
  GenerateDescriptionDto,
  GeneratedDescription,
} from './ai-description.service.js';

export { PartnerStorefrontService } from './partner-storefront.service.js';
export type {
  StorefrontConfig,
  StorefrontSection,
  StorefrontData,
  CreateStorefrontDto,
  UpdateStorefrontDto,
} from './partner-storefront.service.js';

export { QRLandingService } from './qr-landing.service.js';
export type {
  GenerateQRDto,
  QRCodeResult,
  LandingPageData,
  CreateShortLinkDto,
  ShortLinkResult,
} from './qr-landing.service.js';

export { SocialShareService } from './social-share.service.js';
export type {
  GenerateShareContentDto,
  ShareContent,
  ShareAnalytics,
} from './social-share.service.js';

export { CampaignPublisherService } from './campaign-publisher.service.js';
export type {
  CampaignDto,
  Campaign,
  CampaignSchedule,
  CampaignContent,
  CampaignGoals,
  CampaignStats,
  CampaignTemplate,
} from './campaign-publisher.service.js';
