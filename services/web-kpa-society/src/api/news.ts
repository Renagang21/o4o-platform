/**
 * News/Notice API 서비스
 */

import { apiClient } from './client';
import type {
  Notice,
  GalleryItem,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export const newsApi = {
  // 공지사항/뉴스 (APP-CONTENT Phase 1: sort support)
  getNotices: (params?: {
    type?: string;
    page?: number;
    limit?: number;
    search?: string;
    sort?: 'latest' | 'featured' | 'views';
  }) =>
    apiClient.get<PaginatedResponse<Notice>>('/news', params),

  getNotice: (id: string) =>
    apiClient.get<ApiResponse<Notice>>(`/news/${id}`),

  // 갤러리
  getGalleryItems: (params?: {
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<PaginatedResponse<GalleryItem>>('/news/gallery', params),

  getGalleryItem: (id: string) =>
    apiClient.get<ApiResponse<GalleryItem>>(`/news/gallery/${id}`),
};
