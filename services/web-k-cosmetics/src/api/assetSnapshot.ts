/**
 * Asset Snapshot API Client — K-Cosmetics
 *
 * WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1: Store Asset Control + Channel Map
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 */

import { api } from '../lib/apiClient';
import type { StoreAssetItem, AssetPublishStatus, ChannelMap } from '@o4o/store-asset-policy-core';

export type { StoreAssetItem, AssetPublishStatus, ChannelMap };

// ─── Asset Snapshot Copy (WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1) ───

interface CopyAssetRequest {
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
}

interface CopyAssetResponse {
  success: boolean;
  data: {
    id: string;
    organizationId: string;
    sourceService: string;
    sourceAssetId: string;
    assetType: string;
    title: string;
    contentJson: Record<string, unknown>;
    createdBy: string;
    createdAt: string;
  };
}

// WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1: 내 자료함 콘텐츠 목록 조회
export interface AssetSnapshotItem {
  id: string;
  organizationId: string;
  sourceService: string;
  sourceAssetId: string;
  assetType: string;
  title: string;
  contentJson: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

interface PaginatedAssetSnapshots {
  items: AssetSnapshotItem[];
  total: number;
  page: number;
  limit: number;
}

export const assetSnapshotApi = {
  copy: async (body: CopyAssetRequest) => {
    const res = await api.post('/cosmetics/assets/copy', body);
    return res.data as CopyAssetResponse;
  },

  list: async (params?: { type?: string; page?: number; limit?: number }) => {
    const qp = new URLSearchParams();
    if (params?.type) qp.set('type', params.type);
    if (params?.page) qp.set('page', String(params.page));
    qp.set('limit', String(params?.limit ?? 100));
    const res = await api.get(`/cosmetics/assets?${qp.toString()}`);
    return res.data as { success: boolean; data: PaginatedAssetSnapshots };
  },
};

// ─── Store Asset Control ───────────────────────────

interface PaginatedStoreAssets {
  items: StoreAssetItem[];
  total: number;
  page: number;
  limit: number;
}

export const storeAssetControlApi = {
  list: async (params?: { limit?: number }) => {
    const response = await api.get<{ success: boolean; data: PaginatedStoreAssets }>(
      `/cosmetics/store-assets?limit=${params?.limit ?? 200}`,
    );
    return response.data;
  },

  updatePublishStatus: async (snapshotId: string, status: AssetPublishStatus) => {
    const response = await api.patch<{
      success: boolean;
      data: { snapshotId: string; publishStatus: AssetPublishStatus; updatedAt: string };
    }>(`/cosmetics/store-assets/${snapshotId}/publish`, { status });
    return response.data;
  },

  updateChannelMap: async (snapshotId: string, channelMap: ChannelMap) => {
    const response = await api.patch<{
      success: boolean;
      data: { snapshotId: string; channelMap: ChannelMap; updatedAt: string };
    }>(`/cosmetics/store-assets/${snapshotId}/channel`, { channelMap });
    return response.data;
  },
};
