/**
 * GuideForSellerPage — 내 매장 활용 가이드 (판매자/매장)
 *
 * WO-O4O-NETURE-GUIDE-BUSINESS-ACTOR-PHASE2-V1
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideForSellerProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/for-seller';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideForSellerPage() {
  return <Shared {...netureGuideForSellerProps} renderText={renderText} />;
}
