/**
 * Guide barrel — WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */

// Types
export type {
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
} from './copy/glycopharm.js';
