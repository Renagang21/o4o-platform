/**
 * Asset Snapshot API Client — GlycoPharm
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1: commonality verification
 * WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1: updateChannelMap 추가
 */

import type { StoreAssetItem, AssetPublishStatus, ChannelMap } from '@o4o/store-asset-policy-core';
import { getAccessToken } from '@/contexts/AuthContext';

export type { StoreAssetItem, AssetPublishStatus, ChannelMap };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface PaginatedStoreAssets {
  items: StoreAssetItem[];
  total: number;
  page: number;
  limit: number;
}

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const storeAssetControlApi = {
  list: (params?: { limit?: number }) =>
    authFetch<{ success: boolean; data: PaginatedStoreAssets }>(
      `/api/v1/glycopharm/store-assets?limit=${params?.limit ?? 200}`,
    ),

  updatePublishStatus: (snapshotId: string, status: AssetPublishStatus) =>
    authFetch<{
      success: boolean;
      data: { snapshotId: string; publishStatus: AssetPublishStatus; updatedAt: string };
    }>(`/api/v1/glycopharm/store-assets/${snapshotId}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateChannelMap: (snapshotId: string, channelMap: ChannelMap) =>
    authFetch<{
      success: boolean;
      data: { snapshotId: string; channelMap: ChannelMap; updatedAt: string };
    }>(`/api/v1/glycopharm/store-assets/${snapshotId}/channel`, {
      method: 'PATCH',
      body: JSON.stringify({ channelMap }),
    }),
};
