/**
 * GuideBusinessOperatorRevenuePage — 운영자 수익 구조 안내 (Business Guide)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-OPERATOR-REVENUE-V1
 * 수익 구조 안내서 — "어떻게 수익을 만드는가". 현재 검증된 구조 / 향후 가능한 구조 구분.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessOperatorRevenueProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business/operator-revenue';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessOperatorRevenuePage() {
  return <Shared {...netureGuideBusinessOperatorRevenueProps} renderText={renderText} />;
}
