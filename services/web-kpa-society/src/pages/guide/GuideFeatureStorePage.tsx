/**
 * GuideFeatureStorePage — wrapper around shared component
 *
 * WO-O4O-GUIDE-STORE-MANUAL-V1
 * GuideEditableSection으로 본문 수정 가능
 */
import { GuideFeatureManualPage as Shared, kpaGuideFeatureStoreProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/features/store';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection
    pageKey={PAGE_KEY}
    sectionKey={sectionKey}
    defaultContent={defaultContent}
  />
);

export function GuideFeatureStorePage() {
  return <Shared {...kpaGuideFeatureStoreProps} renderText={renderText} />;
}
