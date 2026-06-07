/**
 * GuideBusinessSupplierNetworkPage — 공급자 네트워크 운영 안내 (Business Guide)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-SUPPLIER-NETWORK-V1
 * 두 번째 사업 운영 안내서. 공급자 기반 운영자 — 매장을 지원하는 서비스 운영.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessSupplierNetworkProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business/supplier-network';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessSupplierNetworkPage() {
  return <Shared {...netureGuideBusinessSupplierNetworkProps} renderText={renderText} />;
}
