/**
 * GuideForOperatorPage — 서비스 운영자 역할별 Value Guide
 *
 * WO-O4O-KPA-GUIDE-FOR-ROLE-V1
 * 운영자는 관리자가 아니라 매장을 지원하는 운영 사업자. 공급자는 독립 역할로 노출하지 않고
 * "운영자 협력" 내부에 포함. 미구현 Workspace 는 §05 "준비 중" 섹션에 명시.
 */
import { GuideUsagePage as Shared, kpaGuideForOperatorProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/for/operator';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection
    pageKey={PAGE_KEY}
    sectionKey={sectionKey}
    defaultContent={defaultContent}
  />
);

export function GuideForOperatorPage() {
  return <Shared {...kpaGuideForOperatorProps} renderText={renderText} />;
}
