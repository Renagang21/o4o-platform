/**
 * GlycoPharm Event Offer API (Store-side)
 *
 * WO-O4O-GLYCOPHARM-EVENT-OFFERS-HUB-CANONICAL-ALIGNMENT-V1
 *
 * 매장 경영자가 approved GlycoPharm Event Offer를 조회하기 위한 client.
 *
 * Backend endpoints:
 * - GET  /api/v1/glycopharm/event-offers/enriched
 * - POST /api/v1/glycopharm/event-offers/:id/participate  (WO-O4O-EVENT-OFFER-GLYCO-KCOS-STORE-ORDER-ENABLE-V1)
 */

import { api } from '../lib/apiClient';

export interface EnrichedEventOffer {
  id: string;
  offerId: string;
  price: number | null;
  isActive: boolean;
  status: 'pending' | 'approved' | 'active' | 'ended' | 'canceled';
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplierId: string;
  unitPrice: number | null;
  productName: string;
  supplierName: string;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
}

export interface EnrichedEventOffersResponse {
  success: boolean;
  data: EnrichedEventOffer[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** 이벤트 오퍼 바로 주문(participate) 응답 — checkoutService.createOrder() 결과 스냅샷 */
export interface EventOfferOrderResult {
  orderId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
}

export interface EventOfferOrderResponse {
  success: boolean;
  data: EventOfferOrderResult;
}

export const glycopharmEventOfferApi = {
  listActive: (page = 1, limit = 20) => {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status: 'active',
    });
    return api.get<EnrichedEventOffersResponse>(
      `/glycopharm/event-offers/enriched?${qs.toString()}`,
    );
  },

  /**
   * 승인·진행 중인 이벤트 오퍼를 바로 주문한다.
   * 관심/참여 신청이 아니라 즉시 실주문(checkoutService.createOrder()) 생성.
   */
  participate: (id: string, quantity = 1) =>
    api.post<EventOfferOrderResponse>(
      `/glycopharm/event-offers/${id}/participate`,
      { quantity },
    ),
};
