/**
 * Dashboard API
 *
 * WO-APP-DATA-HUB-COPY-PHASE2A-V1
 *
 * 대시보드 자산 복사 API 클라이언트
 */

import { getAccessToken } from '../contexts/AuthContext';

// Dashboard API는 /api/v1/dashboard/assets 경로
const DASHBOARD_API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';

async function dashboardApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const url = `${DASHBOARD_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.error?.message || error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export type DashboardAssetSourceType = 'content' | 'signage_media' | 'signage_playlist';

/**
 * Copy options (Phase 2-B)
 */
export type TitleMode = 'keep' | 'edit';
export type DescriptionMode = 'keep' | 'empty';
export type TemplateType = 'info' | 'promo' | 'guide';

export interface CopyOptions {
  titleMode?: TitleMode;
  title?: string;
  descriptionMode?: DescriptionMode;
  templateType?: TemplateType;
}

export interface CopyAssetRequest {
  sourceType: DashboardAssetSourceType;
  sourceId: string;
  targetDashboardId: string;
  options?: CopyOptions;
}

export interface CopyAssetResponse {
  success: boolean;
  dashboardAssetId: string;
  status: 'draft';
  sourceType: DashboardAssetSourceType;
  sourceId: string;
}

export interface DashboardAsset {
  id: string;
  title: string;
  type: string;
  status: 'draft' | 'active';
  sourceContentId?: string;
  copiedAt?: string;
  createdAt: string;
}

/**
 * Dashboard API client
 */
export const dashboardApi = {
  /**
   * Copy content to my dashboard
   */
  async copyAsset(request: CopyAssetRequest): Promise<CopyAssetResponse> {
    return dashboardApiRequest<CopyAssetResponse>('/dashboard/assets/copy', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * List my dashboard assets
   */
  async listAssets(dashboardId: string, params?: {
    sourceType?: DashboardAssetSourceType;
    status?: 'draft' | 'active';
  }): Promise<{ success: boolean; data: DashboardAsset[] }> {
    const queryParams = new URLSearchParams({ dashboardId });
    if (params?.sourceType) queryParams.set('sourceType', params.sourceType);
    if (params?.status) queryParams.set('status', params.status);

    return dashboardApiRequest<{ success: boolean; data: DashboardAsset[] }>(
      `/dashboard/assets?${queryParams.toString()}`
    );
  },
};
