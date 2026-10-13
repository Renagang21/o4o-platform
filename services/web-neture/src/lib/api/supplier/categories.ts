import { api } from '../../apiClient';
import type {
  RegulatedCategory,
  RegulatedCategoryStatus,
  SupplierRegulatedCategory,
} from './business.types';
import { SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED, extractApiError } from './errors';

export const REGULATED_CATEGORY_LABELS: Record<RegulatedCategory, string> = {
  general: '일반 상품',
  pharmaceutical: '의약품',
  quasi_drug: '의약외품',
  medical_device: '의료기기',
  health_functional_food: '건강기능식품',
  food: '식품',
  cosmetics: '화장품',
  other_regulated: '기타 법정 관리 품목',
};

export const REGULATED_CATEGORY_ORDER: RegulatedCategory[] = [
  'general',
  'pharmaceutical',
  'quasi_drug',
  'medical_device',
  'health_functional_food',
  'food',
  'cosmetics',
  'other_regulated',
];

export const REGULATED_CATEGORY_STATUS_LABELS: Record<RegulatedCategoryStatus, string> = {
  not_requested: '미신청',
  submitted: '서류 제출',
  approved: '등록 가능',
  rejected: '반려',
  needs_update: '보완 필요',
  suspended: '사용 제한',
};

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
