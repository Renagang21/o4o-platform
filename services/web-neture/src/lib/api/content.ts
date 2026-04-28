/**
 * Content APIs - CMS Content + Content Asset Dashboard
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */
import { api } from '../apiClient';

// ==================== CMS Content Types ====================

export interface CmsContent {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  body: string | null;
  bodyBlocks: Record<string, any>[] | null;
  attachments: Array<{ name: string; url: string; type: string; size?: number }> | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  status: string;
  publishedAt: string | null;
  isPinned: boolean;
  isOperatorPicked?: boolean;
  sortOrder: number;
  metadata?: Record<string, any> | null;
  createdAt: string;
  viewCount?: number;
  recommendCount?: number;
  isRecommendedByMe?: boolean;
}

// ==================== Content Asset Dashboard Types ====================

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

// ==================== Content Asset API ====================

export const contentAssetApi = {
  async getCopiedSourceIds(dashboardId: string): Promise<{ success: boolean; sourceIds: string[] }> {
    try {
      const response = await api.get(`/dashboard/assets/copied-source-ids?dashboardId=${encodeURIComponent(dashboardId)}`);
      return response.data;
    } catch {
      return { success: false, sourceIds: [] };
    }
  },

  async listAssets(dashboardId: string, params?: {
    status?: 'draft' | 'active' | 'archived';
    sort?: DashboardSortType;
  }): Promise<{ success: boolean; data: DashboardAsset[] }> {
    try {
      const queryParams = new URLSearchParams({ dashboardId });
      if (params?.status) queryParams.set('status', params.status);
      if (params?.sort) queryParams.set('sort', params.sort);
      const response = await api.get(`/dashboard/assets?${queryParams.toString()}`);
      return response.data;
    } catch {
      return { success: false, data: [] };
    }
  },

  async getKpi(dashboardId: string): Promise<{ success: boolean; data: DashboardKpi }> {
    try {
      const response = await api.get(`/dashboard/assets/kpi?dashboardId=${encodeURIComponent(dashboardId)}`);
      return response.data;
    } catch {
      return { success: false, data: { totalAssets: 0, activeAssets: 0, recentViewsSum: 0, topRecommended: null } };
    }
  },

  async updateAsset(id: string, data: {
    dashboardId: string;
    title?: string;
    description?: string;
  }): Promise<{ success: boolean }> {
    const response = await api.patch(`/dashboard/assets/${id}`, data);
    return response.data;
  },

  async publishAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/dashboard/assets/${id}/publish`, { dashboardId });
    return response.data;
  },

  async archiveAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/dashboard/assets/${id}/archive`, { dashboardId });
    return response.data;
  },

  async deleteAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/dashboard/assets/${id}?dashboardId=${encodeURIComponent(dashboardId)}`);
    return response.data;
  },

  async getSupplierSignal(): Promise<{ success: boolean; hasApprovedSupplier: boolean }> {
    try {
      const response = await api.get('/dashboard/assets/supplier-signal');
      return response.data;
    } catch {
      return { success: false, hasApprovedSupplier: false };
    }
  },
};

// ==================== CMS API ====================

export const cmsApi = {
  async getContents(params?: {
    type?: string;
    sort?: 'latest' | 'featured' | 'views' | 'popular';
    page?: number;
    limit?: number;
  }): Promise<{ data: CmsContent[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.append('type', params.type);
      if (params?.sort) searchParams.append('sort', params.sort);
      if (params?.page) searchParams.append('page', String(params.page));
      if (params?.limit) searchParams.append('limit', String(params.limit));
      const qs = searchParams.toString();
      const response = await api.get(`/neture/content${qs ? `?${qs}` : ''}`);
      const result = response.data;
      return {
        data: result.data || [],
        pagination: result.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 },
      };
    } catch (error) {
      console.warn('[CMS API] Failed to fetch contents:', error);
      return { data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
    }
  },

  async getContentById(id: string): Promise<CmsContent> {
    const response = await api.get(`/neture/content/${id}`);
    const result = response.data;
    return result.data;
  },

  async toggleRecommend(id: string): Promise<{ recommendCount: number; isRecommendedByMe: boolean }> {
    const response = await api.post(`/neture/content/${id}/recommend`, {});
    const result = response.data;
    return result.data;
  },

  async trackView(id: string): Promise<void> {
    try {
      await api.post(`/neture/content/${id}/view`, {});
    } catch {
      // 조회수 실패는 무시
    }
  },
};

// ==================== Homepage CMS API ====================

export const homepageCmsApi = {
  // --- Public (no auth) ---
  async getHeroSlides(): Promise<CmsContent[]> {
    try {
      const res = await api.get('/neture/home/hero');
      const result = res.data;
      return result.data || [];
    } catch { return []; }
  },

  async getAds(): Promise<CmsContent[]> {
    try {
      const res = await api.get('/neture/home/ads');
      const result = res.data;
      return result.data || [];
    } catch { return []; }
  },

  async getLogos(): Promise<CmsContent[]> {
    try {
      const res = await api.get('/neture/home/logos');
      const result = res.data;
      return result.data || [];
    } catch { return []; }
  },

  // --- Admin CRUD ---
  async getContents(section: string): Promise<CmsContent[]> {
    try {
      const res = await api.get(`/neture/admin/homepage-contents?section=${section}`);
      const result = res.data;
      return result.data || [];
    } catch { return []; }
  },

  async createContent(section: string, data: {
    title: string; summary?: string; imageUrl?: string; linkUrl?: string;
    linkText?: string; sortOrder?: number; metadata?: Record<string, any>;
  }): Promise<CmsContent | null> {
    const res = await api.post('/neture/admin/homepage-contents', { section, ...data });
    const result = res.data;
    return result.data;
  },

  async updateContent(id: string, data: {
    title?: string; summary?: string; imageUrl?: string; linkUrl?: string;
    linkText?: string; sortOrder?: number; metadata?: Record<string, any>;
  }): Promise<CmsContent | null> {
    const res = await api.put(`/neture/admin/homepage-contents/${id}`, data);
    const result = res.data;
    return result.data;
  },

  async deleteContent(id: string): Promise<void> {
    await api.delete(`/neture/admin/homepage-contents/${id}`);
  },

  async updateStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<CmsContent | null> {
    const res = await api.patch(`/neture/admin/homepage-contents/${id}/status`, { status });
    const result = res.data;
    return result.data;
  },
};
