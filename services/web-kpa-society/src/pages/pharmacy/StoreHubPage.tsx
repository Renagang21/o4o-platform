/**
 * StoreHubPage — KPA 매장 운영 허브 랜딩
 *
 * WO-O4O-STORE-HUB-TEMPLATE-FOUNDATION-V1
 * WO-O4O-SERVICE-CONFIG-INTRODUCTION-V1: kpaConfig 기반 텍스트 치환
 * WO-O4O-KPA-STORE-HUB-HOME-LATEST-RESOURCE-FEED-V1:
 *   정적 안내 카드(자원 4카드 / AI 추천 placeholder / 내 약국 CTA 블록 / 운영 흐름 3단계) 제거.
 *   첫 화면 = 최신 자원 피드(StoreHubLatestFeed) — 새 상품 + 최신 콘텐츠 + 최신 디지털 자료 미리보기.
 *   StoreHubTemplate.renderMainSections 슬롯 + showHeroCta=false (KPA opt-in, GP/KCos 무영향).
 */

import { StoreHubTemplate, type StoreHubConfig } from '@o4o/shared-space-ui';
import { kpaConfig } from '@o4o/operator-ux-core';
import { GuideEditableSection } from '../../components/guide';
import { StoreHubLatestFeed } from './StoreHubLatestFeed';

const { terminology } = kpaConfig;

// WO-O4O-SERVICE-INLINE-EDIT-EXPANSION-V1: 서비스 페이지 설명 영역 인라인 편집
const PAGE_KEY = 'store-hub';

function editable(sectionKey: string, defaultText: string) {
  return (
    <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultText} />
  );
}

// ─── KPA Config ────────────────────────────────────────────────────────────────
// renderMainSections 가 Block 2~5 를 대체하므로 resourceCards/operationSteps 는 비워 둔다.
// storeCta 는 타입상 필수지만 showHeroCta=false 로 Hero 버튼은 숨긴다.

const kpaStoreHubConfig: StoreHubConfig = {
  serviceKey: 'kpa-society',

  heroTitle: terminology.storeHubLabel,
  heroDesc: editable(
    'hero-description',
    `새로 공급된 상품과 ${terminology.myStoreLabel} 운영에 활용할 콘텐츠·디지털 자료를 확인하세요.`,
  ),
  storeCta: { label: `${terminology.myStoreLabel} 관리 →`, href: '/store' },
  showHeroCta: false,

  // 기존 5-block 미사용 (renderMainSections 가 대체)
  resourceCards: [],
  operationSteps: [],
  showAiBlock: false,
  showStoreCtaBlock: false,
  showFlowBlock: false,

  // 최신 자원 피드 (KPA opt-in 본문)
  renderMainSections: () => <StoreHubLatestFeed />,
};

// ─── Page Component ────────────────────────────────────────────────────────────

export function StoreHubPage() {
  return <StoreHubTemplate config={kpaStoreHubConfig} />;
}

export default StoreHubPage;
