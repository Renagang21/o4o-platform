/**
 * Asset Snapshot API Client — GlycoPharm
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1: commonality verification
 * WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1: updateChannelMap 추가
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 */

import type { StoreAssetItem, AssetPublishStatus, ChannelMap } from '@o4o/store-asset-policy-core';
import { api } from '@/lib/apiClient';

export type { StoreAssetItem, AssetPublishStatus, ChannelMap };

// ─── Asset Snapshot Copy ───────────────────────────

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

export const assetSnapshotApi = {
  copy: async (body: CopyAssetRequest) => {
    const res = await api.post('/glycopharm/assets/copy', body);
    return res.data as CopyAssetResponse;
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
  list: async (params?: { type?: string; limit?: number }) => {
    const qp = new URLSearchParams();
    if (params?.type) qp.set('type', params.type);
    qp.set('limit', String(params?.limit ?? 200));
    const res = await api.get(`/glycopharm/store-assets?${qp.toString()}`);
    return res.data as { success: boolean; data: PaginatedStoreAssets };
  },

  updatePublishStatus: async (snapshotId: string, status: AssetPublishStatus) => {
    const res = await api.patch(`/glycopharm/store-assets/${snapshotId}/publish`, { status });
    return res.data as {
      success: boolean;
      data: { snapshotId: string; publishStatus: AssetPublishStatus; updatedAt: string };
    };
  },

  updateChannelMap: async (snapshotId: string, channelMap: ChannelMap) => {
    const res = await api.patch(`/glycopharm/store-assets/${snapshotId}/channel`, { channelMap });
    return res.data as {
      success: boolean;
      data: { snapshotId: string; channelMap: ChannelMap; updatedAt: string };
    };
  },
};
