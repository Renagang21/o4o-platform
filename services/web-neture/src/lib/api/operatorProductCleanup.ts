/**
 * Operator Product Cleanup API
 *
 * WO-NETURE-PRODUCT-DATA-CLEANUP-V1
 */
import { api } from '../apiClient';

export interface DuplicateMaster {
  barcode: string;
  count: number;
  masterIds: string[];
  names: string[];
}

export interface MissingFieldItem {
  id: string;
  barcode: string;
  marketingName: string;
  manufacturerName: string;
  brandName: string | null;
  regulatoryType: string;
  offerCount: number;
}

const BASE = '/neture/operator/product-cleanup';

export const productCleanupApi = {
  async getDuplicateMasters(): Promise<DuplicateMaster[]> {
    try {
      const res = await api.get(`${BASE}/duplicate-masters`);
      return res.data?.data || [];
    } catch { return []; }
  },

  async getMissingCategory(): Promise<MissingFieldItem[]> {
    try {
      const res = await api.get(`${BASE}/missing-category`);
      return res.data?.data || [];
    } catch { return []; }
  },

  async getMissingBrand(): Promise<MissingFieldItem[]> {
    try {
      const res = await api.get(`${BASE}/missing-brand`);
      return res.data?.data || [];
    } catch { return []; }
  },

  async mergeMasters(sourceMasterId: string, targetMasterId: string): Promise<{ success: boolean; data?: { offersMigrated: number; imagesMigrated: number }; error?: string }> {
    try {
      const res = await api.post(`${BASE}/merge-masters`, { sourceMasterId, targetMasterId });
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'MERGE_FAILED' };
    }
  },

  async fixCategory(masterIds: string[], categoryId: string): Promise<{ success: boolean; data?: { updated: number }; error?: string }> {
    try {
      const res = await api.patch(`${BASE}/fix-category`, { masterIds, categoryId });
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'FIX_FAILED' };
    }
  },

  async fixBrand(masterIds: string[], brandId: string): Promise<{ success: boolean; data?: { updated: number }; error?: string }> {
    try {
      const res = await api.patch(`${BASE}/fix-brand`, { masterIds, brandId });
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'FIX_FAILED' };
    }
  },
};
