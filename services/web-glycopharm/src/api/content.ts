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

// authClient.api 는 axios 인스턴스 → 응답 envelope 은 res.data 에 위치. 여기서 unwrap 해 반환.
export const contentApi = {
  list: (params?: ContentListParams): Promise<ContentListResponse> =>
    api.get('/glycopharm/contents', { params: { ...params, sub_type: 'content' } }).then((r: any) => r.data),

  detail: (id: string): Promise<ContentDetailResponse> =>
    api.get(`/glycopharm/contents/${id}`).then((r: any) => r.data),

  create: (data: ContentPayload): Promise<ContentDetailResponse> =>
    api.post('/glycopharm/contents', data).then((r: any) => r.data),

  update: (id: string, data: Partial<ContentPayload>): Promise<ContentDetailResponse> =>
    api.patch(`/glycopharm/contents/${id}`, data).then((r: any) => r.data),

  remove: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/glycopharm/contents/${id}`).then((r: any) => r.data),

  trackView: (id: string): Promise<{ success: boolean }> =>
    api.post(`/glycopharm/contents/${id}/view`).then((r: any) => r.data),
};
