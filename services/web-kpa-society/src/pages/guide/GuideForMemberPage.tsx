/**
 * GuideForMemberPage — 커뮤니티 참여자 역할별 Value Guide
 *
 * WO-O4O-KPA-GUIDE-FOR-ROLE-V1
 * 일반 약사 / 직원 / 강사 등. 정보를 나누는 것을 넘어 실제 현장 활용으로 연결되는
 * 흐름을 강조. AI 도움 / 감사 시스템은 미구현이므로 §05 준비 중에 명시.
 */
import { GuideUsagePage as Shared, kpaGuideForMemberProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/for/member';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection
    pageKey={PAGE_KEY}
    sectionKey={sectionKey}
    defaultContent={defaultContent}
  />
);

export function GuideForMemberPage() {
  return <Shared {...kpaGuideForMemberProps} renderText={renderText} />;
}
