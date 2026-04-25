/**
 * Hub Content API Client — K-Cosmetics
 *
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1
 *
 * GET /api/v1/hub/contents?serviceKey=k-cosmetics&sourceDomain=...
 */

import { api } from '../apiClient';
import type { HubContentListResponse, HubContentItemResponse } from '@o4o/types/hub-content';

export type { HubContentItemResponse };

const SERVICE_KEY = 'k-cosmetics';

interface HubContentListParams {
  sourceDomain?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const hubContentApi = {
  async list(params: HubContentListParams = {}): Promise<HubContentListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('serviceKey', SERVICE_KEY);
    if (params.sourceDomain) searchParams.set('sourceDomain', params.sourceDomain);
    if (params.type) searchParams.set('type', params.type);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const res = await api.get<HubContentListResponse>(`/hub/contents?${searchParams.toString()}`);
    return res.data;
  },
};
