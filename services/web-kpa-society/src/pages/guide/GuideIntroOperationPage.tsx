/**
 * GuideIntroOperationPage — wrapper around shared component
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 * WO-O4O-GUIDE-INLINE-EDIT-V1: GuideEditableSection 연결
 */
import { GuideIntroOperationPage as Shared, kpaGuideIntroOperationProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/intro/operation';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideIntroOperationPage() {
  return <Shared {...kpaGuideIntroOperationProps} renderText={renderText} />;
}
