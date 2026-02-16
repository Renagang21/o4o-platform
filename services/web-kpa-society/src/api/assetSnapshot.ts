/**
 * Asset Snapshot API Client
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
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

interface ListAssetsResponse {
  success: boolean;
  data: AssetSnapshotItem[];
}

export const assetSnapshotApi = {
  /**
   * Copy a source asset to the user's store
   */
  copy: (body: CopyAssetRequest) =>
    apiClient.post<CopyAssetResponse>('/assets/copy', body),

  /**
   * List asset snapshots for the user's store
   */
  list: (assetType?: 'cms' | 'signage') =>
    apiClient.get<ListAssetsResponse>('/assets', assetType ? { assetType } : undefined),
};
