/**
 * Groupbuy API 서비스
 */

import { apiClient } from './client';
import type {
  Groupbuy,
  GroupbuyParticipation,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export const groupbuyApi = {
  // 공동구매 목록
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
