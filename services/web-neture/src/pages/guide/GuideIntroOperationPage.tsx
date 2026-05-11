/**
 * GuideIntroOperationPage — wrapper around shared component
 *
 * WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1
 */
import { GuideIntroOperationPage as Shared, netureGuideIntroOperationProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/intro/operation';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideIntroOperationPage() {
  return <Shared {...netureGuideIntroOperationProps} renderText={renderText} />;
}
