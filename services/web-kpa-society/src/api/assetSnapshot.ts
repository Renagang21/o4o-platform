/**
 * Asset Snapshot API Client
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 * WO-KPA-A-ASSET-COPY-STABILIZATION-V1 (pagination)
 */

import { apiClient } from './client';

export interface AssetSnapshotItem {
  id: string;
  organizationId: string;
  sourceService: string;
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
  title: string;
  contentJson: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

interface CopyAssetRequest {
  sourceService: string;
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
}

interface CopyAssetResponse {
  success: boolean;
  data: AssetSnapshotItem;
}

export interface PaginatedAssets {
  items: AssetSnapshotItem[];
  total: number;
  page: number;
  limit: number;
}

interface ListAssetsResponse {
  success: boolean;
  data: PaginatedAssets;
}

export const assetSnapshotApi = {
  /**
   * Copy a source asset to the user's store
   */
  copy: (body: CopyAssetRequest) =>
    apiClient.post<CopyAssetResponse>('/assets/copy', body),

  /**
   * List asset snapshots for the user's store (paginated)
   */
  list: (params?: { type?: 'cms' | 'signage'; page?: number; limit?: number }) => {
    const query: Record<string, string> = {};
    if (params?.type) query.type = params.type;
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    return apiClient.get<ListAssetsResponse>('/assets', Object.keys(query).length > 0 ? query : undefined);
  },
};

// ─────────────────────────────────────────────────────
// Store Asset Control — WO-KPA-A-ASSET-CONTROL-EXTENSION-V1
// Extension layer: publish status management
// ─────────────────────────────────────────────────────

export type AssetPublishStatus = 'draft' | 'published' | 'hidden';

export interface StoreAssetItem {
  id: string;
  organizationId: string;
  sourceService: string;
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
  title: string;
  createdBy: string;
  createdAt: string;
  publishStatus: AssetPublishStatus;
  controlId: string | null;
  controlUpdatedAt: string | null;
}

export interface PaginatedStoreAssets {
  items: StoreAssetItem[];
  total: number;
  page: number;
  limit: number;
}

export const storeAssetControlApi = {
  /**
   * List store assets with publish status (joined with control table)
   */
  list: (params?: { type?: 'cms' | 'signage'; page?: number; limit?: number }) => {
    const query: Record<string, string> = {};
    if (params?.type) query.type = params.type;
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    return apiClient.get<{ success: boolean; data: PaginatedStoreAssets }>(
      '/store-assets',
      Object.keys(query).length > 0 ? query : undefined,
    );
  },

  /**
   * Update publish status of an asset snapshot
   */
  updatePublishStatus: (snapshotId: string, status: AssetPublishStatus) =>
    apiClient.patch<{
      success: boolean;
      data: { snapshotId: string; publishStatus: AssetPublishStatus; updatedAt: string };
    }>(`/store-assets/${snapshotId}/publish`, { status }),
};
