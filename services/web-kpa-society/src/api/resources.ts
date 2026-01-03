/**
 * Resources API 서비스
 */

import { apiClient } from './client';
import type {
  Resource,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export const resourcesApi = {
  // 자료 목록
  getResources: (params?: {
    category?: 'forms' | 'guidelines' | 'policies';
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    apiClient.get<PaginatedResponse<Resource>>('/resources', params),

  // 자료 상세
  getResource: (id: string) =>
    apiClient.get<ApiResponse<Resource>>(`/resources/${id}`),

  // 다운로드 (조회수 증가)
  downloadResource: (id: string) =>
    apiClient.post<ApiResponse<{ downloadUrl: string }>>(`/resources/${id}/download`),
};
