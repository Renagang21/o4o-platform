/**
 * GuideBusinessContentNetworkPage — 콘텐츠 네트워크 운영 안내 (Business Guide)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-CONTENT-NETWORK-V1
 * 세 번째 사업 운영 안내서. 콘텐츠를 중심으로 공급자·운영자·매장이 연결되는 운영 구조.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessContentNetworkProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business/content-network';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessContentNetworkPage() {
  return <Shared {...netureGuideBusinessContentNetworkProps} renderText={renderText} />;
}
