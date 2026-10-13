import { api } from '../../apiClient';
import type {
  SupplierLibraryItemsResult,
  SupplierLibraryItem,
  SupplierLibraryHandoffTarget,
  SupplierLibraryHandoffResult,
} from './library.types';
import {
  SUPPLIER_LIBRARY_ITEMS_LOAD_FAILED,
  SUPPLIER_LIBRARY_ITEM_LOAD_FAILED,
  SUPPLIER_LIBRARY_ITEM_NOT_FOUND,
  extractApiError,
} from './errors';

export const supplierLibraryApi = {
  // Library API
  /**
   * WO-O4O-NETURE-SUPPLIER-LIBRARY-LOAD-ERROR-CONTRACT-V1
   *
   * backend 계약(정적 확인): `{ success, data: { items, total } }`.
   *   `neture-library.service.ts:62` — limit 상한 100 (`Math.min(limit || 20, 100)`).
   *   정상 빈 목록은 `items: []` 다.
   * 조회 실패는 고정 코드로 throw 하고, 소비처가 "총 건수" 로 조회 범위를
   * 판단할 수 있도록 `total` 을 함께 반환한다.
   */
  async getLibraryItems(opts?: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<SupplierLibraryItemsResult> {
    let response;
    try {
      const params = new URLSearchParams();
      if (opts?.category) params.append('category', opts.category);
      if (opts?.page) params.append('page', String(opts.page));
      if (opts?.limit) params.append('limit', String(opts.limit));
      const query = params.toString();
      response = await api.get(`/neture/library${query ? `?${query}` : ''}`);
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch library items:', extractApiError(error));
      throw new Error(SUPPLIER_LIBRARY_ITEMS_LOAD_FAILED);
    }
    const result = response.data;
    if (!result?.success || !Array.isArray(result.data?.items)) {
      console.warn('[Supplier API] Unexpected library payload shape');
      throw new Error(SUPPLIER_LIBRARY_ITEMS_LOAD_FAILED);
    }
    // total 은 보조 필드다. 누락되어도 목록 자체는 유효하므로 실패로 보지 않는다.
    const items = result.data.items as SupplierLibraryItem[];
    return {
      items,
      total: typeof result.data.total === 'number' ? result.data.total : items.length,
    };
  },

  /**
   * WO-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1
   *
   * 수정 화면 전용 단건 조회. 목록(limit 100) 순회를 대체한다.
   * backend 계약: 200 + data / 404 ITEM_NOT_FOUND(미존재·타인 소유) / 500.
   * 404 만 NOT_FOUND 로 구분하고 그 외 실패는 LOAD_FAILED 로 전파한다.
   */
  async getLibraryItem(id: string): Promise<SupplierLibraryItem> {
    let response;
    try {
      response = await api.get(`/neture/library/${encodeURIComponent(id)}`);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      console.warn('[Supplier API] Failed to fetch library item:', extractApiError(error));
      throw new Error(
        status === 404 ? SUPPLIER_LIBRARY_ITEM_NOT_FOUND : SUPPLIER_LIBRARY_ITEM_LOAD_FAILED,
      );
    }
    const data = response.data?.data;
    if (!response.data?.success || !data || typeof data !== 'object') {
      console.warn('[Supplier API] Unexpected library item payload shape');
      throw new Error(SUPPLIER_LIBRARY_ITEM_LOAD_FAILED);
    }
    return data as SupplierLibraryItem;
  },

  async createLibraryItem(data: {
    title: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    category?: string;
    isPublic?: boolean;
    contentType?: string;
    blocks?: Record<string, unknown>[];
  }): Promise<{ success: boolean; error?: string; data?: SupplierLibraryItem }> {
    try {
      const response = await api.post('/neture/library', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async updateLibraryItem(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      category?: string | null;
      isPublic?: boolean;
      contentType?: string;
      blocks?: Record<string, unknown>[];
    },
  ): Promise<{ success: boolean; error?: string; data?: SupplierLibraryItem }> {
    try {
      const response = await api.patch(`/neture/library/${id}`, data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async deleteLibraryItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/neture/library/${id}`);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  /**
   * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1
   *
   * Supplier → Service Operator 제공 경로 (ROLE-WORKSPACE-ARCHITECTURE §2-1).
   * 대상 서비스는 backend 가 canonical catalog 에서 계산한다 (프론트 하드코딩 없음).
   * 제공 후 검토·수정·발행은 해당 서비스 운영자 업무 — 공급자 책임은 여기서 끝난다.
   */
  async getLibraryHandoffTargets(): Promise<SupplierLibraryHandoffTarget[]> {
    try {
      const response = await api.get('/neture/library/handoff-targets');
      const data = response.data?.data;
      return Array.isArray(data) ? (data as SupplierLibraryHandoffTarget[]) : [];
    } catch (error) {
      console.warn(
        '[Supplier API] Failed to fetch library handoff targets:',
        extractApiError(error),
      );
      return [];
    }
  },

  async handoffLibraryItem(
    id: string,
    serviceKey: string,
  ): Promise<{ success: boolean; error?: string; data?: SupplierLibraryHandoffResult }> {
    try {
      const response = await api.post(`/neture/library/${encodeURIComponent(id)}/handoff`, {
        serviceKey,
      });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },
};
