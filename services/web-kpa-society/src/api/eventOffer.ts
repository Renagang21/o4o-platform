/**
 * Event Offer API 서비스
 */

import { apiClient } from './client';
import type {
  LegacyEventOffer,
  EventOfferProduct,
  EventOfferStats,
  EventOfferParticipation,
  EventOfferItem,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export const eventOfferApi = {
  // 이벤트 상품 목록 (product listing 기반, WO-KPA-GROUPBUY-PAGE-V1)
  getEventOfferProducts: (params?: {
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<{
      success: boolean;
      data: EventOfferProduct[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/groupbuy', params),

  // 이벤트 상품 상세 (WO-KPA-GROUPBUY-PAGE-V1)
  getEventOfferProduct: (id: string) =>
    apiClient.get<{ success: boolean; data: EventOfferProduct }>(`/groupbuy/${id}`),

  // 이벤트 운영 통계 (WO-KPA-GROUPBUY-STATS-V1)
  getEventOfferStats: () =>
    apiClient.get<{ success: boolean; data: EventOfferStats }>('/groupbuy/stats'),

  // 이벤트 상품 목록 (enriched, WO-EVENT-OFFER-HUB-TABLE-AND-DIRECT-ORDER-REFINE-V1)
  // WO-EVENT-OFFER-HUB-TIME-WINDOW-FILTER-HOTFIX-V1: status 필터 추가
  getEnrichedOffers: (params?: {
    page?: number;
    limit?: number;
    status?: 'active' | 'ended' | 'all';
  }) =>
    apiClient.get<{
      success: boolean;
      data: EventOfferItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/groupbuy/enriched', params),

  // 이벤트 목록 (legacy campaign)
  getOffers: (params?: {
    status?: 'upcoming' | 'active' | 'ended';
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    apiClient.get<PaginatedResponse<LegacyEventOffer>>('/groupbuy', params),

  // 이벤트 상세
  getOffer: (id: string) =>
    apiClient.get<ApiResponse<LegacyEventOffer>>(`/groupbuy/${id}`),

  // 참여하기
  participate: (id: string, quantity: number) =>
    apiClient.post<ApiResponse<EventOfferParticipation>>(`/groupbuy/${id}/participate`, {
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
    apiClient.get<PaginatedResponse<EventOfferParticipation>>('/groupbuy/my-participations', params),

  // 참여 상세
  getParticipation: (offerId: string) =>
    apiClient.get<ApiResponse<EventOfferParticipation>>(`/groupbuy/${offerId}/my-participation`),
};
