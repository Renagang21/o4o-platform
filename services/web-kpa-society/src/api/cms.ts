/**
 * CMS API Client
 *
 * WO-P2-IMPLEMENT-CONTENT: API endpoints for CMS content
 */

/**
 * WO-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1
 *
 * KPA 의 CMS 원장 canonical key. 이전에는 각 호출이 role prefix('kpa')를 기본값으로
 * 보냈다 — 서버가 alias 집합으로 확장하므로 결과는 같았지만 축이 섞여 있었다.
 * 값을 canonical 로 맞추고 한 곳에서만 선언한다. legacy `serviceKey='kpa'` row 는
 * 서버 read 경계가 alias 집합으로 함께 조회하므로 계속 노출된다.
 */
const KPA_CMS_SERVICE_KEY = 'kpa-society';

// CMS API uses /api/v1/cms namespace
const CMS_API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/cms`
  : '/api/v1/cms';

interface CmsSlotContent {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  metadata: Record<string, any>;
}

interface CmsSlot {
  id: string;
  slotKey: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  content: CmsSlotContent | null;
}

interface CmsContent {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  status: string;
  publishedAt: string | null;
  isPinned: boolean;
  isOperatorPicked: boolean;
  sortOrder: number;
  authorRole?: string;
  visibilityScope?: string;
  createdAt: string;
}

interface SlotsResponse {
  success: boolean;
  data: CmsSlot[];
  meta: {
    slotKey: string;
    serviceKey: string | null;
    organizationId: string | null;
    total: number;
  };
}

interface ContentsResponse {
  success: boolean;
  data: CmsContent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface StatsResponse {
  success: boolean;
  data: {
    hero: { total: number; active: number };
    notice: { total: number; active: number };
    news: { total: number; active: number };
    featured: { total: number; operatorPicked: number };
    promo: { total: number; active: number };
    event: { total: number; active: number };
    eventNotice: { total: number; active: number };
  };
  scope: {
    serviceKey: string | null;
    organizationId: string | null;
  };
}

async function fetchFromCms<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${CMS_API_BASE_URL}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`CMS API error: ${response.status}`);
  }

  return response.json();
}

export const cmsApi = {
  /**
   * Get content slots by slot key
   */
  getSlots: async (
    slotKey: string,
    options?: {
      serviceKey?: string;
      organizationId?: string;
      activeOnly?: boolean;
    }
  ): Promise<SlotsResponse> => {
    return fetchFromCms<SlotsResponse>(`/slots/${slotKey}`, {
      serviceKey: options?.serviceKey || KPA_CMS_SERVICE_KEY,
      organizationId: options?.organizationId || '',
      activeOnly: options?.activeOnly !== false ? 'true' : 'false',
    });
  },

  /**
   * Get content list
   */
  getContents: async (options?: {
    serviceKey?: string;
    organizationId?: string;
    type?: string;
    status?: string;
    authorRole?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ContentsResponse> => {
    return fetchFromCms<ContentsResponse>('/contents', {
      serviceKey: options?.serviceKey || KPA_CMS_SERVICE_KEY,
      organizationId: options?.organizationId || '',
      type: options?.type || '',
      status: options?.status || '',
      authorRole: options?.authorRole || '',
      search: options?.search || '',
      limit: String(options?.limit || 20),
      offset: String(options?.offset || 0),
    });
  },

  /**
   * Get content statistics
   */
  getStats: async (options?: {
    serviceKey?: string;
    organizationId?: string;
  }): Promise<StatsResponse> => {
    return fetchFromCms<StatsResponse>('/stats', {
      serviceKey: options?.serviceKey || KPA_CMS_SERVICE_KEY,
      organizationId: options?.organizationId || '',
    });
  },
};

export type { CmsSlot, CmsSlotContent, CmsContent };
