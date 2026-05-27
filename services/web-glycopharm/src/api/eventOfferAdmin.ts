/**
 * Event Offer Admin API — GlycoPharm Operator
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1
 *
 * Backend: WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1
 *   /api/v1/glycopharm/operator/event-offers (serviceKey='glycopharm-event-offer' 격리)
 */

import { authClient } from '../lib/apiClient';

export interface PendingListing {
  id: string;
  offerId: string;
  masterId: string;
  organizationId: string;
  productName: string;
  supplierName: string;
  price: number | null;
  eventPrice: number | null;
  generalPrice: number | null;
  startAt: string | null;
  endAt: string | null;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
  requestedBy: string | null;
  requestedByEmail: string | null;
  createdAt: string;
}

export const glycopharmEventOfferAdminApi = {
  /** 승인 대기 목록 (glycopharm:operator) */
  getPendingListings: (page = 1, limit = 50) =>
    authClient.api.get<{
      success: boolean;
      data: PendingListing[];
      pagination: { page: number; limit: number; total: number };
    }>(`/glycopharm/operator/event-offers/pending-listings?page=${page}&limit=${limit}`),

  /** pending OPL 승인 */
  approveListing: (id: string) =>
    authClient.api.post<{ success: boolean; data: any }>(
      `/glycopharm/operator/event-offers/products/${id}/approve`,
    ),

  /** pending OPL 반려 */
  rejectListing: (id: string, reason: string) =>
    authClient.api.post<{ success: boolean; data: any }>(
      `/glycopharm/operator/event-offers/products/${id}/reject`,
      { reason },
    ),
};
