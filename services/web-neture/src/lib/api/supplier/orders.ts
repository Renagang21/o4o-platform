import { api } from '../../apiClient';
import type {
  OrderSummaryResponse,
  UnifiedSupplierOrder,
  UnifiedOrdersResponse,
} from './orders.types';
import type { StoreOrder, SupplierOrdersResponse, SupplierOrderKpi } from '../store.js';
import { SUPPLIER_ORDERS_LOAD_FAILED, extractApiError, isNotFound } from './errors';

export const supplierOrdersApi = {
  async getOrdersSummary(): Promise<OrderSummaryResponse> {
    let response;
    try {
      response = await api.get('/neture/supplier/orders/summary');
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch orders summary:', extractApiError(error));
      throw new Error(SUPPLIER_ORDERS_LOAD_FAILED);
    }
    const result = response.data?.data;
    if (!result || typeof result !== 'object' || !Array.isArray(result.services)) {
      console.warn('[Supplier API] Unexpected orders summary payload shape');
      throw new Error(SUPPLIER_ORDERS_LOAD_FAILED);
    }
    return result as OrderSummaryResponse;
  },

  // Order Management
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<SupplierOrdersResponse> {
    let response;
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      const qs = searchParams.toString();
      response = await api.get(`/neture/supplier/orders${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch orders:', extractApiError(error));
      throw new Error(SUPPLIER_ORDERS_LOAD_FAILED);
    }
    const result = response.data;
    if (!Array.isArray(result?.data)) {
      console.warn('[Supplier API] Unexpected orders payload shape');
      throw new Error(SUPPLIER_ORDERS_LOAD_FAILED);
    }
    // meta 는 성공 응답의 보조 필드다. 누락 시에도 목록 자체는 유효하므로 기본값을 유지한다.
    return {
      data: result.data as SupplierOrdersResponse['data'],
      meta: result.meta || { page: 1, limit: 20, total: result.data.length, totalPages: 1 },
    };
  },

  // WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1: neture_orders + checkout_orders 통합 조회(읽기)
  async getUnifiedOrders(params?: {
    page?: number;
    limit?: number;
    source?: 'neture' | 'checkout' | 'all';
  }): Promise<UnifiedOrdersResponse> {
    let response;
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.source) searchParams.set('source', params.source);
      const qs = searchParams.toString();
      response = await api.get(`/neture/supplier/orders/unified${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch unified orders:', extractApiError(error));
      throw new Error(SUPPLIER_ORDERS_LOAD_FAILED);
    }
    const result = response.data;
    if (!Array.isArray(result?.data)) {
      console.warn('[Supplier API] Unexpected unified orders payload shape');
      throw new Error(SUPPLIER_ORDERS_LOAD_FAILED);
    }
    return {
      data: result.data as UnifiedSupplierOrder[],
      meta: result.meta || { page: 1, limit: 20, total: result.data.length, totalPages: 1 },
    };
  },

  /** null = 미존재(404). 조회 실패는 throw — "없음" 과 "실패" 를 분리한다. */
  async getOrderById(id: string): Promise<StoreOrder | null> {
    let response;
    try {
      response = await api.get(`/neture/supplier/orders/${id}`);
    } catch (error) {
      if (isNotFound(error)) return null;
      console.warn('[Supplier API] Failed to fetch order detail:', extractApiError(error));
      throw new Error(SUPPLIER_ORDERS_LOAD_FAILED);
    }
    return (response.data?.data as StoreOrder) ?? null;
  },

  async updateOrderStatus(
    id: string,
    status: string,
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await api.patch(`/neture/supplier/orders/${id}/status`, { status });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async getOrderKpi(): Promise<SupplierOrderKpi> {
    let response;
    try {
      response = await api.get('/neture/supplier/orders/kpi');
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch order KPI:', extractApiError(error));
      throw new Error(SUPPLIER_ORDERS_LOAD_FAILED);
    }
    const result = response.data?.data;
    if (!result || typeof result !== 'object') {
      console.warn('[Supplier API] Unexpected order KPI payload shape');
      throw new Error(SUPPLIER_ORDERS_LOAD_FAILED);
    }
    return result as SupplierOrderKpi;
  },
};
