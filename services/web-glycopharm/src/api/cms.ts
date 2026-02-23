/**
 * CMS API Client — GlycoPharm
 *
 * WO-O4O-HUB-DATA-UNIFICATION-V1
 * 기존 KPA CMS 클라이언트 패턴 동일. serviceKey만 'glycopharm'.
 */

const CMS_API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/cms`
  : '/api/v1/cms';

export interface CmsSlotContent {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  metadata: Record<string, any>;
}

export interface CmsSlot {
  id: string;
  slotKey: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  content: CmsSlotContent | null;
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

async function fetchFromCms<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${CMS_API_BASE_URL}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
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

export interface CmsContent {
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

interface ContentsResponse {
  success: boolean;
  data: CmsContent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export const cmsApi = {
  getSlots: async (
    slotKey: string,
    options?: { serviceKey?: string; activeOnly?: boolean }
  ): Promise<SlotsResponse> => {
    return fetchFromCms<SlotsResponse>(`/slots/${slotKey}`, {
      serviceKey: options?.serviceKey || 'glycopharm',
      activeOnly: options?.activeOnly !== false ? 'true' : 'false',
    });
  },

  getContents: async (options?: {
    serviceKey?: string;
    type?: string;
    status?: string;
    authorRole?: string;
    limit?: number;
    offset?: number;
  }): Promise<ContentsResponse> => {
    return fetchFromCms<ContentsResponse>('/contents', {
      serviceKey: options?.serviceKey || 'glycopharm',
      type: options?.type || '',
      status: options?.status || '',
      authorRole: options?.authorRole || '',
      limit: String(options?.limit || 20),
      offset: String(options?.offset || 0),
    });
  },
};
