/**
 * Resources API 서비스
 * WO-KPA-RESOURCE-HUB-RESTRUCTURE-V1
 * WO-KPA-RESOURCES-UPLOAD-ENTRY-AND-FORM-SEPARATION-V1: create/update 추가
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

  create: (data: {
    title: string;
    summary?: string;
    body?: string;
    tags?: string[];
    source_type?: 'manual' | 'upload' | 'external';
    source_url?: string;
    source_file_name?: string;
    status?: 'draft' | 'published';
  }) =>
    apiClient.post<ApiResponse<ResourceItem>>('/contents', data),

  update: (id: string, data: {
    title?: string;
    summary?: string;
    body?: string;
    tags?: string[];
    source_type?: string;
    source_url?: string;
    source_file_name?: string;
    status?: string;
  }) =>
    apiClient.patch<ApiResponse<ResourceItem>>(`/contents/${id}`, data),

  // WO-KPA-OPERATOR-RESOURCES-MANAGEMENT-MENU-V1: 운영자 자료실 관리 API
  operatorList: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    source_type?: 'manual' | 'upload' | 'external';
    status?: 'draft' | 'published' | 'private';
  }) =>
    apiClient.get<ResourceListResponse>('/operator/resources', params),

  operatorUpdateStatus: (id: string, status: 'draft' | 'published' | 'private') =>
    apiClient.patch<ApiResponse<ResourceItem>>(`/operator/resources/${id}/status`, { status }),

  operatorDelete: (id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean; id: string }>>(`/operator/resources/${id}`),
};
