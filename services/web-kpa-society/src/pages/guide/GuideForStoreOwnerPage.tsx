/**
 * GuideForStoreOwnerPage — 매장 경영자 역할별 Value Guide
 *
 * WO-O4O-KPA-GUIDE-FOR-ROLE-V1
 * "기능 → 어떻게 쓰는가" 가 아니라 "내 역할에서 무엇을 얻고 어떻게 활용하는가" 관점.
 * GuideUsagePage (Shared) + kpaGuideForStoreOwnerProps 재사용.
 */
import { GuideUsagePage as Shared, kpaGuideForStoreOwnerProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/for/store-owner';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection
    pageKey={PAGE_KEY}
    sectionKey={sectionKey}
    defaultContent={defaultContent}
  />
);

export function GuideForStoreOwnerPage() {
  return <Shared {...kpaGuideForStoreOwnerProps} renderText={renderText} />;
}
