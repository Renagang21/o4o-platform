/**
 * GuideBusinessMarketTrialPage — 유통참여형 펀딩 운영 안내 (Business Guide)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-MARKET-TRIAL-V1
 * 일곱 번째 사업 운영 안내서. 출시 전·초기 제품 — 공급자 중심 시장 검증·초기 유통망.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessMarketTrialProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business/market-trial';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessMarketTrialPage() {
  return <Shared {...netureGuideBusinessMarketTrialProps} renderText={renderText} />;
}
