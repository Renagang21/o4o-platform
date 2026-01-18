/**
 * Branch Admin API - 분회 관리자용 API 서비스
 *
 * WO-KPA-OPERATOR-DASHBOARD-IMPROVEMENT-V1
 * 분회 운영자 대시보드에서 사용하는 API
 */

import { apiClient } from './client';

// Types
export interface BranchDashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingAnnualReports: number;
  pendingMembershipFees: number;
  recentPosts: number;
  upcomingEvents: number;
}

export interface RecentActivity {
  id: string;
  type: 'annual_report' | 'membership_fee' | 'member_join' | 'post';
  title: string;
  date: string;
  status: 'pending' | 'completed' | 'rejected';
}

export interface MemberStats {
  total: number;
  byStatus: {
    active: number;
    pending: number;
    suspended: number;
  };
  byRole: {
    member: number;
    operator: number;
    admin: number;
  };
}

export const branchAdminApi = {
  /**
   * 분회 대시보드 통계 조회
   */
  getDashboardStats: () =>
    apiClient.get<{ data: BranchDashboardStats }>('/branch-admin/dashboard/stats'),

  /**
   * 분회 최근 활동 조회
   */
  getRecentActivities: (limit: number = 10) =>
    apiClient.get<{ data: RecentActivity[] }>(`/branch-admin/dashboard/activities?limit=${limit}`),

  /**
   * 분회 회원 통계 조회
   */
  getMemberStats: () =>
    apiClient.get<{ data: MemberStats }>('/branch-admin/dashboard/members'),
};
