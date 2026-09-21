/**
 * Hub Content API Client
 *
 * WO-O4O-HUB-CONTENT-QUERY-SERVICE-PHASE1-V2
 *
 * 통합 HUB 콘텐츠 조회 API (CMS + Signage 병합)
 * 인증 불필요 — 공개 읽기 전용
 */

import type {
  HubContentListResponse,
  HubProducer,
  HubSourceDomain,
} from '@o4o/types/hub-content';

const HUB_API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/hub`
  : '/api/v1/hub';

export interface HubContentListParams {
  serviceKey: string;
  producer?: HubProducer;
  sourceDomain?: HubSourceDomain;
  page?: number;
  limit?: number;
}

export const hubContentApi = {
  async list(params: HubContentListParams): Promise<HubContentListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('serviceKey', params.serviceKey);
    if (params.producer) searchParams.set('producer', params.producer);
    if (params.sourceDomain) searchParams.set('sourceDomain', params.sourceDomain);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `${HUB_API_BASE}/contents?${searchParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Hub Content API error: ${response.status}`);
    }

    return response.json();
  },
};

export type { HubContentListResponse, HubProducer, HubSourceDomain };
