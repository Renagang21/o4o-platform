/**
 * GuideIntroNeturePage — Neture 위치 페이지 (KPA 의 GuideIntroKpaPage 패턴 재사용)
 *
 * WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1
 */
import { GuideIntroKpaPage as Shared, netureGuideIntroNetureProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/intro/neture';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideIntroNeturePage() {
  return <Shared {...netureGuideIntroNetureProps} renderText={renderText} />;
}
