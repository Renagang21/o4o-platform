/**
 * Cosmetics Partner Extension Services
 */

export { PartnerProfileService } from './partner-profile.service';
export type { CreatePartnerProfileDto, UpdatePartnerProfileDto } from './partner-profile.service';

export { PartnerLinkService } from './partner-link.service';
export type { CreatePartnerLinkDto, UpdatePartnerLinkDto, LinkFilter } from './partner-link.service';

export { PartnerRoutineService } from './partner-routine.service';
export type {
  CreatePartnerRoutineDto,
  UpdatePartnerRoutineDto,
  RoutineFilter,
} from './partner-routine.service';

export { PartnerEarningsService } from './partner-earnings.service';
export type {
  CreatePartnerEarningsDto,
  UpdatePartnerEarningsDto,
  EarningsFilter,
  EarningsSummary,
} from './partner-earnings.service';

// Phase 6-F: Influencer Tools
export { AIRoutineService } from './ai-routine.service';
export type {
  GenerateRoutineDto,
  GeneratedRoutine,
  AIRoutineStep,
} from './ai-routine.service';

export { AIDescriptionService } from './ai-description.service';
export type {
  GenerateDescriptionDto,
  GeneratedDescription,
} from './ai-description.service';

export { PartnerStorefrontService } from './partner-storefront.service';
export type {
  StorefrontConfig,
  StorefrontSection,
  StorefrontData,
  CreateStorefrontDto,
  UpdateStorefrontDto,
} from './partner-storefront.service';

export { QRLandingService } from './qr-landing.service';
export type {
  GenerateQRDto,
  QRCodeResult,
  LandingPageData,
  CreateShortLinkDto,
  ShortLinkResult,
} from './qr-landing.service';

export { SocialShareService } from './social-share.service';
export type {
  GenerateShareContentDto,
  ShareContent,
  ShareAnalytics,
} from './social-share.service';

export { CampaignPublisherService } from './campaign-publisher.service';
export type {
  CampaignDto,
  Campaign,
  CampaignSchedule,
  CampaignContent,
  CampaignGoals,
  CampaignStats,
  CampaignTemplate,
} from './campaign-publisher.service';
