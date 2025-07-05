import axiosInstance from '../config/axios';
import { API_ENDPOINTS } from '../config/endpoints';
import {
  AdminStats,
  UserApprovalRequest,
  UserApprovalResponse,
  AdminUser,
  AdminUserListResponse,
  AdminUserListParams,
  SalesStats,
  ProductStats,
  UserStats,
} from './types';

export const adminApi = {
  // 대시보드 통계 조회
  getStats: async (): Promise<AdminStats> => {
    const response = await axiosInstance.get<AdminStats>(API_ENDPOINTS.ADMIN.STATS);
    return response.data;
  },

  // 사용자 목록 조회
  getUsers: async (params: AdminUserListParams): Promise<AdminUserListResponse> => {
    const response = await axiosInstance.get<AdminUserListResponse>(
      API_ENDPOINTS.ADMIN.USERS,
      { params }
    );
    return response.data;
  },

  // 사용자 승인 처리
  approveUser: async (id: string): Promise<UserApprovalResponse> => {
    const response = await axiosInstance.patch<UserApprovalResponse>(
      API_ENDPOINTS.ADMIN.APPROVE(id)
    );
    return response.data;
  },

  // 사용자 거절 처리
  rejectUser: async (id: string): Promise<UserApprovalResponse> => {
    const response = await axiosInstance.patch<UserApprovalResponse>(
      API_ENDPOINTS.ADMIN.APPROVE(id),
      { status: 'rejected' }
    );
    return response.data;
  },

  // 판매 통계 조회
  getSalesStats: async (): Promise<SalesStats> => {
    const response = await axiosInstance.get<SalesStats>('/api/admin/stats/sales');
    return response.data;
  },

  // 상품 통계 조회
  getProductStats: async (): Promise<ProductStats> => {
    const response = await axiosInstance.get<ProductStats>('/api/admin/stats/products');
    return response.data;
  },

  // 사용자 통계 조회
  getUserStats: async (): Promise<UserStats> => {
    const response = await axiosInstance.get<UserStats>('/api/admin/stats/users');
    return response.data;
  },

  // 사용자 역할 변경
  updateUserRole: async (userId: string, role: string): Promise<AdminUser> => {
    const response = await axiosInstance.patch<AdminUser>(
      `/api/admin/users/${userId}/role`,
      { role }
    );
    return response.data;
  },

  // 사용자 계정 비활성화
  deactivateUser: async (userId: string): Promise<AdminUser> => {
    const response = await axiosInstance.patch<AdminUser>(
      `/api/admin/users/${userId}/deactivate`
    );
    return response.data;
  },
}; 