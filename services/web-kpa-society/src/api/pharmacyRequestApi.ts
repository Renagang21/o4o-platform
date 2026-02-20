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

/**
 * Module-level approval cache
 *
 * WO-KPA-A-PHARMACY-TOKEN-STALE-FIX-V1
 *
 * PharmacyGuard와 PharmacyPage가 동일한 API를 호출하고,
 * AuthContext/OrganizationContext 재렌더링으로 컴포넌트가 반복 마운트될 때
 * 무한 루프를 방지한다.
 *
 * - 동시 in-flight 요청을 하나로 dedup
 * - 결과를 모듈 레벨에서 캐시 (컴포넌트 unmount 생존)
 * - 5분 TTL 후 자동 만료
 */
let _cachedItems: PharmacyRequest[] | null = null;
let _cacheTimestamp = 0;
let _inflightPromise: Promise<PharmacyRequest[]> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

export async function getMyRequestsCached(): Promise<PharmacyRequest[]> {
  // 캐시 유효 → 즉시 반환
  if (_cachedItems !== null && Date.now() - _cacheTimestamp < CACHE_TTL_MS) {
    return _cachedItems;
  }

  // 이미 진행 중인 요청이 있으면 같은 Promise 반환 (dedup)
  if (_inflightPromise) {
    return _inflightPromise;
  }

  _inflightPromise = pharmacyRequestApi
    .getMyRequests()
    .then((res) => {
      const items = res?.data?.items || [];
      _cachedItems = items;
      _cacheTimestamp = Date.now();
      _inflightPromise = null;
      return items;
    })
    .catch((err) => {
      _inflightPromise = null;
      throw err;
    });

  return _inflightPromise;
}

/** 캐시 무효화 (승인 후 재조회 필요 시) */
export function clearApprovalCache(): void {
  _cachedItems = null;
  _cacheTimestamp = 0;
  _inflightPromise = null;
}
