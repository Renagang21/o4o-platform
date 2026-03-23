/**
 * Hub Content API Client — Neture
 *
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1
 *
 * GET /api/v1/hub/contents?serviceKey=neture&sourceDomain=...
 */

import { api } from '../apiClient';
import type { HubContentListResponse } from '@o4o/types/hub-content';

const SERVICE_KEY = 'neture';

interface HubContentListParams {
  sourceDomain?: string;
  page?: number;
  limit?: number;
}

export const hubContentApi = {
  async list(params: HubContentListParams = {}): Promise<HubContentListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('serviceKey', SERVICE_KEY);
    if (params.sourceDomain) searchParams.set('sourceDomain', params.sourceDomain);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const res = await api.get<HubContentListResponse>(`/hub/contents?${searchParams.toString()}`);
    return res.data;
  },
};
