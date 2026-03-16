/**
 * CMS API Client — K-Cosmetics
 *
 * WO-O4O-HUB-DATA-UNIFICATION-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 *
 * 기존 KPA CMS 클라이언트 패턴 동일. serviceKey만 'cosmetics'.
 */

import { api } from '../lib/apiClient';

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
    const params = new URLSearchParams();
    params.set('serviceKey', options?.serviceKey || 'cosmetics');
    params.set('activeOnly', options?.activeOnly !== false ? 'true' : 'false');

    const response = await api.get(`/cms/slots/${slotKey}?${params}`);
    return response.data;
  },

  getContents: async (options?: {
    serviceKey?: string;
    type?: string;
    status?: string;
    authorRole?: string;
    limit?: number;
    offset?: number;
  }): Promise<ContentsResponse> => {
    const params = new URLSearchParams();
    params.set('serviceKey', options?.serviceKey || 'cosmetics');
    if (options?.type) params.set('type', options.type);
    if (options?.status) params.set('status', options.status);
    if (options?.authorRole) params.set('authorRole', options.authorRole);
    params.set('limit', String(options?.limit || 20));
    params.set('offset', String(options?.offset || 0));

    const response = await api.get(`/cms/contents?${params}`);
    return response.data;
  },
};
