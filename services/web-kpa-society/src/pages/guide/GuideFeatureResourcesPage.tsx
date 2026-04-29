/**
 * GuideFeatureResourcesPage — wrapper around shared component
 *
 * WO-O4O-GUIDE-RESOURCES-MANUAL-V1
 * WO-O4O-GUIDE-INLINE-EDIT-V1: GuideEditableSection 연결
 */
import { GuideFeatureManualPage as Shared, kpaGuideFeatureResourcesProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/features/resources';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection
    pageKey={PAGE_KEY}
    sectionKey={sectionKey}
    defaultContent={defaultContent}
  />
);

export function GuideFeatureResourcesPage() {
  return <Shared {...kpaGuideFeatureResourcesProps} renderText={renderText} />;
}
