/**
 * K-Cosmetics Event Offer API (Store-side)
 *
 * WO-O4O-KCOS-STORE-PRODUCTS-FOUNDATION-V1
 *
 * 매장 경영자가 approved K-Cos Event Offer를 조회하기 위한 client.
 * (admin 흐름은 eventOfferAdmin.ts에 별도)
 *
 * Backend endpoint: GET /api/v1/cosmetics/event-offers/enriched
 *   - status='active'  → status='approved' AND date OK AND quantity>0
 *   - status='ended'   → 종료된 항목
 *   - status='all'     → 모든 항목 (관리자 디버그용)
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

export const cosmeticsEventOfferApi = {
  /**
   * approved + 진행중인 K-Cos Event Offer 목록.
   * status='active' = approved AND start/end window OK AND quantity>0.
   */
  listActive: (page = 1, limit = 20) => {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status: 'active',
    });
    return api.get<EnrichedEventOffersResponse>(
      `/cosmetics/event-offers/enriched?${qs.toString()}`,
    );
  },

  /**
   * 승인·진행 중인 이벤트 오퍼를 바로 주문한다.
   * 관심/참여 신청이 아니라 즉시 실주문(checkoutService.createOrder()) 생성.
   * Backend: POST /api/v1/cosmetics/event-offers/:id/participate (WO-O4O-EVENT-OFFER-GLYCO-KCOS-STORE-ORDER-ENABLE-V1)
   */
  participate: (id: string, quantity = 1) =>
    api.post<EventOfferOrderResponse>(
      `/cosmetics/event-offers/${id}/participate`,
      { quantity },
    ),
};
