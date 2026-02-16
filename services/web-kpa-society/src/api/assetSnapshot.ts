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
