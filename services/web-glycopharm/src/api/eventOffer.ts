/**
 * GlycoPharm Event Offer API (Store-side)
 *
 * WO-O4O-GLYCOPHARM-EVENT-OFFERS-HUB-CANONICAL-ALIGNMENT-V1
 *
 * 매장 경영자가 approved GlycoPharm Event Offer를 조회하기 위한 client.
 *
 * Backend endpoint: GET /api/v1/glycopharm/event-offers/enriched
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
};
