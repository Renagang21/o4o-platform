/**
 * K-Cosmetics Resources API Client
 *
 * WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1
 *
 * cosmetics_contents 기반 자료실 API 래핑.
 * GP glycoResourcesApi (canonical mirror) 패턴.
 * 선행: WO-O4O-KCOS-RESOURCES-BACKEND-V1 (backend 도입).
 *
 * Public:
 *   GET /api/v1/cosmetics/contents?sub_type=resource
 *
 * Operator:
 *   GET    /api/v1/cosmetics/operator/resources
 *   POST   /api/v1/cosmetics/operator/resources
 *   PATCH  /api/v1/cosmetics/operator/resources/:id/status
 *   DELETE /api/v1/cosmetics/operator/resources/:id
 */

import { api } from '@/lib/apiClient';

export interface KCosResourceItem {
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

export interface KCosResourceListResponse {
  success: boolean;
  data: {
    items: KCosResourceItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const kCosResourcesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    usage_type?: string;
    sort?: 'latest' | 'popular' | 'views';
  }) =>
    api.get<KCosResourceListResponse>('/cosmetics/contents', {
      params: { ...params, sub_type: 'resource' },
    }),

  getDetail: (id: string) =>
    api.get<{ success: boolean; data: KCosResourceItem }>(`/cosmetics/contents/${id}`),

  // ─── Operator APIs ─────────────────────────────────────────────────────────

  operatorList: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    source_type?: 'manual' | 'upload' | 'external';
    status?: 'draft' | 'published' | 'private';
    usage_type?: 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY';
  }) =>
    api.get<KCosResourceListResponse>('/cosmetics/operator/resources', { params }),

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
    api.post<{ success: boolean; data: KCosResourceItem }>('/cosmetics/operator/resources', data),

  operatorUpdateStatus: (id: string, status: 'draft' | 'published' | 'private') =>
    api.patch<{ success: boolean; data: KCosResourceItem }>(
      `/cosmetics/operator/resources/${id}/status`,
      { status },
    ),

  operatorDelete: (id: string) =>
    api.delete<{ success: boolean; data: { deleted: boolean; id: string } }>(
      `/cosmetics/operator/resources/${id}`,
    ),
};
