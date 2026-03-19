/**
 * Asset Snapshot API Client — Neture
 *
 * WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1
 */

import { api } from '../apiClient';

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
    const res = await api.post('/neture/assets/copy', body);
    return res.data as CopyAssetResponse;
  },
};
