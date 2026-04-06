/**
 * Operator Supply API
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1:
 *   operatorCopilotApi removed (no consumers after dashboard normalization).
 *   Copilot API deferred to WO-O4O-COPILOT-ENGINE-INTEGRATION-V1.
 */
import { api } from '../apiClient';
import type { DistributionType } from './supplier.js';

export interface OperatorSupplyProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  distributionType?: DistributionType;
  supplierId: string;
  supplierName: string;
  supplyStatus: 'available' | 'pending' | 'approved' | 'rejected';
  requestId: string | null;
  rejectReason: string | null;
  priceGeneral: number;
  consumerReferencePrice: number | null;
  approvalStatus: string;
  barcode: string;
  specification: string | null;
  primaryImageUrl: string | null;
}

/** WO-NETURE-OPERATOR-ALL-OFFERS-VIEW-FOUNDATION-V1 */
export interface AllRegisteredOffer {
  id: string;
  masterId: string;
  name: string;
  isActive: boolean;
  distributionType: string;
  approvalStatus: string;
  priceGeneral: number | null;
  consumerReferencePrice: number | null;
  supplierId: string;
  supplierName: string;
  supplierStatus: string;
  categoryName: string | null;
  brandName: string | null;
  barcode: string | null;
  specification: string | null;
  primaryImageUrl: string | null;
  regulatoryType: string | null;
  serviceApprovals: Array<{ serviceKey: string; status: string }>;
  createdAt: string;
}

export interface AllOffersKpi {
  total: number;
  active: number;
  inactive: number;
  distPublic: number;
  distService: number;
  distPrivate: number;
  approvalPending: number;
  approvalApproved: number;
  approvalRejected: number;
}

export interface AllOffersResponse {
  data: AllRegisteredOffer[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  kpi: AllOffersKpi;
}

export const operatorAllOffersApi = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    distributionType?: string;
    isActive?: string;
    approvalStatus?: string;
    category?: string;
    regulatoryType?: string;
    sort?: string;
    order?: string;
  }): Promise<AllOffersResponse> {
    try {
      const response = await api.get('/neture/operator/all-offers', { params });
      return response.data;
    } catch (error) {
      console.warn('[Operator API] Failed to fetch all offers:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        kpi: { total: 0, active: 0, inactive: 0, distPublic: 0, distService: 0, distPrivate: 0, approvalPending: 0, approvalApproved: 0, approvalRejected: 0 },
      };
    }
  },
};

export const operatorSupplyApi = {
  async getSupplyProducts(): Promise<OperatorSupplyProduct[]> {
    try {
      const response = await api.get('/neture/operator/supply-products');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Operator API] Failed to fetch supply products:', error);
      return [];
    }
  },

  // WO-NETURE-OPERATOR-SUPPLY-MENU-CLEANUP-V1: createSupplyRequest 제거 (백엔드 미구현 기능)
};
