/**
 * GlycoPharm Resources API Client
 *
 * WO-O4O-GLYCOPHARM-HUB-RESOURCES-V1
 *
 * glycopharm_contents 기반 자료실 API 래핑.
 * GET /api/v1/glycopharm/contents?sub_type=resource
 */

import { api } from '@/lib/apiClient';

export interface GlycoResourceItem {
  id: string;
  title: string;
  summary: string | null;
  blocks: object[];
  tags: string[];
  category: string | null;
  thumbnail_url: string | null;
  sub_type: string | null;
  source_type: string;
  source_url: string | null;
  source_file_name: string | null;
  usage_type: string | null;
  status: string;
  like_count: number;
  view_count: number;
  author_name: string | null;
  created_by: string | null;
  reusable_policy: 'platform' | 'restricted';
  created_at: string;
  updated_at: string;
}

export interface GlycoResourceListResponse {
  success: boolean;
  data: {
    items: GlycoResourceItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const glycoResourcesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    usage_type?: string;
    sort?: 'latest' | 'popular' | 'views';
  }) =>
    api.get<GlycoResourceListResponse>('/glycopharm/contents', {
      params: { ...params, sub_type: 'resource' },
    }),

  getDetail: (id: string) =>
    api.get<{ success: boolean; data: GlycoResourceItem }>(`/glycopharm/contents/${id}`),

  // ─── Operator APIs ─────────────────────────────────────────────────────────

  operatorList: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    source_type?: 'manual' | 'upload' | 'external';
    status?: 'draft' | 'published' | 'private';
    usage_type?: 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY';
  }) =>
    api.get<GlycoResourceListResponse>('/glycopharm/operator/resources', { params }),

  operatorCreate: (data: {
    title: string;
    summary?: string;
    blocks?: object[];
    tags?: string[];
    category?: string;
    source_type?: 'manual' | 'upload' | 'external';
    source_url?: string;
    source_file_name?: string;
    usage_type?: 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY';
    status?: 'draft' | 'published' | 'private';
    reusable_policy?: 'platform' | 'restricted';
  }) =>
    api.post<{ success: boolean; data: GlycoResourceItem }>('/glycopharm/operator/resources', data),

  operatorUpdateStatus: (id: string, status: 'draft' | 'published' | 'private') =>
    api.patch<{ success: boolean; data: GlycoResourceItem }>(
      `/glycopharm/operator/resources/${id}/status`,
      { status },
    ),

  operatorDelete: (id: string) =>
    api.delete<{ success: boolean; data: { deleted: boolean; id: string } }>(
      `/glycopharm/operator/resources/${id}`,
    ),
};
