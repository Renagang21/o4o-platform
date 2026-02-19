/**
 * Pharmacy Request API
 *
 * WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1
 *
 * 약국 서비스 신청 — 개인 신원 확장 (OrganizationJoinRequest에서 분리)
 * 조직 가입이 아니라 개인 속성(pharmacist_role) 변경.
 */

import { apiClient } from './client';

export interface PharmacyRequest {
  id: string;
  user_id: string;
  pharmacy_name: string;
  business_number: string;
  pharmacy_phone: string | null;
  owner_phone: string | null;
  tax_invoice_email: string | null;
  payload: Record<string, any> | null;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export const pharmacyRequestApi = {
  /** 약국 서비스 신청 */
  create: (data: {
    pharmacyName: string;
    businessNumber: string;
    pharmacyPhone?: string;
    ownerPhone?: string;
    taxInvoiceEmail?: string;
    payload?: Record<string, any>;
  }) =>
    apiClient.post<ApiResponse<PharmacyRequest>>(
      '/pharmacy-requests',
      data
    ),

  /** 내 신청 조회 */
  getMyRequests: () =>
    apiClient.get<ApiResponse<{ items: PharmacyRequest[] }>>(
      '/pharmacy-requests/my'
    ),

  /** 운영자용 대기 목록 조회 */
  getPending: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<PharmacyRequest>>(
      '/pharmacy-requests/pending',
      params as Record<string, string | number | boolean | undefined>
    ),

  /** 요청 승인 */
  approve: (id: string, reviewNote?: string) =>
    apiClient.patch<ApiResponse<PharmacyRequest>>(
      `/pharmacy-requests/${id}/approve`,
      { reviewNote }
    ),

  /** 요청 반려 */
  reject: (id: string, reviewNote?: string) =>
    apiClient.patch<ApiResponse<PharmacyRequest>>(
      `/pharmacy-requests/${id}/reject`,
      { reviewNote }
    ),
};
