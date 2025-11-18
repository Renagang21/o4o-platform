/**
 * Admin Settlement API Client
 * Phase SETTLE-ADMIN: Admin 정산 관리 API
 */

import { authClient } from '@o4o/auth-client';
import type {
  GetAdminSettlementsQuery,
  GetAdminSettlementsResponse,
  GetAdminSettlementDetailResponse,
  AdminSettlementView,
  AdminSettlementDetail,
} from '../../types/settlement';

export const adminSettlementApi = {
  /**
   * 정산 목록 조회 (Admin 전용)
   */
  async fetchSettlements(
    query: GetAdminSettlementsQuery = {}
  ): Promise<GetAdminSettlementsResponse> {
    try {
      const params = new URLSearchParams();

      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.partyType && query.partyType !== 'ALL') {
        params.append('partyType', query.partyType);
      }
      if (query.status && query.status !== 'ALL') {
        params.append('status', query.status);
      }
      if (query.dateFrom) params.append('date_from', query.dateFrom);
      if (query.dateTo) params.append('date_to', query.dateTo);
      if (query.searchQuery) params.append('search', query.searchQuery);

      const response = await authClient.api.get<GetAdminSettlementsResponse>(
        `/admin/settlements?${params.toString()}`
      );

      return response.data;
    } catch (error: any) {
      console.error('[adminSettlementApi] fetchSettlements error:', error);
      throw error;
    }
  },

  /**
   * 정산 상세 조회 (Admin 전용)
   */
  async fetchSettlementDetail(
    settlementId: string
  ): Promise<GetAdminSettlementDetailResponse> {
    try {
      const response = await authClient.api.get<GetAdminSettlementDetailResponse>(
        `/admin/settlements/${settlementId}`
      );

      return response.data;
    } catch (error: any) {
      console.error('[adminSettlementApi] fetchSettlementDetail error:', error);
      throw error;
    }
  },

  /**
   * 정산 상태 변경 (Admin 전용)
   */
  async updateSettlementStatus(
    settlementId: string,
    status: string,
    notes?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await authClient.api.put(
        `/admin/settlements/${settlementId}/status`,
        { status, notes }
      );

      return {
        success: true,
        message: response.data?.message || '정산 상태가 업데이트되었습니다.',
      };
    } catch (error: any) {
      console.error('[adminSettlementApi] updateSettlementStatus error:', error);
      return {
        success: false,
        message: error.response?.data?.message || '상태 변경에 실패했습니다.',
      };
    }
  },

  /**
   * 정산 지급 처리 (Admin 전용)
   * SETTLE-2에서 구현 예정이지만, API 스텁은 미리 만들어둠
   */
  async markAsPaid(
    settlementId: string,
    paidAt?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await authClient.api.post(
        `/admin/settlements/${settlementId}/mark-paid`,
        { paidAt }
      );

      return {
        success: true,
        message: response.data?.message || '정산이 지급 완료 처리되었습니다.',
      };
    } catch (error: any) {
      console.error('[adminSettlementApi] markAsPaid error:', error);
      return {
        success: false,
        message: error.response?.data?.message || '지급 처리에 실패했습니다.',
      };
    }
  },

  /**
   * 정산 메모 업데이트 (Admin 전용)
   */
  async updateMemo(
    settlementId: string,
    memoInternal: string
  ): Promise<{ success: boolean; message?: string; data?: AdminSettlementDetail }> {
    try {
      const response = await authClient.api.put(
        `/admin/settlements/${settlementId}/memo`,
        { memo_internal: memoInternal }
      );

      return {
        success: true,
        message: '메모가 저장되었습니다.',
        data: response.data?.data,
      };
    } catch (error: any) {
      console.error('[adminSettlementApi] updateMemo error:', error);
      return {
        success: false,
        message: error.response?.data?.message || '메모 저장에 실패했습니다.',
      };
    }
  },

  /**
   * 배치 정산 생성 (Admin 전용)
   * 특정 기간에 대한 모든 Seller/Supplier 정산을 일괄 생성
   */
  async batchCreate(
    periodStart: string,
    periodEnd: string
  ): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const response = await authClient.api.post(`/admin/settlements/batch-create`, {
        period_start: periodStart,
        period_end: periodEnd,
      });

      return {
        success: true,
        message: response.data?.message || '배치 정산이 생성되었습니다.',
        data: response.data?.data,
      };
    } catch (error: any) {
      console.error('[adminSettlementApi] batchCreate error:', error);
      return {
        success: false,
        message: error.response?.data?.message || '배치 생성에 실패했습니다.',
      };
    }
  },
};
