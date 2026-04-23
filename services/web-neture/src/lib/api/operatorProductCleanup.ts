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
  name: string;
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

  // ── Soft Delete & Recycle Bin (WO-NETURE-APPROVED-PRODUCT-SOFT-DELETE-AND-RECYCLE-BIN-FLOW-V1) ──

  async softDelete(offerId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.post(`${BASE}/soft-delete/${offerId}`, { reason });
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'SOFT_DELETE_FAILED' };
    }
  },

  async getRecycleBin(page = 1, limit = 50): Promise<{ success: boolean; data?: RecycleBinItem[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const res = await api.get(`${BASE}/recycle-bin`, { params: { page, limit } });
      return res.data;
    } catch (error: any) {
      return { success: false };
    }
  },

  async restore(offerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.post(`${BASE}/restore/${offerId}`);
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'RESTORE_FAILED' };
    }
  },

  async hardDelete(offerId: string): Promise<{ success: boolean; error?: string; blockReasons?: string[] }> {
    try {
      const res = await api.delete(`${BASE}/hard-delete/${offerId}`);
      return res.data;
    } catch (error: any) {
      const data = error?.response?.data;
      return { success: false, error: data?.error || 'HARD_DELETE_FAILED', blockReasons: data?.blockReasons };
    }
  },
};

export interface RecycleBinItem {
  id: string;
  master_id: string;
  supplier_id: string;
  approval_status: string;
  price_general: number;
  deleted_at: string;
  deleted_by: string | null;
  delete_reason: string | null;
  name: string;
  barcode: string;
  regulatory_type: string | null;
  supplier_name: string | null;
  deleted_by_name: string | null;
}
