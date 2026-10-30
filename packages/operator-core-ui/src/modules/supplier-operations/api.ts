import type { AxiosInstance } from 'axios';
import type { AdminSupplier, SupplierApproveResult, SupplierGovernanceResult, GovernanceSupplier, SupplierPagedResult, SupplierBatchResultItem, RegulatedCategory, RegulatedCategoryStatus, SupplierRegulatedCategory } from './types';


export function createSupplierOperatorApi(api: AxiosInstance) {
const adminSupplierApi = {
  async getSuppliers(status?: string): Promise<AdminSupplier[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await api.get(`/neture/admin/suppliers${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Admin API] Failed to fetch suppliers:', error);
      return [];
    }
  },

  // §5: 상태 관리(governance) 목록 — ACTIVE/INACTIVE + 최근 변경/주문·정산 지표.
  async getGovernanceSuppliers(): Promise<GovernanceSupplier[]> {
    try {
      const response = await api.get('/neture/admin/suppliers/governance');
      if (!Array.isArray(response.data.data)) throw new Error('Invalid governance list');
      return response.data.data;
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      throw new Error('공급자 상태 목록을 불러오지 못했습니다. 다시 시도해 주세요.');
    }
  },

  // §6: 사유 필수. 진행 주문·미정산·정산 진행 시 backend 가 409 로 차단(강제 override 없음).
  async deactivateSupplier(id: string, reason: string): Promise<SupplierGovernanceResult> {
    try {
      await api.post(`/neture/admin/suppliers/${id}/deactivate`, { reason });
      return { success: true };
    } catch (error: any) {
      const err = error?.response?.data?.error;
      if (error?.response?.status === 409 && err?.code === 'SUPPLIER_DEACTIVATION_BLOCKED') {
        return {
          success: false,
          code: err.code,
          message: err.message,
          blocked: {
            activeOrderCount: err.activeOrderCount ?? 0,
            unsettledCount: err.unsettledCount ?? 0,
            settlementInProgressCount: err.settlementInProgressCount ?? 0,
          },
        };
      }
      return { success: false, code: err?.code, message: err?.message };
    }
  },

  // §7: 재활성화(INACTIVE → ACTIVE). 사유 필수. 접근 상태만 복구.
  async reactivateSupplier(id: string, reason: string): Promise<SupplierGovernanceResult> {
    try {
      await api.post(`/neture/admin/suppliers/${id}/reactivate`, { reason });
      return { success: true };
    } catch (error: any) {
      const err = error?.response?.data?.error;
      return { success: false, code: err?.code, message: err?.message };
    }
  },

  async downloadDocument(id: string, documentType: 'business_registration' | 'bank_statement' | 'mail_order_report'): Promise<Blob | null> {
    try {
      const response = await api.get(`/neture/admin/suppliers/${id}/documents/${documentType}/download`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch {
      return null;
    }
  },

  // WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
  async listRegulatedCategories(id: string): Promise<SupplierRegulatedCategory[]> {
    const response = await api.get(`/neture/admin/suppliers/${id}/regulated-categories`);
    return response.data?.data ?? [];
  },

  async reviewRegulatedCategory(
    id: string,
    category: RegulatedCategory,
    body: { status: RegulatedCategoryStatus; reviewNote?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/neture/admin/suppliers/${id}/regulated-categories/${category}`, body);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error?.code || 'REVIEW_FAILED' };
    }
  },

  async downloadRegulatedEvidence(id: string, category: RegulatedCategory): Promise<Blob | null> {
    try {
      const response = await api.get(`/neture/admin/suppliers/${id}/regulated-categories/${category}/document/download`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch {
      return null;
    }
  },
};

const operatorSupplierApi = {
  async getSuppliers(status?: string): Promise<AdminSupplier[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await api.get(`/neture/operator/suppliers${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Operator API] Failed to fetch suppliers:', error);
      throw error;
    }
  },

  // O4O 표준 리스트용 paged 조회. 조회 실패는 빈 배열로 은폐하지 않고 throw 하여
  // useStandardListQuery.error 로 전달한다(WO 8.3).
  async getSuppliersPaged(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<SupplierPagedResult> {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', String(params.page));
    if (params.limit) sp.append('limit', String(params.limit));
    if (params.search) sp.append('search', params.search);
    if (params.status && params.status !== 'all') sp.append('status', params.status);
    if (params.sortBy) sp.append('sortBy', params.sortBy);
    if (params.sortOrder) sp.append('sortOrder', params.sortOrder);
    const qs = sp.toString();
    const response = await api.get(`/neture/operator/suppliers/list${qs ? `?${qs}` : ''}`);
    return response.data.data;
  },

  // 일괄 승인/거절. useBatchAction.executeBatch 가 res.data.results 를 읽도록 본문(response.data)을 반환.
  async batchProcess(
    ids: string[],
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<{ success: boolean; data: { results: SupplierBatchResultItem[] } }> {
    const response = await api.post('/neture/operator/suppliers/batch', { ids, action, reason });
    return response.data;
  },

  async getPendingSuppliers(): Promise<AdminSupplier[]> {
    try {
      const response = await api.get('/neture/operator/suppliers/pending');
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Operator API] Failed to fetch pending suppliers:', error);
      throw error;
    }
  },

  async approveSupplier(id: string): Promise<SupplierApproveResult> {
    try {
      await api.post(`/neture/operator/suppliers/${id}/approve`);
      return { success: true };
    } catch (error: any) {
      const err = error?.response?.data?.error;
      return { success: false, code: err?.code, missingFields: err?.missingFields ?? [] };
    }
  },

  async rejectSupplier(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/operator/suppliers/${id}/reject`, { reason });
      return true;
    } catch { return false; }
  },

  // WO-O4O-NETURE-OPERATOR-SUPPLIER-BASIC-INFO-COMPLETION-V1:
  // 운영자가 승인 전 미흡한 기본 정보를 직접 보완/수정. 저장 후 화면은 목록 refetch 로
  // 갱신된 activationReady/missingActivationFields 를 재수신한다(프론트 재계산 금지).
  async updateBasicInfo(
    id: string,
    data: Partial<{
      representativeName: string;
      managerName: string;
      managerPhone: string;
      businessNumber: string;
      taxInvoiceEmail: string;
    }>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/neture/operator/suppliers/${id}`, data);
      return { success: !!response.data?.success };
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error?.code || 'UPDATE_FAILED' };
    }
  },

  async downloadDocument(id: string, documentType: 'business_registration' | 'bank_statement' | 'mail_order_report'): Promise<Blob | null> {
    try {
      const response = await api.get(`/neture/operator/suppliers/${id}/documents/${documentType}/download`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch {
      return null;
    }
  },

  // WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
  async listRegulatedCategories(id: string): Promise<SupplierRegulatedCategory[]> {
    const response = await api.get(`/neture/operator/suppliers/${id}/regulated-categories`);
    return response.data?.data ?? [];
  },

  async reviewRegulatedCategory(
    id: string,
    category: RegulatedCategory,
    body: { status: RegulatedCategoryStatus; reviewNote?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/neture/operator/suppliers/${id}/regulated-categories/${category}`, body);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error?.code || 'REVIEW_FAILED' };
    }
  },

  async downloadRegulatedEvidence(id: string, category: RegulatedCategory): Promise<Blob | null> {
    try {
      const response = await api.get(`/neture/operator/suppliers/${id}/regulated-categories/${category}/document/download`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch {
      return null;
    }
  },
};
return { operatorSupplierApi, adminSupplierApi };
}
