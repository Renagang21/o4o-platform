/**
 * Buyer Order Service Scope — 구매자(매장) 주문 조회 범위 키 집합
 *
 * WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1
 *
 * ## 배경 (결함)
 *
 * Store Hub 장바구니의 `POST /cart/:serviceKey/checkout-confirm` 은
 * `EventOfferCartCheckoutService` 를 통해 주문을 만들면서
 * `checkout_orders.metadata.serviceKey` 에 **event-offer(OPL) 키**를 기록한다
 * (`kpa-groupbuy` · `glycopharm-event-offer` · `k-cosmetics-event-offer`).
 *
 * 반면 각 서비스의 구매자 주문 목록/상세(`GET /{svc}/checkout/orders[...]`)는
 * **retail 축 키**만으로 필터한다(`kpa-society`/`kpa` · `glycopharm` · `cosmetics`).
 * 그 결과 이벤트 오퍼로 생성된 주문이 매장측 주문 목록에서 조회되지 않고
 * 단건 조회도 404 `ORDER_NOT_FOUND` 가 된다.
 *
 * ## 해결 방향 (기록 의미 보존)
 *
 * `metadata.serviceKey = 'kpa-groupbuy'` 등은 **그 주문이 어느 OPL 도메인에서 왔는지**를
 * 나타내는 유의미한 기록이다(`service_keys` 테이블에 실재하는 도메인 키이며
 * `organization_product_listings.service_key` 와 같은 축이다).
 * 따라서 **쓰기(기록)를 바꾸지 않고 읽기 범위만 넓힌다.**
 *   - 기존에 이미 생성된 주문도 즉시 조회 가능해진다(데이터 보정 불필요).
 *   - OPL 도메인 출처 정보가 보존된다.
 *
 * 이 모듈은 그 "한 서비스의 구매자 주문으로 인정하는 metadata.serviceKey 집합"의 단일 정의다.
 * 각 컨트롤러에 하드코딩돼 있던 리터럴 배열을 대체한다.
 */

import { SERVICE_KEYS } from './service-keys.js';
import { TARGET_TO_EVENT_OFFER_KEY, type TargetServiceKey } from './event-offer-service-mapping.js';

/**
 * 플랫폼 서비스별 **retail 축** 주문 키.
 *
 * 각 checkout 컨트롤러가 기존에 하드코딩하던 값을 그대로 옮긴 것이다(동작 동일).
 *   - KPA  : 'kpa-society' + 레거시 'kpa'
 *   - GP   : 'glycopharm'
 *   - KCos : 'cosmetics'  ※ 플랫폼 키('k-cosmetics')와 다르다 — 주문 metadata 는 'cosmetics' 를 쓴다
 */
const RETAIL_ORDER_SERVICE_KEYS: Record<TargetServiceKey, readonly string[]> = {
  [SERVICE_KEYS.KPA_SOCIETY]: [SERVICE_KEYS.KPA_SOCIETY, SERVICE_KEYS.KPA],
  [SERVICE_KEYS.GLYCOPHARM]: [SERVICE_KEYS.GLYCOPHARM],
  [SERVICE_KEYS.K_COSMETICS]: [SERVICE_KEYS.COSMETICS],
};

/**
 * 해당 플랫폼 서비스의 구매자 주문으로 인정하는 `metadata.serviceKey` 전체 집합.
 * = retail 축 키 + 그 서비스의 event-offer(OPL) 키.
 *
 * @example
 *   getBuyerOrderServiceKeys('kpa-society')  // ['kpa-society', 'kpa', 'kpa-groupbuy']
 *   getBuyerOrderServiceKeys('glycopharm')   // ['glycopharm', 'glycopharm-event-offer']
 *   getBuyerOrderServiceKeys('k-cosmetics')  // ['cosmetics', 'k-cosmetics-event-offer']
 */
export function getBuyerOrderServiceKeys(platformServiceKey: TargetServiceKey): string[] {
  const retail = RETAIL_ORDER_SERVICE_KEYS[platformServiceKey] ?? [];
  const eventOfferKey = TARGET_TO_EVENT_OFFER_KEY[platformServiceKey];
  return eventOfferKey ? [...retail, eventOfferKey] : [...retail];
}

/** 해당 서비스의 event-offer(OPL) 키. 이벤트 오퍼 주문 판별에 쓴다. */
export function getEventOfferOrderServiceKey(platformServiceKey: TargetServiceKey): string {
  return TARGET_TO_EVENT_OFFER_KEY[platformServiceKey];
}

/** 모든 서비스의 event-offer 주문 키 집합 (이벤트 오퍼 주문 여부 판별용). */
export const ALL_EVENT_OFFER_ORDER_SERVICE_KEYS: readonly string[] = Object.values(
  TARGET_TO_EVENT_OFFER_KEY,
);

export function isEventOfferOrderServiceKey(key: string | null | undefined): boolean {
  return !!key && ALL_EVENT_OFFER_ORDER_SERVICE_KEYS.includes(key);
}
