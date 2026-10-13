import { api } from '../../apiClient';
import type {
  SupplierOnboardingDocumentType,
  SupplierOnboardingDocument,
  SupplierOnboarding,
} from './business.types';
import { SUPPLIER_ONBOARDING_LOAD_FAILED, extractApiError } from './errors';

// ==================== Supplier Onboarding API ====================

export const supplierOnboardingApi = {
  /**
   * WO-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1
   *
   * backend 계약(정적 확인): 정상이면 **항상 200 + data 객체** 를 반환한다.
   *   `supplier-onboarding.service.ts:74` — supplier row 를 매핑해 반환하며
   *   "온보딩 미시작" 이라는 별도 null 상태가 없다(필드가 비어 있을 뿐).
   *   404 `SUPPLIER_NOT_FOUND` 는 공급자 row 부재 = 오류 상태다.
   * 따라서 null 반환 경로를 없애고 실패는 고정 코드로 throw 한다.
   */
  async getOnboarding(): Promise<SupplierOnboarding> {
    let response;
    try {
      response = await api.get('/neture/supplier/onboarding');
    } catch (error) {
      console.warn('[Supplier Onboarding API] Failed to fetch onboarding:', extractApiError(error));
      throw new Error(SUPPLIER_ONBOARDING_LOAD_FAILED);
    }
    const data = response.data?.data;
    if (!data || typeof data !== 'object') {
      console.warn('[Supplier Onboarding API] Unexpected onboarding payload shape');
      throw new Error(SUPPLIER_ONBOARDING_LOAD_FAILED);
    }
    return data as SupplierOnboarding;
  },

  async updateOnboarding(data: {
    taxInvoiceEmail?: string;
    settlementBankName?: string;
    settlementAccountNumber?: string;
    settlementAccountHolder?: string;
    settlementContactName?: string;
    settlementContactEmail?: string;
    mailOrderSalesStatus?: string;
    mailOrderSalesRegistrationNumber?: string;
  }): Promise<{ success: boolean; error?: string; data?: SupplierOnboarding }> {
    try {
      const response = await api.patch('/neture/supplier/onboarding', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async uploadDocument(
    documentType: SupplierOnboardingDocumentType,
    file: File,
  ): Promise<{ success: boolean; error?: string; data?: SupplierOnboardingDocument }> {
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post(`/neture/supplier/documents/${documentType}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async downloadDocument(documentType: SupplierOnboardingDocumentType): Promise<Blob | null> {
    try {
      const response = await api.get(`/neture/supplier/documents/${documentType}/download`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch (error) {
      console.warn('[Supplier Onboarding API] Failed to download document:', error);
      return null;
    }
  },
};
