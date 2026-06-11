/**
 * GuideServiceGlycoPharmPage — GlycoPharm 서비스 소개 (운영 중인 O4O 서비스)
 *
 * WO-O4O-NETURE-GUIDE-ACTIVE-SERVICE-CARDS-AND-PAGES-V1
 * GuideEditableSection 으로 본문 수정 가능(운영자).
 */
import { GuideFeatureManualPage as Shared, netureGuideServiceGlycopharmProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/services/glycopharm';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideServiceGlycoPharmPage() {
  return <Shared {...netureGuideServiceGlycopharmProps} renderText={renderText} />;
}
