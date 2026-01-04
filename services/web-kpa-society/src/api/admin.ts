/**
 * Admin API - 지부 관리자용 API
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

// 분회 타입
interface Branch {
  id: string;
  code: string;
  name: string;
  type: 'division' | 'branch';
  parentId?: string;
  level: number;
  path: string;
  isActive: boolean;
  memberCount?: number;
  officerCount?: number;
  metadata?: {
    address?: string;
    phone?: string;
    fax?: string;
    email?: string;
    workingHours?: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateBranchDto {
  name: string;
  code: string;
  type: 'branch';
  isActive?: boolean;
  metadata?: Branch['metadata'];
}

interface UpdateBranchDto {
  name?: string;
  isActive?: boolean;
  metadata?: Branch['metadata'];
}

interface DashboardStats {
  totalBranches: number;
  totalMembers: number;
  pendingApprovals: number;
  activeGroupbuys: number;
  recentPosts: number;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminApi = {
  // 대시보드 통계
  getDashboardStats: () =>
    apiClient.get<{ data: DashboardStats }>('/admin/dashboard/stats'),

  // 분회 목록
  getBranches: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ data: PaginatedResult<Branch> }>(`/admin/branches${buildQueryString(params)}`),

  // 분회 상세
  getBranch: (id: string) =>
    apiClient.get<{ data: Branch }>(`/admin/branches/${id}`),

  // 분회 생성
  createBranch: (data: CreateBranchDto) =>
    apiClient.post<{ data: Branch }>('/admin/branches', data),

  // 분회 수정
  updateBranch: (id: string, data: UpdateBranchDto) =>
    apiClient.patch<{ data: Branch }>(`/admin/branches/${id}`, data),

  // 분회 삭제
  deleteBranch: (id: string) =>
    apiClient.delete(`/admin/branches/${id}`),

  // 분회 활성화/비활성화
  toggleBranchActive: (id: string) =>
    apiClient.post(`/admin/branches/${id}/toggle-active`),

  // 회원 목록 (관리자용)
  getMembers: (params?: { branchId?: string; page?: number; limit?: number }) =>
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
