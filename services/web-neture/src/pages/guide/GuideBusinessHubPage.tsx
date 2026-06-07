/**
 * GuideBusinessHubPage — Business Guide 허브 (/guide/business)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-HUB-V1
 * 7개 사업 운영 안내서를 독립 체계로 묶는 허브. 역할 Guide와 분리.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessHubProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessHubPage() {
  return <Shared {...netureGuideBusinessHubProps} renderText={renderText} />;
}
