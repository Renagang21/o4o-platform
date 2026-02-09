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
  // 공지사항/뉴스 (APP-CONTENT Phase 3A: sort + 추천/조회수)
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

  // Phase 3A: 추천 토글 (추천/취소)
  toggleRecommend: (id: string) =>
    apiClient.post<ApiResponse<{ recommendCount: number; isRecommendedByMe: boolean }>>(`/news/${id}/recommend`),

  // Phase 3A: 조회수 증가
  trackView: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/news/${id}/view`),

  // 갤러리
  getGalleryItems: (params?: {
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<PaginatedResponse<GalleryItem>>('/news/gallery', params),

  getGalleryItem: (id: string) =>
    apiClient.get<ApiResponse<GalleryItem>>(`/news/gallery/${id}`),
};
