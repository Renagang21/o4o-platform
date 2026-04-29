/**
 * GuideUsagePage — wrapper around shared component
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 * WO-O4O-GUIDE-INLINE-EDIT-V1: GuideEditableSection 연결
 */
import { GuideUsagePage as Shared, kpaGuideUsageProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/usage';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection
    pageKey={PAGE_KEY}
    sectionKey={sectionKey}
    defaultContent={defaultContent}
  />
);

export function GuideUsagePage() {
  return <Shared {...kpaGuideUsageProps} renderText={renderText} />;
}
