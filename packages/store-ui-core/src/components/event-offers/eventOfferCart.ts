/**
 * eventOfferCart — 이벤트 오퍼 → 매장 장바구니 payload 공통 helper
 *
 * WO-O4O-STORE-HUB-EVENT-OFFER-COMMONIZATION-V1
 *
 * KPA-Society / K-Cosmetics / GlycoPharm 이 각자 `src/utils/eventOfferCart.ts` 로
 * 갖고 있던 동일 로직(uuid 형태 검증 + canonical cart payload 조립)을 한 곳으로 모은다.
 *
 * 업무 의미 (변경 없음):
 *   이벤트 오퍼 참여 = **장바구니에 담기**가 아니다. 담기는 canonical 구매 동선의 첫 단계일 뿐이고
 *   확정은 checkout 단계에서 이루어진다. 본 helper 는 payload 조립만 담당하며
 *   담기/주문/결제 정책을 판단하지 않는다.
 *
 * 주의 (기존 주석 유지):
 *   - uuid 컬럼(eventOfferId / organizationProductListingId / supplierProductOfferId)에는
 *     uuid 형태 값만 보존(아니면 null) — 비-uuid 값 전송 시 DB 오류 방지.
 *   - organizationId 는 매장 org 확정이 어려워 보내지 않는다 (checkout Phase 에서 resolve).
 *   - priceSnapshot 은 담을 때의 표시용 임시값이며 checkout 확정 시 재검증된다.
 *   - serviceKey 는 payload 가 아니라 storeCartApi 호출 인자다 — 각 서비스가 소유한다.
 */

/** 이벤트 오퍼 항목의 최소 계약. 서비스별 타입(EventOfferItem / EnrichedEventOffer)은 이 위에서 확장된다. */
export interface EventOfferCartSource {
  /** organization_product_listings row id (= 이벤트 오퍼 id) */
  id: string;
  /** supplier_product_offers id */
  offerId?: string | null;
  supplierId?: string | null;
  productName: string;
}

/** canonical StoreCartItem 추가 payload (sourceType='event_offer') */
export interface EventOfferCartPayload {
  sourceType: 'event_offer';
  supplierId: string | null;
  supplierProductOfferId: string | null;
  organizationProductListingId: string | null;
  eventOfferId: string | null;
  productName: string;
  quantity: number;
  pricingSource: 'event_offer';
  priceSnapshot: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** uuid 형태일 때만 그대로, 아니면 null */
export const asUuid = (v: string | null | undefined): string | null =>
  v && UUID_RE.test(v) ? v : null;

/**
 * 이벤트 오퍼 → cart add payload.
 *
 * 가격 필드는 서비스별 응답 계약이 달라(eventPrice/generalPrice vs unitPrice/price)
 * `resolvePrice` adapter 로 주입한다. 공통 helper 가 가격 정책을 정하지 않는다.
 */
export function buildEventOfferCartPayload<T extends EventOfferCartSource>(
  item: T,
  quantity: number,
  resolvePrice: (item: T) => number | null | undefined,
): EventOfferCartPayload {
  return {
    sourceType: 'event_offer',
    supplierId: item.supplierId ?? null,
    supplierProductOfferId: asUuid(item.offerId),
    organizationProductListingId: asUuid(item.id),
    eventOfferId: asUuid(item.id),
    productName: item.productName,
    quantity,
    pricingSource: 'event_offer',
    priceSnapshot: resolvePrice(item) ?? 0,
  };
}
