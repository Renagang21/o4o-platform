/**
 * Pharmacy-Hub 결제·fulfillment 축 상수 SSOT
 *
 * WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1
 *
 * 결제 컨트롤러 · 이벤트 핸들러 · fulfillment bridge · 공급자 조회가 **같은 문자열**을
 * 봐야 하므로 한 곳에서만 정의한다. 값이 어긋나면 결제는 성공하고 주문은 전이되지 않는
 * 조용한 단절이 생긴다.
 */

/** checkout_orders.metadata.source — Pharmacy-Hub 장바구니에서 생성된 주문 */
export const PHARMACY_HUB_ORDER_SOURCE = 'pharmacy_hub_cart';

/**
 * 결제 sourceService = PaymentEventHub 구독 serviceKey.
 *
 * Neture B2B('neture-b2b') · legacy Neture('neture') 와 **분리**되어 있어
 * 서로의 핸들러가 상대 주문을 건드리지 않는다.
 */
export const PHARMACY_HUB_PAYMENT_SERVICE_KEY = 'pharmacy-hub';
