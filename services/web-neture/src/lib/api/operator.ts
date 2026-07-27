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

/**
 * WO-O4O-NETURE-OPERATOR-PRODUCTS-AND-OFFERS-LOAD-ERROR-CONTRACT-V1 (IR 묶음 2)
 *
 * 운영자 오퍼·공급 상품 조회 실패(4xx/5xx/네트워크/깨진 payload)를 "정상 0건" 으로 삼키지 않는다.
 * 실패 시 고정 코드 throw(서버 원문은 console.warn 으로만 로깅), 정상 0건(200 빈 배열)만 성공 통과.
 * Backend 계약(read-only 확인):
 *   `GET /neture/operator/all-offers`     → `200 { success:true, data:[], pagination, kpi }`
 *   `GET /neture/operator/supply-products` → `200 { success:true, data:[] }`
 * 정상 0건도 200+빈 배열. 4xx/5xx 는 실HTTP 오류(403=requireNetureScope, 401=미인증). 404 경로 없음.
 * mutation(batchToggleActive 등)은 본 계약 대상이 아니며 기존 fail 처리를 유지한다.
 */
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

export const operatorSupplyApi = {
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
