/**
 * GuideBusinessEventOfferPage — 이벤트 오퍼 운영 안내 (Business Guide)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-EVENT-OFFER-V1
 * 네 번째 사업 운영 안내서. 왜 이벤트 오퍼를 운영·참여하는가 — 유통질서·특별 공급 조건.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessEventOfferProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business/event-offer';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessEventOfferPage() {
  return <Shared {...netureGuideBusinessEventOfferProps} renderText={renderText} />;
}
