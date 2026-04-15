/**
 * Event Offer Admin API - 이벤트 운영자용 API 서비스
 *
 * WO-KPA-GROUPBUY-OPERATOR-UI-V1
 * WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1: 안정화
 * WO-EVENT-OFFER-OPERATOR-UX-REFINE-V1: available-offers, offerId 추가
 *
 * 캐시 정책:
 * - 통계 조회: 캐시 유효시간 10~30분
 * - 자동 백그라운드 수집 없음
 * - 운영자 화면 접근 시에만 조회
 */

import { apiClient } from './client';

// Types
export interface GroupbuyProduct {
  id: string;
  offerId: string;
  title: string;
  supplierName: string;
  conditionSummary: string;
  orderCount: number;
  participantCount: number;
  isVisible: boolean;
  order: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended';
}

export interface AvailableOffer {
  id: string;
  title: string;
  supplierName: string;
  price: number | null;
}

export interface AvailableOffersData {
  organizationId: string | null;
  offers: AvailableOffer[];
}

export interface GroupbuyStats {
  totalOrders: number;
  totalParticipants: number;
  dailyOrders: { date: string; count: number }[];
  productOrders: { productId: string; productName: string; orderCount: number }[];
  cachedAt?: string;
  cacheValidUntil?: string;
}

/** API 에러 응답 */
export interface GroupbuyApiError {
  code: string;
  message: string;
}

export interface CreateGroupbuyProductDto {
  offerId: string;
  // organizationId는 서버에서 kpa_members로 자동 주입
}

/** 공급자 연계 상태 */
export type SupplierConnectionStatus = 'connected' | 'disconnected' | 'degraded' | 'mock';

export interface SupplierStatusResponse {
  mode: SupplierConnectionStatus;
  connection: {
    status: SupplierConnectionStatus;
    latency?: number;
    error?: string;
  };
  checkedAt: string;
}

/** 통계 응답 메타 정보 (드라이런 검증용) */
export interface StatsMetaInfo {
  supplierStatus: SupplierConnectionStatus;
  fromCache: boolean;
  responseTime?: number;
}

export const eventOfferAdminApi = {
  /**
   * 등록 가능한 공급자 상품 목록 + 운영자 조직 ID
   * WO-EVENT-OFFER-OPERATOR-UX-REFINE-V1
   */
  getAvailableOffers: () =>
    apiClient.get<{ data: AvailableOffersData }>('/groupbuy-admin/available-offers'),

  /**
   * 이벤트 상품 목록
   */
  getProducts: () =>
    apiClient.get<{ data: GroupbuyProduct[] }>('/groupbuy-admin/products'),

  /**
   * 이벤트 상품 추가 (offerId만 전달, organizationId는 서버 자동 주입)
   */
  addProduct: (data: CreateGroupbuyProductDto) =>
    apiClient.post<{ data: GroupbuyProduct }>('/groupbuy-admin/products', data),

  /**
   * 이벤트 상품 제외 (소프트 삭제)
   */
  removeProduct: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/groupbuy-admin/products/${id}`),

  /**
   * 상품 노출/비노출 토글
   */
  toggleVisibility: (id: string, isVisible: boolean) =>
    apiClient.post<{ data: { id: string; isVisible: boolean } }>(
      `/groupbuy-admin/products/${id}/visibility`,
      { isVisible }
    ),

  /**
   * 상품 순서 변경 (display_order 미구현, echo 반환)
   */
  updateOrder: (id: string, order: number) =>
    apiClient.post<{ data: { id: string; order: number } }>(
      `/groupbuy-admin/products/${id}/order`,
      { order }
    ),

  /**
   * 이벤트 통계
   */
  getStats: () =>
    apiClient.get<{ data: GroupbuyStats; _meta?: StatsMetaInfo }>('/groupbuy-admin/stats'),

  /**
   * 공급자 연계 상태 확인
   */
  getSupplierStatus: () =>
    apiClient.get<{ data: SupplierStatusResponse }>('/groupbuy-admin/supplier-status'),
};
