/**
 * Content APIs - CMS Content
 *
 * WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1: cms_media 기반 Content Asset Dashboard(contentAssetApi) 제거.
 *   미디어 정본 = media_assets. supplier-signal 은 ./dashboard.ts 의 dashboardApi 로 이동.
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */
import { api } from '../apiClient';

/**
 * WO-O4O-NETURE-OPERATOR-HOMEPAGE-CMS-AND-CONTENT-ASSETS-LOAD-ERROR-CONTRACT-V1 (IR 묶음 3)
 *
 * 운영자 홈페이지 CMS·콘텐츠 자산 조회 실패(4xx/5xx/네트워크/깨진 payload)를
 * "정상 빈 콘텐츠·0 KPI" 로 삼키지 않는다.
 * 실패 시 고정 코드 throw(서버 원문은 console.warn 으로만 로깅), 정상 0건·0 KPI(200+success:true)만 성공 통과.
 *
 * Backend 계약(read-only 확인):
 *   `GET /neture/admin/homepage-contents?section=` → `200 { success:true, data:[] }` (400 잘못된 section / 500 오류 / 401·403 scope)
 *   `GET /neture/content`                          → `200 { success:true, data:[], pagination }` (500 오류)
 *
 * 의도된 fail-open(본 계약 대상 아님, 유지): getHeroSlides/getAds/getLogos(공개 홈 섹션),
 *   trackView(조회수), getSupplierSignal(시그널성 조회 — dashboard.ts).
 * mutation(create/update/delete/publish/archive/status 등)은 본 계약 대상이 아니며 기존 fail 처리를 유지한다.
 */
export const OPERATOR_HOMEPAGE_CONTENTS_LOAD_FAILED = 'OPERATOR_HOMEPAGE_CONTENTS_LOAD_FAILED';
export const CMS_CONTENTS_LOAD_FAILED = 'CMS_CONTENTS_LOAD_FAILED';

function describeApiError(error: any): string {
  const data = error?.response?.data;
  if (typeof data?.error === 'string') return data.error;
  if (data?.error && typeof data.error === 'object') return data.error.code || data.error.message || 'UNKNOWN_ERROR';
  return error?.message || 'UNKNOWN_ERROR';
}

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

// ==================== CMS API ====================

export const cmsApi = {
  async getContents(params?: {
    type?: string;
    sort?: 'latest' | 'featured' | 'views' | 'popular';
    page?: number;
    limit?: number;
  }): Promise<{ data: CmsContent[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    let response;
    try {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.append('type', params.type);
      if (params?.sort) searchParams.append('sort', params.sort);
      if (params?.page) searchParams.append('page', String(params.page));
      if (params?.limit) searchParams.append('limit', String(params.limit));
      const qs = searchParams.toString();
      response = await api.get(`/neture/content${qs ? `?${qs}` : ''}`);
    } catch (error) {
      console.warn('[CMS API] Failed to fetch contents:', describeApiError(error));
      throw new Error(CMS_CONTENTS_LOAD_FAILED);
    }
    const result = response.data;
    if (result?.success !== true || !Array.isArray(result.data) || !result.pagination) {
      console.warn('[CMS API] Unexpected contents payload shape');
      throw new Error(CMS_CONTENTS_LOAD_FAILED);
    }
    return { data: result.data, pagination: result.pagination };
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
