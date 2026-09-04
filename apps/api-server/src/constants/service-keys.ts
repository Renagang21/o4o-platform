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
  GLYCOPHARM: 'glycopharm',
  // Event Offer keys (WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1)
  EVENT_OFFER_NETURE: 'neture-event-offer',
  // WO-O4O-EVENT-OFFER-KCOS-ADOPTION-V1: K-Cosmetics Event Offer key
  K_COSMETICS_EVENT_OFFER: 'k-cosmetics-event-offer',
  // WO-O4O-GLYCOPHARM-EVENT-OFFERS-BACKEND-CANONICAL-ALIGNMENT-V1
  GLYCOPHARM_EVENT_OFFER: 'glycopharm-event-offer',
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
} as const;

export type ServiceKey = typeof SERVICE_KEYS[keyof typeof SERVICE_KEYS];

/**
 * WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1
 * OPL visibility gate에서 허용하는 GlycoPharm serviceKey 목록.
 * store.controller / checkout.controller 에서 공용.
 * (GlycopharmPaymentEventHandler 는 WO-O4O-ECOMMERCE-CORE-AND-COMMERCE-RESIDUE-FINAL-CENSUS-AND-RETIREMENT-V1
 *  에서 producer 0건 DEAD 판정으로 제거되었다.)
 */
export const GLYCOPHARM_OPL_SERVICE_KEYS = [
  SERVICE_KEYS.GLYCOPHARM,
  SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER,
] as const satisfies string[];
