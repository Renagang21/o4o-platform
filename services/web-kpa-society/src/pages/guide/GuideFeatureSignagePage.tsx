/**
 * GuideFeatureSignagePage — wrapper around shared component
 *
 * WO-O4O-GUIDE-SIGNAGE-MANUAL-V1
 * WO-O4O-GUIDE-INLINE-EDIT-V1: GuideEditableSection 연결
 */
import { GuideFeatureManualPage as Shared, kpaGuideFeatureSignageProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/features/signage';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection
    pageKey={PAGE_KEY}
    sectionKey={sectionKey}
    defaultContent={defaultContent}
  />
);

export function GuideFeatureSignagePage() {
  return <Shared {...kpaGuideFeatureSignageProps} renderText={renderText} />;
}
