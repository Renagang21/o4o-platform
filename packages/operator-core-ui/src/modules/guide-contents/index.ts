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

// WO-O4O-OPERATOR-COPY-PASTE-WRAPPER-CONSOLIDATION-V1: 4 service 통합용 wrapper.
export { GuideContentsConsolePage } from './GuideContentsConsolePage';
export type { GuideContentsConsolePageProps } from './GuideContentsConsolePage';
