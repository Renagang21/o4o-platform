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

  // ============================================================================
  // Steward API (WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1)
  // ============================================================================

  // Steward 목록 조회
  getStewards: (params?: { organization_id?: string; scope_type?: string; active_only?: boolean }) =>
    apiClient.get<{ data: Steward[]; total: number }>(`/stewards${buildQueryString(params)}`),

  // Steward 상세 조회
  getSteward: (id: string) =>
    apiClient.get<{ data: Steward }>(`/stewards/${id}`),

  // Steward 배정
  assignSteward: (data: AssignStewardDto) =>
    apiClient.post<{ data: Steward }>('/stewards', data),

  // Steward 해제
  revokeSteward: (id: string, note?: string) =>
    apiClient.patch<{ data: Steward }>(`/stewards/${id}/revoke`, { note }),

  // 특정 조직의 Steward 목록
  getStewardsByOrganization: (organizationId: string) =>
    apiClient.get<{ data: Steward[] }>(`/stewards/by-organization/${organizationId}`),

  // ============================================================================
  // Organization API (조직 관리 보강)
  // ============================================================================

  // 조직 목록 조회
  getOrganizations: (params?: { type?: string; parent_id?: string; active_only?: boolean }) =>
    apiClient.get<{ data: Organization[]; total: number }>(`/organizations${buildQueryString(params)}`),

  // 조직 상세 조회
  getOrganization: (id: string) =>
    apiClient.get<{ data: Organization }>(`/organizations/${id}`),

  // 조직 생성
  createOrganization: (data: CreateOrganizationDto) =>
    apiClient.post<{ data: Organization }>('/organizations', data),

  // 조직 수정
  updateOrganization: (id: string, data: UpdateOrganizationDto) =>
    apiClient.patch<{ data: Organization }>(`/organizations/${id}`, data),
};

// ============================================================================
// Types (WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1)
// ============================================================================

export type StewardScopeType = 'organization' | 'forum' | 'education' | 'content';

export interface Steward {
  id: string;
  organization_id: string;
  member_id: string;
  scope_type: StewardScopeType;
  scope_id: string | null;
  is_active: boolean;
  note: string | null;
  assigned_by: string;
  revoked_by: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  member?: Member;
}

export interface AssignStewardDto {
  organization_id: string;
  member_id: string;
  scope_type: StewardScopeType;
  scope_id?: string;
  note?: string;
}

export interface Organization {
  id: string;
  name: string;
  type: 'association' | 'branch' | 'group';
  parent_id: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent?: Organization;
  children?: Organization[];
}

export interface CreateOrganizationDto {
  name: string;
  type: 'association' | 'branch' | 'group';
  parent_id?: string;
  description?: string;
  address?: string;
  phone?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
}

export interface Member {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'member' | 'operator' | 'admin';
  status: 'pending' | 'active' | 'suspended' | 'withdrawn';
  license_number?: string;
  pharmacy_name?: string;
  pharmacy_address?: string;
  joined_at?: string;
  created_at: string;
  updated_at: string;
}
