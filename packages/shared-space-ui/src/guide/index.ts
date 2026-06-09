/**
 * Guide barrel — WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */

// Types
export type {
  GuideTextRenderer,
  GuideNavLink,
  GuideContextItem,
  GuideCardItem,
  GuideRoleItem,
  GuideFlowRow,
  GuideLabelDetailItem,
  GuideIntroSection,
  GuideIntroPageProps,
  GuideIntroStructurePageProps,
  GuideIntroKpaPageProps,
  GuideIntroOperationPageProps,
  GuideCompareRow,
  GuideIntroConceptPageProps,
  GuideUsageSection,
  GuideUsagePageProps,
  GuideFeatureItem,
  GuideFeatureGroup,
  GuideFeaturesPageProps,
  GuideFeatureManualSection,
  GuideFeatureManualPageProps,
} from './types.js';

// Pages
export { GuideIntroPage } from './GuideIntroPage.js';
export { GuideIntroStructurePage } from './GuideIntroStructurePage.js';
export { GuideIntroKpaPage } from './GuideIntroKpaPage.js';
export { GuideIntroOperationPage } from './GuideIntroOperationPage.js';
export { GuideIntroConceptPage } from './GuideIntroConceptPage.js';
export { GuideUsagePage } from './GuideUsagePage.js';
export { GuideFeaturesPage } from './GuideFeaturesPage.js';
export { GuideFeatureManualPage } from './GuideFeatureManualPage.js';

// Copy
export {
  kpaGuideIntroProps,
  kpaGuideIntroStructureProps,
  kpaGuideIntroKpaProps,
  kpaGuideIntroOperationProps,
  kpaGuideIntroConceptProps,
  kpaGuideUsageProps,
  kpaGuideFeaturesProps,
  kpaGuideFeatureForumProps,
  kpaGuideFeatureResourcesProps,
  kpaGuideFeatureContentProps,
  kpaGuideFeatureSignageProps,
  kpaGuideFeatureStoreProps,
  kpaGuideFeatureLmsProps,
  kpaGuideFeatureQrTabletProps,
  kpaGuideFeaturePopProps,
  kpaGuideFeatureProductionMaterialsProps,
  kpaGuideFeatureBlogProps,
  kpaGuideFeatureSurveyProps,
  // WO-O4O-KPA-GUIDE-FOR-ROLE-V1: 역할별 Value Guide
  kpaGuideForStoreOwnerProps,
  kpaGuideForOperatorProps,
  kpaGuideForMemberProps,
} from './copy/kpa.js';

export {
  glycopharmGuideIntroProps,
  glycopharmGuideIntroStructureProps,
  glycopharmGuideIntroKpaProps,
  glycopharmGuideIntroOperationProps,
  glycopharmGuideIntroConceptProps,
  glycopharmGuideUsageProps,
  glycopharmGuideFeaturesProps,
  glycopharmGuideFeatureForumProps,
  glycopharmGuideFeatureResourcesProps,
  glycopharmGuideFeatureContentProps,
  glycopharmGuideFeatureSignageProps,
  glycopharmGuideFeaturePopProps,
  glycopharmGuideFeatureBlogProps,
  glycopharmGuideFeatureProductionMaterialsProps,
} from './copy/glycopharm.js';

// WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1
export {
  netureGuideIntroProps,
  netureGuideIntroStructureProps,
  netureGuideIntroNetureProps,
  netureGuideIntroOperationProps,
  netureGuideIntroConceptProps,
  netureGuideUsageProps,
  netureGuideFeaturesProps,
  netureGuideFeatureSupplierOnboardingProps,
  netureGuideFeatureProductRegistrationProps,
  netureGuideFeatureB2BContentProps,
  netureGuideFeatureEventOfferProps,
  netureGuideFeatureMarketTrialProps,
  netureGuideFeaturePartnerProgramProps,
  netureGuideFeatureForumResourcesProps,
  netureGuideFeatureCopilotDashboardProps,
  // WO-O4O-NETURE-GUIDE-BUSINESS-ACTOR-IA-PHASE1-V1
  netureGuideO4OOverviewProps,
  netureGuideForOperatorProps,
  // WO-O4O-NETURE-GUIDE-BUSINESS-ACTOR-PHASE2-V1
  netureGuideForSellerProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-PHARMACY-NETWORK-V1
  netureGuideBusinessPharmacyNetworkProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-SUPPLIER-NETWORK-V1
  netureGuideBusinessSupplierNetworkProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-OWN-PRODUCT-V1
  netureGuideBusinessOwnProductProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-CONTENT-NETWORK-V1
  netureGuideBusinessContentNetworkProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-EVENT-OFFER-V1
  netureGuideBusinessEventOfferProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-APPROVED-PRODUCT-V1
  netureGuideBusinessApprovedProductProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-SELLER-RECRUITMENT-V1
  netureGuideBusinessSellerRecruitmentProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-MARKET-TRIAL-V1
  netureGuideBusinessMarketTrialProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-OPERATOR-REVENUE-V1
  netureGuideBusinessOperatorRevenueProps,
  // WO-O4O-NETURE-BUSINESS-GUIDE-HUB-V1
  netureGuideBusinessHubProps,
} from './copy/neture.js';

// WO-O4O-CROSSSERVICE-HOME-LATEST-AND-GUIDE-ALIGNMENT-V1
export {
  kCosmeticsGuideIntroProps,
  kCosmeticsGuideIntroStructureProps,
  kCosmeticsGuideIntroKpaProps,
  kCosmeticsGuideIntroOperationProps,
  kCosmeticsGuideIntroConceptProps,
  kCosmeticsGuideUsageProps,
  kCosmeticsGuideFeaturesProps,
  kCosmeticsGuideFeatureForumProps,
  kCosmeticsGuideFeatureLmsProps,
  kCosmeticsGuideFeatureContentProps,
  kCosmeticsGuideFeatureResourcesProps,
  kCosmeticsGuideFeatureSignageProps,
  kCosmeticsGuideFeaturePopProps,
  kCosmeticsGuideFeatureBlogProps,
  kCosmeticsGuideFeatureProductionMaterialsProps,
} from './copy/k-cosmetics.js';
