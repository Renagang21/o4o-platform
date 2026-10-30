import type { AxiosInstance } from 'axios';
export const OPERATOR_HOMEPAGE_CONTENTS_LOAD_FAILED = 'OPERATOR_HOMEPAGE_CONTENTS_LOAD_FAILED';
function describeApiError(error: any): string {
  const data = error?.response?.data;
  if (typeof data?.error === 'string') return data.error;
  if (data?.error && typeof data.error === 'object') return data.error.code || data.error.message || 'UNKNOWN_ERROR';
  return error?.message || 'UNKNOWN_ERROR';
}

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


export function createHomepageCmsApi(api: AxiosInstance) {
const homepageCmsApi = {
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
    let res;
    try {
      res = await api.get(`/neture/admin/homepage-contents?section=${section}`);
    } catch (error) {
      console.warn('[Homepage CMS API] Failed to fetch contents:', describeApiError(error));
      throw new Error(OPERATOR_HOMEPAGE_CONTENTS_LOAD_FAILED);
    }
    const result = res.data;
    if (result?.success !== true || !Array.isArray(result.data)) {
      console.warn('[Homepage CMS API] Unexpected contents payload shape');
      throw new Error(OPERATOR_HOMEPAGE_CONTENTS_LOAD_FAILED);
    }
    return result.data;
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

return homepageCmsApi;
}
