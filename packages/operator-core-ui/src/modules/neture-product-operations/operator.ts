import type { AxiosInstance } from 'axios';
import type { DistributionType } from './supplier-product.types';
export const OPERATOR_ALL_OFFERS_LOAD_FAILED = 'OPERATOR_ALL_OFFERS_LOAD_FAILED';
export const OPERATOR_SUPPLY_PRODUCTS_LOAD_FAILED = 'OPERATOR_SUPPLY_PRODUCTS_LOAD_FAILED';
function describeApiError(error: any): string {
  const data = error?.response?.data;
  if (typeof data?.error === 'string') return data.error;
  if (data?.error && typeof data.error === 'object') return data.error.code || data.error.message || 'UNKNOWN_ERROR';
  return error?.message || 'UNKNOWN_ERROR';
}
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
  serviceApprovals: Array<{ id?: string; serviceKey: string; status: string }>;
  createdAt: string;
  // WO-NETURE-OPERATOR-PRODUCT-LIST-DESCRIPTION-COLUMNS-APPLY-V1
  consumerShortDescription?: string | null;
  consumerDetailDescription?: string | null;
  businessShortDescription?: string | null;
  businessDetailDescription?: string | null;
  tags?: string[] | null;
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
export function createOperatorApi(api: AxiosInstance) {
const operatorAllOffersApi = {
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
    let response;
    try {
      response = await api.get('/neture/operator/all-offers', { params });
    } catch (error) {
      console.warn('[Operator API] Failed to fetch all offers:', describeApiError(error));
      throw new Error(OPERATOR_ALL_OFFERS_LOAD_FAILED);
    }
    const result = response.data;
    if (result?.success !== true || !Array.isArray(result.data) || !result.pagination || !result.kpi) {
      console.warn('[Operator API] Unexpected all-offers payload shape');
      throw new Error(OPERATOR_ALL_OFFERS_LOAD_FAILED);
    }
    return { data: result.data, pagination: result.pagination, kpi: result.kpi };
  },

  async batchToggleActive(offerIds: string[], isActive: boolean): Promise<{ updated: string[]; failed: Array<{ id: string; error: string }> }> {
    try {
      const response = await api.patch('/neture/operator/all-offers/batch-active', { offerIds, isActive });
      return response.data?.data || { updated: [], failed: [] };
    } catch (error) {
      console.warn('[Operator API] Failed to batch toggle active:', error);
      return { updated: [], failed: [{ id: 'all', error: 'NETWORK_ERROR' }] };
    }
  },
};
const operatorSupplyApi = {
  async getSupplyProducts(): Promise<OperatorSupplyProduct[]> {
    let response;
    try {
      response = await api.get('/neture/operator/supply-products');
    } catch (error) {
      console.warn('[Operator API] Failed to fetch supply products:', describeApiError(error));
      throw new Error(OPERATOR_SUPPLY_PRODUCTS_LOAD_FAILED);
    }
    const result = response.data;
    if (result?.success !== true || !Array.isArray(result.data)) {
      console.warn('[Operator API] Unexpected supply-products payload shape');
      throw new Error(OPERATOR_SUPPLY_PRODUCTS_LOAD_FAILED);
    }
    return result.data;
  },

  // WO-NETURE-OPERATOR-SUPPLY-MENU-CLEANUP-V1: createSupplyRequest 제거 (백엔드 미구현 기능)
};
return {operatorAllOffersApi,operatorSupplyApi};
}
