/**
 * Event Offer → Store Cart payload helper (GlycoPharm)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2
 *
 * GlycoPharm 이벤트오퍼(EnrichedEventOffer)를 canonical StoreCartItem(sourceType='event_offer')
 * payload 로 변환한다. uuid 컬럼은 형태 검증 후 보존(아니면 null). organizationId 는 checkout 확정
 * 시 resolve(미전송). priceSnapshot 은 표시용 — checkout 확정 시 재검증.
 */
import type { AddCartItemInput } from '../api/storeCart';
import type { EnrichedEventOffer } from '../api/eventOffer';

/** GlycoPharm cart serviceKey (service-catalog 기준) */
export const CART_SERVICE_KEY = 'glycopharm';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const asUuid = (v: string | null | undefined): string | null =>
  v && UUID_RE.test(v) ? v : null;

export function buildEventOfferCartPayload(
  offer: EnrichedEventOffer,
  quantity: number,
): AddCartItemInput {
  return {
    sourceType: 'event_offer',
    supplierId: offer.supplierId ?? null,
    supplierProductOfferId: asUuid(offer.offerId),
    organizationProductListingId: asUuid(offer.id),
    eventOfferId: asUuid(offer.id),
    productName: offer.productName,
    quantity,
    pricingSource: 'event_offer',
    priceSnapshot: offer.unitPrice ?? offer.price ?? 0,
  };
}
