/**
 * Event Offer → Store Cart payload helper (GlycoPharm)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2
 * WO-O4O-STORE-HUB-EVENT-OFFER-COMMONIZATION-V1:
 *   uuid 검증 + payload 조립을 공통 helper(@o4o/store-ui-core)로 이관.
 *   본 파일은 GlycoPharm 의 cart serviceKey 와 가격 우선순위(unitPrice → price)만 소유한다.
 */
import {
  asUuid,
  buildEventOfferCartPayload as buildCommonEventOfferCartPayload,
} from '@o4o/store-ui-core';
import type { AddCartItemInput } from '../api/storeCart';
import type { EnrichedEventOffer } from '../api/eventOffer';

/** GlycoPharm cart serviceKey (service-catalog 기준) */
export const CART_SERVICE_KEY = 'glycopharm';

export { asUuid };

export function buildEventOfferCartPayload(
  offer: EnrichedEventOffer,
  quantity: number,
): AddCartItemInput {
  return buildCommonEventOfferCartPayload(offer, quantity, (o) => o.unitPrice ?? o.price);
}
