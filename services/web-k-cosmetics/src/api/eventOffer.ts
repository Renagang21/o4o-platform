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
};
