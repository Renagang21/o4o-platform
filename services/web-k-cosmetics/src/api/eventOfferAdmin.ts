/**
 * K-Cosmetics Event Offer Admin API
 *
 * WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1
 *
 * K-Cos operator가 supplier 제안 OPL을 승인/반려하기 위한 client.
 * (KPA의 eventOfferAdmin과 동일한 패턴이지만 endpoint prefix가 cosmetics임)
 */

import { api } from '../lib/apiClient';

export interface PendingListing {
  id: string;
  offerId: string;
  masterId: string;
  organizationId: string;
  productName: string;
  supplierName: string;
  price: number | null;
  requestedBy: string | null;
  requestedByEmail: string | null;
  createdAt: string;
}

export interface PendingListingsResponse {
  success: boolean;
  data: PendingListing[];
  pagination: { page: number; limit: number; total: number };
}

export interface ApproveListingResult {
  id: string;
  status: 'approved';
  isActive: true;
  decidedAt: string;
}

export interface RejectListingResult {
  id: string;
  status: 'rejected';
  isActive: false;
  decidedAt: string;
  rejectedReason: string;
}

export interface EventOfferApiError {
  code: string;
  message: string;
}

export const cosmeticsEventOfferAdminApi = {
  /** pending OPL 목록 조회 (승인 대기열) */
  listPendingEventOffers: (page = 1, limit = 50) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    return api.get<PendingListingsResponse>(
      `/cosmetics/event-offers/pending-listings?${qs.toString()}`,
    );
  },

  /** pending OPL 승인 */
  approveEventOffer: (id: string) =>
    api.post<{ success: boolean; data: ApproveListingResult }>(
      `/cosmetics/event-offers/products/${id}/approve`,
      {},
    ),

  /** pending OPL 반려 */
  rejectEventOffer: (id: string, reason: string) =>
    api.post<{ success: boolean; data: RejectListingResult }>(
      `/cosmetics/event-offers/products/${id}/reject`,
      { reason },
    ),
};
