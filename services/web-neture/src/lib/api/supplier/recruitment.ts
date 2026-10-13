import { api } from '../../apiClient';
import type { SupplierRecruitment, RecruitmentDetail } from './recruitment.types';
import {
  SUPPLIER_RECRUITMENTS_LOAD_FAILED,
  SUPPLIER_RECRUITMENT_NOT_FOUND,
  SUPPLIER_RECRUITMENT_APPLICATIONS_LOAD_FAILED,
  extractApiError,
  isNotFound,
} from './errors';

export const supplierRecruitmentApi = {
  // WO-O4O-SELLER-RECRUITMENT-SUPPLIER-STATUS-VIEW-V1
  // WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1:
  //   실패를 [] 로 삼키면 "모집 0건" 과 구분되지 않는다. 고정 코드로 throw 한다.
  async listMine(): Promise<SupplierRecruitment[]> {
    let response;
    try {
      response = await api.get('/neture/seller-recruitment/recruitments/mine');
    } catch (error) {
      console.warn('[Supplier Recruitment API] Failed to list:', extractApiError(error));
      throw new Error(SUPPLIER_RECRUITMENTS_LOAD_FAILED);
    }
    const rows = response.data?.data;
    if (!Array.isArray(rows)) {
      console.warn('[Supplier Recruitment API] Unexpected recruitments payload shape');
      throw new Error(SUPPLIER_RECRUITMENTS_LOAD_FAILED);
    }
    return rows as SupplierRecruitment[];
  },

  /**
   * WO-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1 (묶음 4)
   *
   * backend 계약(seller-recruitment.controller.ts): 404 NOT_FOUND(모집 미존재/타인 소유)
   * 와 500 INTERNAL_ERROR 를 구분한다. 200 은 항상 RecruitmentDetail 객체(신청 0건이면
   * applications:[]) → 200+null 성공 상태는 없다.
   * 404 는 전용 코드로, 그 외 조회 실패는 LOAD_FAILED 로 throw 해 화면이
   * "모집 없음" 과 "일시 오류(재시도)" 를 구분하게 한다.
   */
  async getApplications(recruitmentId: string): Promise<RecruitmentDetail> {
    let response;
    try {
      response = await api.get(
        `/neture/seller-recruitment/recruitments/${recruitmentId}/applications`,
      );
    } catch (error) {
      console.warn(
        '[Supplier Recruitment API] Failed to fetch applications:',
        extractApiError(error),
      );
      throw new Error(
        isNotFound(error)
          ? SUPPLIER_RECRUITMENT_NOT_FOUND
          : SUPPLIER_RECRUITMENT_APPLICATIONS_LOAD_FAILED,
      );
    }
    const data = response.data?.data;
    if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
      console.warn('[Supplier Recruitment API] Unexpected applications payload shape');
      throw new Error(SUPPLIER_RECRUITMENT_APPLICATIONS_LOAD_FAILED);
    }
    return data as RecruitmentDetail;
  },

  // 기존 승인/반려 엔드포인트 재사용 (ownership + C bridge backend 처리)
  async approveApplication(
    applicationId: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.post(
        `/neture/seller-recruitment/applications/${applicationId}/approve`,
      );
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'APPROVE_FAILED', message: d?.message };
    }
  },

  async rejectApplication(
    applicationId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.post(
        `/neture/seller-recruitment/applications/${applicationId}/reject`,
        { reason },
      );
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'REJECT_FAILED', message: d?.message };
    }
  },

  // WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1: 승인 판매자 참여 해지
  async terminateApplication(
    applicationId: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.post(
        `/neture/seller-recruitment/applications/${applicationId}/terminate`,
      );
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'TERMINATE_FAILED', message: d?.message };
    }
  },

  // WO-O4O-SELLER-RECRUITMENT-CLOSE-ACTION-V1: 모집 마감(신규 신청 차단)
  async close(
    recruitmentId: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.patch(
        `/neture/seller-recruitment/recruitments/${recruitmentId}/close`,
      );
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'CLOSE_FAILED', message: d?.message };
    }
  },

  // WO-O4O-SELLER-RECRUITMENT-REOPEN-ACTION-V1: 모집 재개(다시 신규 신청 가능)
  async reopen(
    recruitmentId: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await api.patch(
        `/neture/seller-recruitment/recruitments/${recruitmentId}/reopen`,
      );
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return { success: false, error: d?.error || 'REOPEN_FAILED', message: d?.message };
    }
  },

  async create(input: {
    masterId: string;
    // WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1:
    //   serviceKeys[](복수) 우선. serviceKey(단수)는 하위호환.
    serviceKey?: string;
    serviceKeys?: string[];
    commissionRate?: number;
    consumerPrice?: number;
    shopUrl?: string;
    imageUrl?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    data?: { id: string; recruitments?: Array<{ id: string; serviceId: string; status: string }> };
  }> {
    try {
      const response = await api.post('/neture/seller-recruitment/recruitments', input);
      return response.data;
    } catch (error: any) {
      const d = error?.response?.data;
      return {
        success: false,
        error: d?.error || 'CREATE_FAILED',
        message: d?.message || extractApiError(error),
      };
    }
  },
};
