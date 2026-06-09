/**
 * Event Offer → Store Cart payload helper
 *
 * WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1 (Phase 1a) / FOLLOWUP-V1
 *
 * 이벤트오퍼(EventOfferItem)를 canonical StoreCartItem(sourceType='event_offer')으로
 * 담기 위한 payload 를 생성한다. 상세 화면(EventOfferDetailPage)과 목록 화면
 * (KpaEventOfferPage)이 동일 로직을 공유하도록 분리.
 *
 * 주의:
 *   - uuid 컬럼(eventOfferId/organizationProductListingId/supplierProductOfferId)에는
 *     uuid 형태 값만 보존(아니면 null) — 비-uuid 값 전송 시 DB 오류 방지.
 *   - organizationId 는 정확한 매장 org 확정이 어려워 보내지 않는다(checkout Phase 에서 resolve).
 *   - priceSnapshot 은 담을 때의 표시용 임시값이며 checkout 확정 시 재검증된다.
 */
import type { AddCartItemInput } from '../api/storeCart';
import type { EventOfferItem } from '../types';

/** 이 서비스의 canonical store cart serviceKey (service-catalog 기준) */
export const CART_SERVICE_KEY = 'kpa-society';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** uuid 형태일 때만 그대로, 아니면 null */
export const asUuid = (v: string | null | undefined): string | null =>
  v && UUID_RE.test(v) ? v : null;

/** EventOfferItem → cart add payload (sourceType='event_offer') */
export function buildEventOfferCartPayload(
  item: EventOfferItem,
  quantity: number,
): AddCartItemInput {
  return {
    sourceType: 'event_offer',
    supplierId: item.supplierId ?? null,
    supplierProductOfferId: asUuid(item.offerId),
    organizationProductListingId: asUuid(item.id),
    eventOfferId: asUuid(item.id),
    productName: item.productName,
    quantity,
    pricingSource: 'event_offer',
    priceSnapshot: item.eventPrice ?? item.unitPrice ?? item.generalPrice ?? 0,
  };
}
