import { api } from '../../apiClient';
import type {
  SettlementStatus,
  SettlementsResponse,
  SettlementDetail,
  SettlementKpi,
} from '../store.js';
import { SUPPLIER_SETTLEMENTS_LOAD_FAILED, extractApiError, isNotFound } from './errors';

export const supplierSettlementsApi = {
  // Settlement
  async getSettlements(params?: {
    page?: number;
    limit?: number;
    status?: SettlementStatus;
  }): Promise<SettlementsResponse> {
    let response;
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.status) sp.append('status', params.status);
      const qs = sp.toString() ? `?${sp}` : '';

      response = await api.get(`/neture/supplier/settlements${qs}`);
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch settlements:', extractApiError(error));
      throw new Error(SUPPLIER_SETTLEMENTS_LOAD_FAILED);
    }
    const result = response.data;
    if (!Array.isArray(result?.data)) {
      console.warn('[Supplier API] Unexpected settlements payload shape');
      throw new Error(SUPPLIER_SETTLEMENTS_LOAD_FAILED);
    }
    return {
      data: result.data as SettlementsResponse['data'],
      meta: result.meta || { page: 1, limit: 20, total: result.data.length, totalPages: 1 },
    };
  },

  /** null = 미존재(404). 조회 실패는 throw. */
  async getSettlementDetail(id: string): Promise<SettlementDetail | null> {
    let response;
    try {
      response = await api.get(`/neture/supplier/settlements/${id}`);
    } catch (error) {
      if (isNotFound(error)) return null;
      console.warn('[Supplier API] Failed to fetch settlement detail:', extractApiError(error));
      throw new Error(SUPPLIER_SETTLEMENTS_LOAD_FAILED);
    }
    return (response.data?.data as SettlementDetail) ?? null;
  },

  async getSettlementKpi(): Promise<SettlementKpi> {
    let response;
    try {
      response = await api.get('/neture/supplier/settlements/kpi');
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch settlement KPI:', extractApiError(error));
      throw new Error(SUPPLIER_SETTLEMENTS_LOAD_FAILED);
    }
    const result = response.data?.data;
    if (!result || typeof result !== 'object') {
      console.warn('[Supplier API] Unexpected settlement KPI payload shape');
      throw new Error(SUPPLIER_SETTLEMENTS_LOAD_FAILED);
    }
    return result as SettlementKpi;
  },
};
