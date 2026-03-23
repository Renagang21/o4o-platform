/**
 * Dashboard Copy API Client — Neture
 *
 * WO-O4O-CONTENT-LIBRARY-TO-MY-CONTENT-V1
 *
 * POST /api/v1/dashboard/assets/copy
 * GET  /api/v1/dashboard/assets/copied-source-ids
 */

import { api } from '../apiClient';

export type DashboardAssetSourceType = 'content' | 'signage_media' | 'signage_playlist' | 'hub_content';

export interface CopyAssetRequest {
  sourceType: DashboardAssetSourceType;
  sourceId: string;
  targetDashboardId: string;
}

export interface CopyAssetResponse {
  success: boolean;
  dashboardAssetId: string;
  status: 'draft';
  sourceType: DashboardAssetSourceType;
  sourceId: string;
}

export const dashboardCopyApi = {
  async copyAsset(request: CopyAssetRequest): Promise<CopyAssetResponse> {
    const res = await api.post<CopyAssetResponse>('/dashboard/assets/copy', request);
    return res.data;
  },

  async getCopiedSourceIds(dashboardId: string): Promise<string[]> {
    const res = await api.get<{ success: boolean; sourceIds: string[] }>(
      `/dashboard/assets/copied-source-ids?dashboardId=${encodeURIComponent(dashboardId)}`
    );
    return res.data.sourceIds || [];
  },
};
