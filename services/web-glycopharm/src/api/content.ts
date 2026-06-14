/**
 * GlycoPharm Member Content API Client
 *
 * WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1 (Phase B)
 *
 * 회원 작성 콘텐츠(`sub_type='content'`) — KPA contentApi 미러 (documents-only).
 * 백엔드: /api/v1/glycopharm/contents (GET 목록 / POST / GET:id / PATCH:id / DELETE:id / POST:id/view)
 * recommend / copy-to-store / AI 는 범위 외(미구현).
 */

import { api } from '@/lib/apiClient';

export interface ContentItem {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  tags: string[];
  category: string | null;
  thumbnail_url: string | null;
  sub_type: string | null;
  source_type: string;
  source_url: string | null;
  source_file_name: string | null;
  usage_type: string | null;
  status: 'draft' | 'published' | 'private';
  created_by: string | null;
  author_name: string | null;
  like_count: number;
  view_count: number;
  reusable_policy: 'platform' | 'restricted';
  created_at: string;
  updated_at: string;
}

export interface ContentListResponse {
  success: boolean;
  data: {
    items: ContentItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ContentDetailResponse {
  success: boolean;
  data: ContentItem;
}

export interface ContentListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: 'draft' | 'published' | 'private';
  tag?: string;
  sort?: 'latest' | 'popular' | 'views';
  my?: 'true';
}

export interface ContentPayload {
  title: string;
  body?: string;
  summary?: string;
  tags?: string[];
  category?: string;
  status?: 'draft' | 'published' | 'private';
  sub_type?: string;
  reusable_policy?: 'platform' | 'restricted';
}

export const contentApi = {
  list: (params?: ContentListParams) =>
    api.get<ContentListResponse>('/glycopharm/contents', {
      params: { ...params, sub_type: 'content' },
    }),

  detail: (id: string) =>
    api.get<ContentDetailResponse>(`/glycopharm/contents/${id}`),

  create: (data: ContentPayload) =>
    api.post<ContentDetailResponse>('/glycopharm/contents', data),

  update: (id: string, data: Partial<ContentPayload>) =>
    api.patch<ContentDetailResponse>(`/glycopharm/contents/${id}`, data),

  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/glycopharm/contents/${id}`),

  trackView: (id: string) =>
    api.post<{ success: boolean }>(`/glycopharm/contents/${id}/view`),
};
