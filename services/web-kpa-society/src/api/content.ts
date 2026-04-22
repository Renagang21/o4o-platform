/**
 * Content API — KPA 콘텐츠 허브
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 */

import { apiClient } from './client';

export interface ContentItem {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  blocks: object[];
  category: string | null;
  tags: string[];
  status: 'draft' | 'published' | 'private';
  content_type: 'participation' | 'information';
  sub_type: string | null;
  source_type: string;
  source_url: string | null;
  source_file_name: string | null;
  thumbnail_url: string | null;
  created_by: string | null;
  author_name: string | null;
  like_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  isRecommendedByMe?: boolean;
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

export interface RecommendResponse {
  success: boolean;
  data: {
    recommendCount: number;
    isRecommendedByMe: boolean;
  };
}

export interface ContentListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  content_type?: string;
  sub_type?: string;
  sort?: 'latest' | 'popular' | 'views';
  tag?: string;
}

export interface ContentCreatePayload {
  title: string;
  body?: string;
  summary?: string;
  content_type?: 'participation' | 'information';
  sub_type?: string;
  tags?: string[];
  category?: string;
  status?: 'draft' | 'published' | 'private';
  blocks?: object[];
  source_type?: string;
  source_url?: string;
  thumbnail_url?: string;
}

export const contentApi = {
  list: (params?: ContentListParams) =>
    apiClient.get<ContentListResponse>('/contents', params as any),

  detail: (id: string) =>
    apiClient.get<ContentDetailResponse>(`/contents/${id}`),

  create: (data: ContentCreatePayload) =>
    apiClient.post<ContentDetailResponse>('/contents', data),

  update: (id: string, data: Partial<ContentCreatePayload>) =>
    apiClient.patch<ContentDetailResponse>(`/contents/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/contents/${id}`),

  recommend: (id: string) =>
    apiClient.post<RecommendResponse>(`/contents/${id}/recommend`),

  trackView: (id: string) =>
    apiClient.post<{ success: boolean }>(`/contents/${id}/view`),

  copyToStore: (id: string) =>
    apiClient.post<{ success: boolean }>(`/contents/${id}/copy-to-store`),
};
