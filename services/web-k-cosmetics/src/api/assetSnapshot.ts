/**
 * Asset Snapshot API Client — K-Cosmetics
 *
 * WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1: Store Asset Control + Channel Map
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 */

import { api } from '../lib/apiClient';
import type { StoreAssetItem, AssetPublishStatus, ChannelMap } from '@o4o/store-asset-policy-core';

export type { StoreAssetItem, AssetPublishStatus, ChannelMap };

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
