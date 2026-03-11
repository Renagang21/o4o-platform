/**
 * Asset Snapshot API Client — K-Cosmetics
 *
 * WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1: Store Asset Control + Channel Map
 */

import type { StoreAssetItem, AssetPublishStatus, ChannelMap } from '@o4o/store-asset-policy-core';

export type { StoreAssetItem, AssetPublishStatus, ChannelMap };

const API_URL = import.meta.env.VITE_API_URL || 'https://api.o4o.world';

async function getAuthToken(): Promise<string | null> {
  try {
    const authData = localStorage.getItem('auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.accessToken || parsed.token || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

interface PaginatedStoreAssets {
  items: StoreAssetItem[];
  total: number;
  page: number;
  limit: number;
}

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/cosmetics${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers as Record<string, string> },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const storeAssetControlApi = {
  list: (params?: { limit?: number }) =>
    authFetch<{ success: boolean; data: PaginatedStoreAssets }>(
      `/store-assets?limit=${params?.limit ?? 200}`,
    ),

  updatePublishStatus: (snapshotId: string, status: AssetPublishStatus) =>
    authFetch<{
      success: boolean;
      data: { snapshotId: string; publishStatus: AssetPublishStatus; updatedAt: string };
    }>(`/store-assets/${snapshotId}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateChannelMap: (snapshotId: string, channelMap: ChannelMap) =>
    authFetch<{
      success: boolean;
      data: { snapshotId: string; channelMap: ChannelMap; updatedAt: string };
    }>(`/store-assets/${snapshotId}/channel`, {
      method: 'PATCH',
      body: JSON.stringify({ channelMap }),
    }),
};
