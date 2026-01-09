/**
 * CMS API Client
 *
 * WO-P2-IMPLEMENT-CONTENT: API endpoints for CMS content
 */

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
      serviceKey: options?.serviceKey || 'kpa',
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
    limit?: number;
    offset?: number;
  }): Promise<ContentsResponse> => {
    return fetchFromCms<ContentsResponse>('/contents', {
      serviceKey: options?.serviceKey || 'kpa',
      organizationId: options?.organizationId || '',
      type: options?.type || '',
      status: options?.status || '',
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
      serviceKey: options?.serviceKey || 'kpa',
      organizationId: options?.organizationId || '',
    });
  },
};

export type { CmsSlot, CmsSlotContent, CmsContent };
