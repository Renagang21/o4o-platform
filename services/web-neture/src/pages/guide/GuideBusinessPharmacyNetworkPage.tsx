/**
 * GuideBusinessPharmacyNetworkPage — 약국 네트워크 운영 안내 (Business Guide)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-PHARMACY-NETWORK-V1
 * 첫 번째 사업 운영 안내서. 협동조합 전용 아님 — 약국 연합 전반 대상.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessPharmacyNetworkProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business/pharmacy-network';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessPharmacyNetworkPage() {
  return <Shared {...netureGuideBusinessPharmacyNetworkProps} renderText={renderText} />;
}
