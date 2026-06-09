/**
 * GuideFeatureProductionMaterialsPage — wrapper around shared component
 *
 * WO-O4O-KPA-STORE-POP-AND-PRODUCTION-MATERIALS-GUIDE-V1
 * GuideEditableSection으로 본문 수정 가능
 */
import { GuideFeatureManualPage as Shared, kpaGuideFeatureProductionMaterialsProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/features/production-materials';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection
    pageKey={PAGE_KEY}
    sectionKey={sectionKey}
    defaultContent={defaultContent}
  />
);

export function GuideFeatureProductionMaterialsPage() {
  return <Shared {...kpaGuideFeatureProductionMaterialsProps} renderText={renderText} />;
}
