/**
 * Guide Contents Module — Public API
 *
 * WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1
 */

export type {
  GuideSection,
  GuideContentsConfig,
  GuideContentsClient,
  GuideContentsManagerProps,
} from './types';

export type { GuideContentPayload, GuideValidationResult } from './validateGuideContent';
export { validateGuideContent } from './validateGuideContent';
export { GuideContentsManager } from './GuideContentsManager';
