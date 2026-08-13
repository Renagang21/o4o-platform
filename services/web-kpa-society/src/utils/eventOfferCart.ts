/**
 * Event Offer → Store Cart payload helper (KPA-Society)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1 (Phase 1a) / FOLLOWUP-V1
 * WO-O4O-STORE-HUB-EVENT-OFFER-COMMONIZATION-V1:
 *   uuid 검증 + payload 조립을 공통 helper(@o4o/store-ui-core)로 이관.
 *   본 파일은 KPA 의 cart serviceKey 와 가격 우선순위(eventPrice → unitPrice → generalPrice)만 소유한다.
 *
 * 소비처: 목록(KpaEventOfferPage) · 상세(EventOfferDetailPage) 공통.
 */
import {
  asUuid,
  buildEventOfferCartPayload as buildCommonEventOfferCartPayload,
} from '@o4o/store-ui-core';
import type { AddCartItemInput } from '../api/storeCart';
import type { EventOfferItem } from '../types';

/** 이 서비스의 canonical store cart serviceKey (service-catalog 기준) */
export const CART_SERVICE_KEY = 'kpa-society';

export { asUuid };

/** EventOfferItem → cart add payload (sourceType='event_offer') */
export function buildEventOfferCartPayload(
  item: EventOfferItem,
  quantity: number,
): AddCartItemInput {
  return buildCommonEventOfferCartPayload(
    item,
    quantity,
    (i) => i.eventPrice ?? i.unitPrice ?? i.generalPrice,
  );
}
