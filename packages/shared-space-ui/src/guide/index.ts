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
  kpaGuideFeatureSurveyProps,
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
} from './copy/neture.js';
