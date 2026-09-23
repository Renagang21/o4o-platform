/**
 * Store B2B Payment 상수 — SSOT
 *
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-E
 *
 * 승인축 B2B(kpa-society · k-cosmetics)와 Event Offer(kpa-groupbuy · k-cosmetics-event-offer)는
 * **같은 결제 계약**을 쓴다. Event Offer 는 "특가 판매" 일 뿐이므로 전용 결제 엔진·전용 UX 를
 * 만들지 않는다.
 *
 * serviceKey 를 서비스별로 쪼개지 않는 이유: 실제 서비스 경계 축은 checkout_order 의
 * `metadata.serviceKey` 이고, payment event serviceKey 는 **구독 라우팅 키**일 뿐이다.
 * 단일 키를 쓰면 handler 를 1개만 유지하면 된다(Neture B2B · Pharmacy-Hub 는 기존 키 유지 · 무회귀).
 */

/** payment.completed 구독 키 (PaymentCoreService.prepare 의 sourceService) */
export const STORE_B2B_PAYMENT_SERVICE_KEY = 'store-b2b';

/** 승인축 B2B cart checkout 이 심는 checkout_order metadata.source */
export const STORE_B2B_CART_ORDER_SOURCE = 'store_b2b_cart';

/** Event Offer cart checkout 이 심는 checkout_order metadata.source */
export const EVENT_OFFER_CART_ORDER_SOURCE = 'store_cart_checkout';

/**
 * 이 결제 축이 결제를 허용하는 checkout_order `metadata.source` 집합.
 * 여기에 없는 source 는 다른 축(neture_b2b_checkout · pharmacy_hub_cart)이 담당한다.
 */
export const STORE_B2B_PAYABLE_ORDER_SOURCES: readonly string[] = [
  STORE_B2B_CART_ORDER_SOURCE,
  EVENT_OFFER_CART_ORDER_SOURCE,
];

/** KPA 축 B2B 결제가 허용하는 checkout_order metadata.serviceKey */
export const KPA_B2B_SERVICE_KEYS: readonly string[] = ['kpa-society', 'kpa-groupbuy'];

/** K-Cosmetics 축 B2B 결제가 허용하는 checkout_order metadata.serviceKey */
export const COSMETICS_B2B_SERVICE_KEYS: readonly string[] = ['k-cosmetics', 'k-cosmetics-event-offer'];
