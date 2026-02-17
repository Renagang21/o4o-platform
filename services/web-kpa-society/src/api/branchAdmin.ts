/**
 * Branch Admin API - 분회 관리자용 API 서비스
 *
 * WO-KPA-OPERATOR-DASHBOARD-IMPROVEMENT-V1
 * 분회 운영자 대시보드에서 사용하는 API
 */

import { apiClient } from './client';

// Types
// WO-O4O-API-STRUCTURE-NORMALIZATION-PHASE2-V1: placeholder 필드 제거
export interface BranchDashboardStats {
  totalMembers: number;
  activeMembers: number;
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

// WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1: CRUD types
export interface BranchNews {
  id: string;
  organization_id: string;
  title: string;
  content: string | null;
  category: string;
  author: string | null;
  author_id: string | null;
  is_pinned: boolean;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface BranchOfficer {
  id: string;
  organization_id: string;
  name: string;
  position: string;
  role: string;
  pharmacy_name: string | null;
  phone: string | null;
  email: string | null;
  term_start: string | null;
  term_end: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BranchDoc {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number;
  is_public: boolean;
  download_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BranchSettings {
  id: string;
  organization_id: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  working_hours: string | null;
  description: string | null;
  membership_fee_deadline: string | null;
  annual_report_deadline: string | null;
  fee_settings: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const branchAdminApi = {
  // Dashboard
  getDashboardStats: () =>
    apiClient.get<{ data: BranchDashboardStats }>('/branch-admin/dashboard/stats'),

  getRecentActivities: (limit: number = 10) =>
    apiClient.get<{ data: RecentActivity[] }>(`/branch-admin/dashboard/activities?limit=${limit}`),

  getMemberStats: () =>
    apiClient.get<{ data: MemberStats }>('/branch-admin/dashboard/members'),

  // News CRUD
  getNews: (params?: { category?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: { items: BranchNews[]; total: number; page: number; limit: number } }>('/branch-admin/news', params as any),

  createNews: (data: { title: string; content?: string; category?: string; is_pinned?: boolean; is_published?: boolean }) =>
    apiClient.post<{ data: BranchNews }>('/branch-admin/news', data),

  updateNews: (id: string, data: Partial<Pick<BranchNews, 'title' | 'content' | 'category' | 'is_pinned' | 'is_published'>>) =>
    apiClient.patch<{ data: BranchNews }>(`/branch-admin/news/${id}`, data),

  deleteNews: (id: string) =>
    apiClient.delete(`/branch-admin/news/${id}`),

  // Officers CRUD
  getOfficers: () =>
    apiClient.get<{ data: BranchOfficer[] }>('/branch-admin/officers'),

  createOfficer: (data: { name: string; position: string; role: string; pharmacy_name?: string; phone?: string; email?: string; term_start?: string; term_end?: string; sort_order?: number }) =>
    apiClient.post<{ data: BranchOfficer }>('/branch-admin/officers', data),

  updateOfficer: (id: string, data: Partial<BranchOfficer>) =>
    apiClient.patch<{ data: BranchOfficer }>(`/branch-admin/officers/${id}`, data),

  deleteOfficer: (id: string) =>
    apiClient.delete(`/branch-admin/officers/${id}`),

  // Docs CRUD
  getDocs: (params?: { category?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: { items: BranchDoc[]; total: number; page: number; limit: number } }>('/branch-admin/docs', params as any),

  createDoc: (data: { title: string; description?: string; category?: string; file_url?: string; file_name?: string; file_size?: number; is_public?: boolean }) =>
    apiClient.post<{ data: BranchDoc }>('/branch-admin/docs', data),

  updateDoc: (id: string, data: Partial<BranchDoc>) =>
    apiClient.patch<{ data: BranchDoc }>(`/branch-admin/docs/${id}`, data),

  deleteDoc: (id: string) =>
    apiClient.delete(`/branch-admin/docs/${id}`),

  // Settings
  getSettings: () =>
    apiClient.get<{ data: { settings: BranchSettings; organization: any } }>('/branch-admin/settings'),

  updateSettings: (data: Partial<Pick<BranchSettings, 'address' | 'phone' | 'fax' | 'email' | 'working_hours' | 'description' | 'membership_fee_deadline' | 'annual_report_deadline' | 'fee_settings'>>) =>
    apiClient.patch<{ data: BranchSettings }>('/branch-admin/settings', data),

  updateStatus: (data: { is_active: boolean }) =>
    apiClient.patch<{ data: BranchSettings }>('/branch-admin/settings/status', data),
};
