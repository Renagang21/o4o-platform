/**
 * StoreHubPage — Pharmacy-Hub 매장허브 홈
 *
 * WO-O4O-PHARMACY-HUB-STORE-HUB-HOME-INTRODUCTION-V1
 *
 * 공통 `@o4o/shared-space-ui` 의 StoreHubTemplate 을 그대로 사용한다.
 * Pharmacy-Hub 전용 StoreHub 레이아웃 사본을 만들지 않으며, 서비스 차이는 StoreHubConfig 주입만으로 처리한다.
 * (KPA StoreHubPage / K-Cosmetics KCosmeticsHubPage 와 동일한 소비 패턴.)
 *
 * 경계 (O4O-STORE-MENU-CANONICAL-TREE-V1 축):
 *   /store-hub    공급자·플랫폼 자원을 **탐색**하는 영역 (본 화면 = 진입점)
 *   /store-owner  매장에 들어온 이후 실제 **운영·주문·관리** 영역 (기존 URL 불변)
 *
 * 이번 WO 는 진입점만 추가한다. `/store-owner/*` 의 기존 화면을 `/store-hub/*` 로 이동하지 않는다.
 *
 * 카드 연결 원칙 — **실제 route 가 있는 기능만 연결한다** (데드링크 0 / "준비 중" 카드 0):
 *   연결함     공급 상품 → /store-owner/products · 장바구니 → /store-owner/cart
 *   연결 안 함 공급자 콘텐츠 · 이벤트 오퍼 — Pharmacy-Hub 에 아직 route·기능이 없다.
 *
 * 정책: Pharmacy-Hub 의 "공급 상품" 의미를 KPA / K-Cosmetics 와 억지로 동일하게 만들지 않는다.
 *   KPA · K-Cosmetics  탐색 → 내 매장 추가 신청 → ProductApproval(PENDING) → 승인
 *   Pharmacy-Hub       탐색 → 장바구니 → 주문 (B2B 거래축)
 *   따라서 SupplyCatalogHub 연결 · ProductApproval 흐름 도입은 하지 않는다.
 */

import { StoreHubTemplate, type StoreHubConfig } from '@o4o/shared-space-ui';

const pharmacyHubStoreHubConfig: StoreHubConfig = {
  serviceKey: 'pharmacy-hub',

  heroTitle: '매장허브',
  heroDesc:
    '공급자가 Pharmacy-Hub 에 제공한 자원을 탐색하는 공간입니다. 실제 주문·매장 운영은 약국 경영 화면에서 진행합니다.',
  storeCta: { label: '약국 경영 →', href: '/store-owner' },

  resourceSectionTitle: '자원 탐색',
  resourceSectionDesc: '공급자가 제공한 상품을 확인하고 주문 준비를 진행하세요',
  resourceCards: [
    {
      icon: '📦',
      title: '공급 상품',
      desc: '공급자가 Pharmacy-Hub 에 제공한 거래·주문 대상 상품',
      href: '/store-owner/products',
      actionLabel: '탐색',
    },
    {
      icon: '🛒',
      title: '장바구니',
      desc: '담아 둔 공급 상품을 확인하고 주문으로 진행',
      href: '/store-owner/cart',
      actionLabel: '확인',
    },
  ],

  // 아직 실제 기능이 없는 영역(AI 추천 · 공급자 콘텐츠 · 이벤트 오퍼)은 화면에 만들지 않는다.
  showAiBlock: false,
  showStoreCtaBlock: false,

  // Pharmacy-Hub 의 실제 흐름 (신청·승인형이 아니라 거래·주문형)
  flowSectionTitle: '거래 흐름',
  flowSectionDesc: '탐색 → 장바구니 → 주문 순서로 진행합니다',
  operationSteps: [
    {
      step: '1',
      title: '공급 상품 탐색',
      desc: '공급자가 제공한 상품과 공급 조건을 확인합니다.',
      where: '매장허브',
    },
    {
      step: '2',
      title: '장바구니 담기',
      desc: '주문할 상품과 수량을 장바구니에 모읍니다.',
      where: '약국 경영',
    },
    {
      step: '3',
      title: '주문·결제',
      desc: '주문을 생성하고 결제 후 주문 내역에서 진행 상태를 확인합니다.',
      where: '약국 경영',
    },
  ],
};

export function StoreHubPage() {
  return <StoreHubTemplate config={pharmacyHubStoreHubConfig} />;
}

export default StoreHubPage;
