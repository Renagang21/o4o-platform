/**
 * Groupbuy API 서비스
 */

import { apiClient } from './client';
import type {
  Groupbuy,
  GroupbuyProduct,
  GroupbuyStats,
  GroupbuyParticipation,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export const groupbuyApi = {
  // 공동구매 상품 목록 (product listing 기반, WO-KPA-GROUPBUY-PAGE-V1)
  getGroupbuyProducts: (params?: {
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<{
      success: boolean;
      data: GroupbuyProduct[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/groupbuy', params),

  // 공동구매 상품 상세 (WO-KPA-GROUPBUY-PAGE-V1)
  getGroupbuyProduct: (id: string) =>
    apiClient.get<{ success: boolean; data: GroupbuyProduct }>(`/groupbuy/${id}`),

  // 공동구매 운영 통계 (WO-KPA-GROUPBUY-STATS-V1)
  getGroupbuyStats: () =>
    apiClient.get<{ success: boolean; data: GroupbuyStats }>('/groupbuy/stats'),

  // 공동구매 목록 (legacy campaign)
  getGroupbuys: (params?: {
    status?: 'upcoming' | 'active' | 'ended';
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    apiClient.get<PaginatedResponse<Groupbuy>>('/groupbuy', params),

  // 공동구매 상세
  getGroupbuy: (id: string) =>
    apiClient.get<ApiResponse<Groupbuy>>(`/groupbuy/${id}`),

  // 참여하기
  participate: (id: string, quantity: number) =>
    apiClient.post<ApiResponse<GroupbuyParticipation>>(`/groupbuy/${id}/participate`, {
      quantity,
    }),

  // 참여 취소
  cancelParticipation: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/groupbuy/${id}/participate`),

  // 내 참여 내역
  getMyParticipations: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<PaginatedResponse<GroupbuyParticipation>>('/groupbuy/my-participations', params),

  // 참여 상세
  getParticipation: (groupbuyId: string) =>
    apiClient.get<ApiResponse<GroupbuyParticipation>>(`/groupbuy/${groupbuyId}/my-participation`),
};
