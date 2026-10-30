import type { AxiosInstance } from 'axios';
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
export interface TrashPreview { count: number; cutoff: string; fingerprint: string }
export interface EmptyTrashResult { deleted: number; blocked: {id: string; reason: string}[] }
export function createOperatorProductCleanupApi(api: AxiosInstance) {
async function mutation<T>(path: string, payload: unknown): Promise<T> {
  try {
    const res = await api.post(`${BASE}/${path}`, payload);
    if (!res.data?.success) throw new Error(res.data?.message || '요청에 실패했습니다.');
    return res.data.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error?.message || '요청에 실패했습니다.');
  }
}
const productCleanupApi = {
  batchSoftDelete: (ids: string[]) => mutation<{moved: number}>('batch-soft-delete', {ids}),
  previewEmptyTrash: () => mutation<TrashPreview>('empty-trash/preview', {}),
  emptyTrash: (preview: TrashPreview) => mutation<EmptyTrashResult>('empty-trash/execute', preview),
  async getDuplicateMasters(): Promise<DuplicateMaster[]> {
    const res = await api.get(`${BASE}/duplicate-masters`);
    if (!res.data?.success || !Array.isArray(res.data.data)) throw new Error('목록을 불러오지 못했습니다.');
    return res.data.data;
  },

  async getMissingCategory(): Promise<MissingFieldItem[]> {
    const res = await api.get(`${BASE}/missing-category`);
    if (!res.data?.success || !Array.isArray(res.data.data)) throw new Error('목록을 불러오지 못했습니다.');
    return res.data.data;
  },

  async getMissingBrand(): Promise<MissingFieldItem[]> {
    const res = await api.get(`${BASE}/missing-brand`);
    if (!res.data?.success || !Array.isArray(res.data.data)) throw new Error('목록을 불러오지 못했습니다.');
    return res.data.data;
  },

  async mergeMasters(sourceMasterId: string, targetMasterId: string, reason: string): Promise<{ success: boolean; data?: { offersMigrated: number; imagesMigrated: number }; error?: string }> {
    try {
      const res = await api.post(`${BASE}/merge-masters`, { sourceMasterId, targetMasterId, reason });
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
    const res = await api.get(`${BASE}/recycle-bin`, { params: { page, limit } });
    if (!res.data?.success || !Array.isArray(res.data.data) || !res.data.pagination) throw new Error('휴지통을 불러오지 못했습니다.');
    return res.data;
  },

  async restore(offerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.post(`${BASE}/restore/${offerId}`);
      return res.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'RESTORE_FAILED' };
    }
  },

  async hardDelete(offerId: string, reason?: string): Promise<{ success: boolean; error?: string; blockReasons?: string[] }> {
    try {
      const res = await api.delete(`${BASE}/hard-delete/${offerId}`, { data: { reason } });
      return res.data;
    } catch (error: any) {
      const data = error?.response?.data;
      return { success: false, error: data?.message || data?.error || 'HARD_DELETE_FAILED', blockReasons: data?.blockReasons };
    }
  },
};
return {productCleanupApi};
}
