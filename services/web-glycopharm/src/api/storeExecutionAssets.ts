/**
 * Store Execution Assets API Client — GlycoPharm
 *
 * WO-O4O-STORE-EXECUTION-ASSETS-CROSSSERVICE-PHASE2-D-V1
 *
 * GET /api/v1/glycopharm/store/assets
 */

import { api } from '@/lib/apiClient';

export type AssetType = 'file' | 'content' | 'external-link';
export type UsageType = 'pop' | 'qr' | 'signage' | 'banner' | 'notice';

export interface StoreExecutionAsset {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  category: string | null;
  assetType: AssetType;
  usageType: UsageType | null;
  url: string | null;
  htmlContent: string | null;
  sourceType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreAssetPaginatedResponse {
  items: StoreExecutionAsset[];
  page: number;
  limit: number;
  total: number;
}

export async function getStoreExecutionAssets(opts?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  usageType?: UsageType;
}): Promise<{ success: boolean; data: StoreAssetPaginatedResponse }> {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.search) params.set('search', opts.search);
  if (opts?.category && opts.category !== 'all') params.set('category', opts.category);
  if (opts?.usageType) params.set('usage_type', opts.usageType);
  const qs = params.toString();
  const res = await api.get(`/glycopharm/store/assets${qs ? `?${qs}` : ''}`);
  return res.data as { success: boolean; data: StoreAssetPaginatedResponse };
}
