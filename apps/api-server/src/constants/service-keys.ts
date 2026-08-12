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
} as const;

export type ServiceKey = typeof SERVICE_KEYS[keyof typeof SERVICE_KEYS];

/**
 * WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1
 * OPL visibility gate에서 허용하는 GlycoPharm serviceKey 목록.
 * store.controller / checkout.controller / GlycopharmPaymentEventHandler 3곳에서 공용.
 */
export const GLYCOPHARM_OPL_SERVICE_KEYS = [
  SERVICE_KEYS.GLYCOPHARM,
  SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER,
] as const satisfies string[];
