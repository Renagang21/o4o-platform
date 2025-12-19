/**
 * yaksa-admin API Client
 *
 * Phase 1: Approval & Overview UI (Read / Approve Only)
 *
 * yaksa-admin은 데이터를 생성하지 않고,
 * 기존 서비스의 데이터를 조회하고 승인만 한다.
 *
 * [Scope Included]
 * - Membership Approval (membership-yaksa)
 * - Reporting Review (reporting-yaksa)
 * - Officer Assign (organization-core)
 * - Education Overview (lms-yaksa, READ ONLY)
 * - Fee Overview (annualfee-yaksa, READ ONLY)
 */

import { apiClient } from '../api-client';

// ============================================
// Types - Membership
// ============================================

export interface PendingMember {
  id: string;
  name: string;
  licenseNumber: string;
  organizationId: string;
  organizationName?: string;
  categoryId?: string;
  categoryName?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
}

export interface MemberVerification {
  id: string;
  memberId: string;
  memberName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface MemberListResponse {
  success: boolean;
  data: PendingMember[];
  total: number;
  page: number;
  limit: number;
}

// ============================================
// Types - Reporting
// ============================================

export interface YaksaReport {
  id: string;
  memberId: string;
  memberName?: string;
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  reportType: 'PROFILE_UPDATE' | 'LICENSE_CHANGE' | 'WORKPLACE_CHANGE' | 'AFFILIATION_CHANGE';
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListResponse {
  success: boolean;
  data: YaksaReport[];
  total: number;
  page: number;
  limit: number;
}

// ============================================
// Types - Organization / Officer
// ============================================

export interface OrganizationMember {
  id: string;
  userId: string;
  userName?: string;
  role: 'admin' | 'manager' | 'member' | 'moderator';
  position?: string;
  isPrimary: boolean;
  joinedAt: string;
}

export interface OrganizationMemberListResponse {
  success: boolean;
  data: OrganizationMember[];
  total: number;
}

// ============================================
// Types - Education (READ ONLY)
// ============================================

export interface EducationStats {
  organization: { id: string };
  assignments: {
    totalAssignments: number;
    completedAssignments: number;
    activeAssignments: number;
    overdueAssignments: number;
    completionRate: number;
    memberCount: number;
  };
  policies: {
    activeCount: number;
  };
  members: {
    totalProfiles: number;
    profilesRequiringRenewal: number;
    totalCreditsEarned: number;
    averageCreditsPerMember: number;
  };
}

export interface EducationStatsResponse {
  success: boolean;
  data: EducationStats;
}

// ============================================
// Types - Annual Fee (READ ONLY)
// ============================================

export interface FeePaymentStats {
  year: number;
  totalMembers: number;
  paidCount: number;
  unpaidCount: number;
  totalAmount: number;
  paidAmount: number;
  paymentRate: number;
}

export interface FeeStatsResponse {
  success: boolean;
  data: FeePaymentStats;
}

// ============================================
// API Functions - Membership Approval
// ============================================

/**
 * 승인 대기 회원 목록 조회
 */
export async function getPendingMembers(params: {
  organizationId: string;
  page?: number;
  limit?: number;
}): Promise<MemberListResponse> {
  const response = await apiClient.get('/api/membership/members', {
    params: {
      ...params,
      verificationStatus: 'pending',
    },
  });
  return response.data;
}

/**
 * 회원 검증 목록 조회
 */
export async function getVerifications(params: {
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: MemberVerification[]; total: number }> {
  const response = await apiClient.get('/api/membership/verifications', { params });
  return response.data;
}

/**
 * 회원 승인
 */
export async function approveMember(verificationId: string, data: {
  verifierId: string;
  notes?: string;
}): Promise<{ success: boolean }> {
  const response = await apiClient.patch(`/api/membership/verifications/${verificationId}/approve`, data);
  return response.data;
}

/**
 * 회원 반려
 */
export async function rejectMember(verificationId: string, data: {
  verifierId: string;
  reason: string;
}): Promise<{ success: boolean }> {
  const response = await apiClient.patch(`/api/membership/verifications/${verificationId}/reject`, data);
  return response.data;
}

// ============================================
// API Functions - Reporting Review
// ============================================

/**
 * 신상신고 목록 조회
 */
export async function getReports(params: {
  status?: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  reportType?: string;
  page?: number;
  limit?: number;
}): Promise<ReportListResponse> {
  const response = await apiClient.get('/api/v1/yaksa/reports', { params });
  return response.data;
}

/**
 * 신상신고 상세 조회
 */
export async function getReportDetail(reportId: string): Promise<{ success: boolean; data: YaksaReport }> {
  const response = await apiClient.get(`/api/v1/yaksa/reports/${reportId}`);
  return response.data;
}

/**
 * 신상신고 승인
 */
export async function approveReport(reportId: string): Promise<{ success: boolean }> {
  const response = await apiClient.post(`/api/v1/yaksa/reports/${reportId}/approve`);
  return response.data;
}

/**
 * 신상신고 반려
 */
export async function rejectReport(reportId: string, reason: string): Promise<{ success: boolean }> {
  const response = await apiClient.post(`/api/v1/yaksa/reports/${reportId}/reject`, { reason });
  return response.data;
}

// ============================================
// API Functions - Officer Management
// ============================================

/**
 * 조직 회원 목록 조회
 */
export async function getOrganizationMembers(organizationId: string, params?: {
  role?: string;
  page?: number;
  limit?: number;
}): Promise<OrganizationMemberListResponse> {
  const response = await apiClient.get(`/api/organization/organizations/${organizationId}/members`, { params });
  return response.data;
}

/**
 * 회원 역할 변경
 */
export async function updateMemberRole(organizationId: string, userId: string, data: {
  role: 'admin' | 'manager' | 'member' | 'moderator';
  isPrimary?: boolean;
}): Promise<{ success: boolean }> {
  const response = await apiClient.put(`/api/organization/organizations/${organizationId}/members/${userId}`, data);
  return response.data;
}

// ============================================
// API Functions - Education Overview (READ ONLY)
// ============================================

/**
 * 교육 이수 현황 통계 조회
 */
export async function getEducationStats(organizationId: string): Promise<EducationStatsResponse> {
  const response = await apiClient.get('/api/v1/lms-yaksa/admin/stats', {
    params: { organizationId },
  });
  return response.data;
}

/**
 * 교육 대시보드 조회
 */
export async function getEducationDashboard(organizationId: string): Promise<EducationStatsResponse> {
  const response = await apiClient.get('/api/v1/lms-yaksa/admin/dashboard', {
    params: { organizationId },
  });
  return response.data;
}

// ============================================
// API Functions - Fee Overview (READ ONLY)
// ============================================

/**
 * 회비 납부 통계 조회
 */
export async function getFeeStats(params: {
  year?: number;
  organizationId?: string;
}): Promise<FeeStatsResponse> {
  const response = await apiClient.get('/api/annualfee/payments/statistics', { params });
  return response.data;
}

/**
 * 회원 회비 납부 상태 조회
 */
export async function getMemberFeeStatus(memberId: string, year?: number): Promise<{
  success: boolean;
  data: {
    memberId: string;
    year: number;
    isPaid: boolean;
    amount: number;
    paidAt?: string;
  };
}> {
  const response = await apiClient.get(`/api/annualfee/members/${memberId}`, {
    params: { year },
  });
  return response.data;
}
