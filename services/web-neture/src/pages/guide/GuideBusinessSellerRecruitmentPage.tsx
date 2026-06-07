/**
 * GuideBusinessSellerRecruitmentPage — 판매자 모집 운영 안내 (Business Guide)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-SELLER-RECRUITMENT-V1
 * 여섯 번째 사업 운영 안내서. 세 주체가 함께 판매 네트워크를 형성하는 이유·구조.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessSellerRecruitmentProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business/seller-recruitment';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessSellerRecruitmentPage() {
  return <Shared {...netureGuideBusinessSellerRecruitmentProps} renderText={renderText} />;
}
