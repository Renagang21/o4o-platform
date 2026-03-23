/**
 * Operator Brand API
 *
 * WO-NETURE-BRAND-MANAGEMENT-V1
 * 운영자 브랜드 조회/수정/병합
 */
import { api } from '../apiClient';

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  manufacturer_name: string | null;
  country_of_origin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  productCount: number;
}

export const operatorBrandApi = {
  /** 브랜드 목록 (검색 + 상품 수) */
  async getBrands(search?: string): Promise<BrandItem[]> {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/neture/operator/brands${params}`);
      return res.data?.data || [];
    } catch (error) {
      console.warn('[Brand API] Failed to fetch brands:', error);
      return [];
    }
  },

  /** 브랜드 이름 수정 */
  async updateBrand(id: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.patch(`/neture/operator/brands/${id}`, { name });
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'UPDATE_FAILED' };
    }
  },

  /** 브랜드 병합 (source → target) */
  async mergeBrands(sourceBrandId: string, targetBrandId: string): Promise<{ success: boolean; data?: { merged: number }; error?: string }> {
    try {
      const res = await api.post('/neture/operator/brands/merge', { sourceBrandId, targetBrandId });
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'MERGE_FAILED' };
    }
  },
};
