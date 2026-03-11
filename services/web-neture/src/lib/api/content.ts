/**
 * Content APIs - CMS Content + Content Asset Dashboard
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';

// ==================== CMS Content Types ====================

export interface CmsContent {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  body: string | null;
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
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets/copied-source-ids?dashboardId=${encodeURIComponent(dashboardId)}`,
        { credentials: 'include' }
      );
      if (!response.ok) return { success: false, sourceIds: [] };
      return response.json();
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
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets?${queryParams.toString()}`,
        { credentials: 'include' }
      );
      if (!response.ok) return { success: false, data: [] };
      return response.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async getKpi(dashboardId: string): Promise<{ success: boolean; data: DashboardKpi }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets/kpi?dashboardId=${encodeURIComponent(dashboardId)}`,
        { credentials: 'include' }
      );
      if (!response.ok) return { success: false, data: { totalAssets: 0, activeAssets: 0, recentViewsSum: 0, topRecommended: null } };
      return response.json();
    } catch {
      return { success: false, data: { totalAssets: 0, activeAssets: 0, recentViewsSum: 0, topRecommended: null } };
    }
  },

  async updateAsset(id: string, data: {
    dashboardId: string;
    title?: string;
    description?: string;
  }): Promise<{ success: boolean }> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/dashboard/assets/${id}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error('Failed to update asset');
    return response.json();
  },

  async publishAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/dashboard/assets/${id}/publish`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ dashboardId }) }
    );
    if (!response.ok) throw new Error('Failed to publish asset');
    return response.json();
  },

  async archiveAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/dashboard/assets/${id}/archive`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ dashboardId }) }
    );
    if (!response.ok) throw new Error('Failed to archive asset');
    return response.json();
  },

  async deleteAsset(id: string, dashboardId: string): Promise<{ success: boolean }> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/dashboard/assets/${id}?dashboardId=${encodeURIComponent(dashboardId)}`,
      { method: 'DELETE', credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to delete asset');
    return response.json();
  },

  async getSupplierSignal(): Promise<{ success: boolean; hasApprovedSupplier: boolean }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/dashboard/assets/supplier-signal`,
        { credentials: 'include' }
      );
      if (!response.ok) return { success: false, hasApprovedSupplier: false };
      return response.json();
    } catch {
      return { success: false, hasApprovedSupplier: false };
    }
  },
};

// ==================== CMS API ====================

export const cmsApi = {
  async getContents(params?: {
    type?: string;
    sort?: 'latest' | 'featured' | 'views';
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
      const response = await fetch(
        `${API_BASE_URL}/api/v1/neture/content${qs ? `?${qs}` : ''}`
      );
      if (!response.ok) {
        console.warn('[CMS API] Contents API not available, returning empty');
        return { data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
      }
      const result = await response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/content/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch content detail');
    }
    const result = await response.json();
    return result.data;
  },

  async toggleRecommend(id: string): Promise<{ recommendCount: number; isRecommendedByMe: boolean }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/content/${id}/recommend`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to toggle recommendation');
    }
    const result = await response.json();
    return result.data;
  },

  async trackView(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/neture/content/${id}/view`, { method: 'POST' });
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
      const res = await fetch(`${API_BASE_URL}/api/v1/neture/home/hero`);
      if (!res.ok) return [];
      const result = await res.json();
      return result.data || [];
    } catch { return []; }
  },

  async getAds(): Promise<CmsContent[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/neture/home/ads`);
      if (!res.ok) return [];
      const result = await res.json();
      return result.data || [];
    } catch { return []; }
  },

  async getLogos(): Promise<CmsContent[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/neture/home/logos`);
      if (!res.ok) return [];
      const result = await res.json();
      return result.data || [];
    } catch { return []; }
  },

  // --- Admin CRUD ---
  async getContents(section: string): Promise<CmsContent[]> {
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/homepage-contents?section=${section}`,
        { credentials: 'include' },
      );
      if (!res.ok) return [];
      const result = await res.json();
      return result.data || [];
    } catch { return []; }
  },

  async createContent(section: string, data: {
    title: string; summary?: string; imageUrl?: string; linkUrl?: string;
    linkText?: string; sortOrder?: number; metadata?: Record<string, any>;
  }): Promise<CmsContent | null> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/admin/homepage-contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ section, ...data }),
    });
    if (!res.ok) throw new Error('Failed to create content');
    const result = await res.json();
    return result.data;
  },

  async updateContent(id: string, data: {
    title?: string; summary?: string; imageUrl?: string; linkUrl?: string;
    linkText?: string; sortOrder?: number; metadata?: Record<string, any>;
  }): Promise<CmsContent | null> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/admin/homepage-contents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update content');
    const result = await res.json();
    return result.data;
  },

  async deleteContent(id: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/admin/homepage-contents/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete content');
  },

  async updateStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<CmsContent | null> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/admin/homepage-contents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    const result = await res.json();
    return result.data;
  },
};
