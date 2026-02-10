/**
 * Dashboard API
 *
 * WO-APP-DATA-HUB-COPY-PHASE2A-V1
 * WO-APP-DATA-HUB-TO-DASHBOARD-PHASE3-V1: 자산 관리 API 추가
 * WO-APP-DASHBOARD-KPI-PHASE4A-V1: KPI + 정렬 API 추가
 *
 * 대시보드 자산 복사 + 관리 API 클라이언트
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
  description?: string | null;
  type: string;
  status: 'draft' | 'active' | 'archived';
  sourceContentId?: string;
  copiedAt?: string;
  createdAt: string;
  viewCount?: number;
  recommendCount?: number;
  exposure?: string[];
}

export type DashboardSortType = 'recent' | 'views' | 'recommend';

export interface DashboardKpi {
  totalAssets: number;
  activeAssets: number;
  recentViewsSum: number;
  topRecommended: { id: string; title: string; recommendCount: number } | null;
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
    status?: 'draft' | 'active' | 'archived';
    sort?: DashboardSortType;
  }): Promise<{ success: boolean; data: DashboardAsset[] }> {
    const queryParams = new URLSearchParams({ dashboardId });
    if (params?.sourceType) queryParams.set('sourceType', params.sourceType);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.sort) queryParams.set('sort', params.sort);

    return dashboardApiRequest<{ success: boolean; data: DashboardAsset[] }>(
      `/dashboard/assets?${queryParams.toString()}`
    );
  },

  /**
   * Phase 4A: KPI 요약 데이터 조회
   */
  async getKpi(dashboardId: string): Promise<{ success: boolean; data: DashboardKpi }> {
    return dashboardApiRequest<{ success: boolean; data: DashboardKpi }>(
      `/dashboard/assets/kpi?dashboardId=${encodeURIComponent(dashboardId)}`
    );
  },

  /**
   * Phase 3: 이미 복사한 원본 ID 목록 조회
   */
  async getCopiedSourceIds(dashboardId: string): Promise<{ success: boolean; sourceIds: string[] }> {
    return dashboardApiRequest<{ success: boolean; sourceIds: string[] }>(
      `/dashboard/assets/copied-source-ids?dashboardId=${encodeURIComponent(dashboardId)}`
    );
  },

  /**
   * Phase 3: 대시보드 자산 편집 (제목/설명)
   */
  async updateAsset(id: string, data: {
    dashboardId: string;
    title?: string;
    description?: string;
  }): Promise<{ success: boolean; data: Partial<DashboardAsset> }> {
    return dashboardApiRequest<{ success: boolean; data: Partial<DashboardAsset> }>(
      `/dashboard/assets/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    );
  },

  /**
   * Phase 3: 대시보드 자산 공개
   */
  async publishAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    return dashboardApiRequest<{ success: boolean }>(
      `/dashboard/assets/${id}/publish`,
      { method: 'POST', body: JSON.stringify({ dashboardId }) }
    );
  },

  /**
   * Phase 3: 대시보드 자산 보관
   */
  async archiveAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    return dashboardApiRequest<{ success: boolean }>(
      `/dashboard/assets/${id}/archive`,
      { method: 'POST', body: JSON.stringify({ dashboardId }) }
    );
  },

  /**
   * Phase 3: 대시보드 자산 삭제 (소프트)
   */
  async deleteAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    return dashboardApiRequest<{ success: boolean }>(
      `/dashboard/assets/${id}?dashboardId=${encodeURIComponent(dashboardId)}`,
      { method: 'DELETE' }
    );
  },

  /**
   * 판매자 행동 신호: 승인된 공급자 파트너십 존재 여부
   */
  async getSupplierSignal(): Promise<{ success: boolean; hasApprovedSupplier: boolean }> {
    return dashboardApiRequest<{ success: boolean; hasApprovedSupplier: boolean }>(
      '/dashboard/assets/supplier-signal'
    );
  },
};
