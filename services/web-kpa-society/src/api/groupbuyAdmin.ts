/**
 * Groupbuy Admin API - 공동구매 운영자용 API 서비스
 *
 * WO-KPA-GROUPBUY-OPERATOR-UI-V1
 * WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1: 안정화
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

export interface GroupbuyStats {
  totalOrders: number;
  totalParticipants: number;
  dailyOrders: { date: string; count: number }[];
  productOrders: { productId: string; productName: string; orderCount: number }[];
  /** 캐시 정보 */
  cachedAt?: string;
  cacheValidUntil?: string;
}

/** API 에러 응답 */
export interface GroupbuyApiError {
  code: string;
  message: string;
}

export interface CreateGroupbuyProductDto {
  title: string;
  supplierName: string;
  conditionSummary: string;
  startDate: string;
  endDate: string;
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

export const groupbuyAdminApi = {
  /**
   * 공동구매 상품 목록 조회
   */
  getProducts: () =>
    apiClient.get<{ data: GroupbuyProduct[] }>('/groupbuy-admin/products'),

  /**
   * 공동구매 상품 추가
   */
  addProduct: (data: CreateGroupbuyProductDto) =>
    apiClient.post<{ data: GroupbuyProduct }>('/groupbuy-admin/products', data),

  /**
   * 공동구매 상품 제거
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
   * 상품 순서 변경
   */
  updateOrder: (id: string, order: number) =>
    apiClient.post<{ data: { id: string; order: number } }>(
      `/groupbuy-admin/products/${id}/order`,
      { order }
    ),

  /**
   * 공동구매 통계 조회
   */
  getStats: () =>
    apiClient.get<{ data: GroupbuyStats; _meta?: StatsMetaInfo }>('/groupbuy-admin/stats'),

  /**
   * 공급자 연계 상태 확인
   * WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1
   */
  getSupplierStatus: () =>
    apiClient.get<{ data: SupplierStatusResponse }>('/groupbuy-admin/supplier-status'),
};
