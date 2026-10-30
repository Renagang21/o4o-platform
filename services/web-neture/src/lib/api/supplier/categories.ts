import { SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED, extractApiError } from './errors';
import { api } from '../../apiClient';
import type { RegulatedCategory, SupplierRegulatedCategory } from './business.types';
export { REGULATED_CATEGORY_LABELS, REGULATED_CATEGORY_ORDER, REGULATED_CATEGORY_STATUS_LABELS } from '@o4o/operator-core-ui/modules/supplier-operations';










export const supplierRegulatedCategoryApi = {
  /**
   * WO-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1
   * backend 계약(정적 확인): 정상 미선택은 200 + `[]` 다. 실패만 throw 한다.
   */
  async list(): Promise<SupplierRegulatedCategory[]> {
    let response;
    try {
      response = await api.get('/neture/supplier/regulated-categories');
    } catch (error) {
      console.warn('[Supplier Regulated Category API] Failed to list:', extractApiError(error));
      throw new Error(SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED);
    }
    const rows = response.data?.data;
    if (!Array.isArray(rows)) {
      console.warn('[Supplier Regulated Category API] Unexpected categories payload shape');
      throw new Error(SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED);
    }
    return rows as SupplierRegulatedCategory[];
  },

  async select(
    category: RegulatedCategory,
  ): Promise<{ success: boolean; error?: string; data?: SupplierRegulatedCategory }> {
    try {
      const response = await api.post('/neture/supplier/regulated-categories', { category });
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async remove(category: RegulatedCategory): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/neture/supplier/regulated-categories/${category}`);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  async downloadEvidence(category: RegulatedCategory): Promise<Blob | null> {
    try {
      const response = await api.get(
        `/neture/supplier/regulated-categories/${category}/document/download`,
        {
          responseType: 'blob',
        },
      );
      return response.data as Blob;
    } catch (error) {
      console.warn('[Supplier Regulated Category API] Failed to download evidence:', error);
      return null;
    }
  },
};
