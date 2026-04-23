/**
 * Resources API 서비스
 * WO-KPA-RESOURCE-HUB-RESTRUCTURE-V1
 *
 * kpa_contents 기반 자료실 API 래핑.
 */

import { apiClient } from './client';
import type { ApiResponse } from '../types';

export interface ResourceItem {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  blocks: object[];
  tags: string[];
  category: string | null;
  thumbnail_url: string | null;
  source_type: string;
  source_url: string | null;
  source_file_name: string | null;
  status: string;
  content_type: string;
  sub_type: string | null;
  like_count: number;
  view_count: number;
  author_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  isRecommendedByMe?: boolean;
}

export interface ResourceListResponse {
  success: boolean;
  data: {
    items: ResourceItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const resourcesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sub_type?: string;
    content_type?: string;
    tag?: string;
    sort?: 'latest' | 'popular' | 'views';
  }) =>
    apiClient.get<ResourceListResponse>('/contents', params),

  getDetail: (id: string) =>
    apiClient.get<ApiResponse<ResourceItem>>(`/contents/${id}`),

  toggleRecommend: (id: string) =>
    apiClient.post<ApiResponse<{ recommendCount: number; isRecommendedByMe: boolean }>>(`/contents/${id}/recommend`),

  trackView: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/contents/${id}/view`),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/contents/${id}`),
};
