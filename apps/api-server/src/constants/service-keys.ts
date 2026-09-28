/**
 * Platform Service Keys
 *
 * WO-O4O-SERVICE-REGISTRY-REFORM-V1
 *
 * Product-level keys (kpa, cosmetics, kpa-groupbuy) — 제품 도메인 식별
 * Platform-level keys (kpa-society, k-cosmetics, neture, ...) — 서비스 카탈로그 식별
 *
 * 모든 값은 platform_services.code에 등록됨.
 */
export const SERVICE_KEYS = {
  // Product-level keys
  KPA: 'kpa',
  KPA_GROUPBUY: 'kpa-groupbuy',
  COSMETICS: 'cosmetics',
  // Event Offer keys (WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1)
  EVENT_OFFER_NETURE: 'neture-event-offer',
  // WO-O4O-EVENT-OFFER-KCOS-ADOPTION-V1: K-Cosmetics Event Offer key
  K_COSMETICS_EVENT_OFFER: 'k-cosmetics-event-offer',
  // WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1: Pharmacy-Hub Event Offer key.
  //   키만 등록 — TARGET_TO_EVENT_OFFER_KEY 매핑 등록은 후속 이벤트 오퍼 WO.
  //   (지금 매핑에 넣으면 기존 공급자 제안 UI 에 즉시 노출되므로 Foundation 범위 밖)
  PHARMACY_HUB_EVENT_OFFER: 'pharmacy-hub-event-offer',
  // Platform-level keys
  KPA_SOCIETY: 'kpa-society',
  K_COSMETICS: 'k-cosmetics',
  NETURE: 'neture',
  // WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1: 약국 전문 서비스 (공급자 ↔ 약국 경영자 직접 연결)
  PHARMACY_HUB: 'pharmacy-hub',
  /** WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 1: 독립 O4O 강의 서비스 */
  LECTURE: 'lecture',
  /** WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1: 약사회 분회 서비스 */
  KPA_BRANCH: 'kpa-branch',
  /**
   * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §D2
   *
   * Cafe24 B2B 사업자의 거래처 매장 판매지원 서비스.
   * 기존 `cafe24`(운영자 OAuth 축) · `neture`(공급자 축) 에 편입하지 않는다 —
   * 이 키의 회원은 O4O 에 직접 가입하지 않고 Cafe24 회원 자격만으로 존재하므로
   * 다른 서비스의 가입·승인·권한 계약과 섞이면 안 된다.
   */
  CAFE24_B2B: 'cafe24-b2b',
  /**
   * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1: 커뮤니티 서비스.
   *
   * 개별 커뮤니티는 `communities` 개체이고, 이 키는 그 **위의 서비스 축**이다
   * (진입 자격 · 전체 관리자 `community:admin`). 개별 커뮤니티 운영은 개체 역할
   * (`community_memberships.role='operator'`)이며 서비스 전역 operator 역할은 없다.
   */
  COMMUNITY: 'community',
  /**
   * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1: 공급자 서비스 (supplier.neture.co.kr).
   *
   * **사업자 본인의 접근은 이 키가 판정하지 않는다** — 그것은
   * `organization_members(role=owner) → organizations(type='supplier') → neture_suppliers`
   * 가 canonical 이며 FROZEN 이다(O4O-SUPPLIER-DOMAIN-BOUNDARY-V1 §7, 변경 없음).
   * 이 키는 **그 영역을 운영하는 쪽**의 범위다 — 공급자 심사·정지·서류 확인.
   */
  SUPPLIER: 'supplier',
  /**
   * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1: 유통참여형 펀딩 (funding.neture.co.kr).
   * 「유통참여형 펀딩」은 플랫폼 공통 제품명이고, 이 키는 그 **서브도메인 운영자 범위**다.
   */
  FUNDING: 'funding',
} as const;

export type ServiceKey = typeof SERVICE_KEYS[keyof typeof SERVICE_KEYS];
