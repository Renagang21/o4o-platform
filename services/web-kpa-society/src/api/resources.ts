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

  // WO-KPA-A-OPERATOR-RESOURCES-CMS-V1: CMS 메서드

  // 자료 등록
  createResource: (data: {
    title: string;
    description?: string;
    category?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    isPublic?: boolean;
  }) => apiClient.post<ApiResponse<Resource>>('/resources', data),

  // 자료 수정
  updateResource: (id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    isPublic?: boolean;
  }) => apiClient.patch<ApiResponse<Resource>>(`/resources/${id}`, data),

  // 자료 삭제
  deleteResource: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/resources/${id}`),

  // 파일 업로드 (multipart/form-data — apiClient는 JSON 전용이므로 직접 fetch)
  uploadFile: async (file: File): Promise<{ fileUrl: string; fileName: string; fileSize: number } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const base = import.meta.env.VITE_API_BASE_URL
        ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
        : '/api/v1/kpa';
      const token = localStorage.getItem('kpa_access_token') || localStorage.getItem('o4o_accessToken');
      const resp = await fetch(`${base}/resources/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      return json?.data ?? null;
    } catch {
      return null;
    }
  },
};
