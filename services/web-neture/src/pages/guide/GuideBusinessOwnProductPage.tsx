/**
 * GuideBusinessOwnProductPage — 자체 제품 · 서비스 전용 상품 운영 안내 (Business Guide)
 *
 * WO-O4O-NETURE-BUSINESS-GUIDE-OWN-PRODUCT-V1
 * 사업 모델 안내서 — 운영자가 자체 제품으로 자신만의 사업을 만드는 구조를 설명한다.
 * 제품 개발 · 제조 · 등록 방법이 아님.
 */
import {
  GuideFeatureManualPage as Shared,
  netureGuideBusinessOwnProductProps,
} from '@o4o/shared-space-ui';
import type { GuideTextRenderer } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/business/own-product';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

export function GuideBusinessOwnProductPage() {
  return <Shared {...netureGuideBusinessOwnProductProps} renderText={renderText} />;
}
