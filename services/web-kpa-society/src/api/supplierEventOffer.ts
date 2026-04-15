/**
 * Supplier Event Offer API
 * WO-EVENT-OFFER-SUPPLIER-PROPOSAL-PATH-V1
 *
 * Neture 공급자가 자신의 SPO를 KPA 이벤트로 제안하는 API 클라이언트
 */

import { apiClient } from './client';

export interface SupplierOffer {
  id: string;
  masterId: string;
  title: string;
  supplierName: string;
  price: number | null;
  approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface SupplierOffersData {
  offers: SupplierOffer[];
  supplierId: string;
}

export interface SupplierProposal {
  id: string;
  offerId: string;
  title: string;
  supplierName: string;
  price: number | null;
  status: 'pending' | 'active';
  isActive: boolean;
  proposedAt: string;
}

export const supplierEventOfferApi = {
  /**
   * 제안 가능한 내 SPO 목록 (APPROVED, 미등록)
   */
  getMyOffers: () =>
    apiClient.get<{ data: SupplierOffersData }>('/supplier/my-offers'),

  /**
   * 내가 제안한 OPL 목록
   */
  getMyProposals: () =>
    apiClient.get<{ data: SupplierProposal[] }>('/supplier/event-offers'),

  /**
   * SPO를 KPA 이벤트로 제안
   */
  propose: (offerId: string) =>
    apiClient.post<{ data: SupplierProposal }>('/supplier/event-offers', { offerId }),
};
