/**
 * GuideBusinessApprovedProductPage — 운영자 승인 상품 운영 안내 (Business Guide)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-APPROVED-PRODUCT-V1
 * 다섯 번째 사업 운영 안내서. 새 제품 → 운영자 검토 → 참여 매장 도입.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessApprovedProductProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business/approved-product';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessApprovedProductPage() {
  return <Shared {...netureGuideBusinessApprovedProductProps} renderText={renderText} />;
}
