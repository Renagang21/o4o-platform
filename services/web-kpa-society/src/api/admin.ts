/**
 * Admin API - KPA 관리자용 API
 *
 * WO-O4O-KPA-ADMIN-ORG-MANAGEMENT-DEADCODE-REMOVE-V1:
 * Steward/Organization 조직관리 API 제거.
 * 잔여: 대시보드 통계, 회원 목록, 승인 처리 (현재 미사용 — 보류)
 */

import { apiClient } from './client';

// 쿼리 파라미터 빌더
function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

interface DashboardStats {
  totalMembers: number;
  pendingApprovals: number;
}

export const adminApi = {
  // 대시보드 통계
  getDashboardStats: () =>
    apiClient.get<{ data: DashboardStats }>('/admin/dashboard/stats'),

  // 회원 목록 (관리자용)
  getMembers: (params?: { page?: number; limit?: number }) =>
    apiClient.get(`/admin/members${buildQueryString(params)}`),

  // 승인 대기 목록
  getPendingApprovals: () =>
    apiClient.get('/admin/approvals/pending'),

  // 가입 승인
  approveMember: (id: string) =>
    apiClient.post(`/admin/approvals/${id}/approve`),

  // 가입 거절
  rejectMember: (id: string, reason: string) =>
    apiClient.post(`/admin/approvals/${id}/reject`, { reason }),
};
