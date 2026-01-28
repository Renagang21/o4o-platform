/**
 * Organization Join Request API
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 */

import { apiClient } from './client';
import type { OrganizationJoinRequest } from '../types/joinRequest';

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

export const joinRequestApi = {
  /** 가입/역할 요청 생성 */
  create: (data: {
    organizationId: string;
    requestType: string;
    requestedRole: string;
    requestedSubRole?: string;
    payload?: Record<string, any>;
  }) =>
    apiClient.post<ApiResponse<OrganizationJoinRequest>>(
      '/organization-join-requests',
      data
    ),

  /** 내 요청 목록 조회 */
  getMyRequests: (status?: string) =>
    apiClient.get<ApiResponse<OrganizationJoinRequest[]>>(
      '/organization-join-requests/my',
      status ? { status } : undefined
    ),

  /** 운영자용 대기 목록 조회 */
  getPending: (params?: { organizationId?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<OrganizationJoinRequest>>(
      '/organization-join-requests/pending',
      params as Record<string, string | number | boolean | undefined>
    ),

  /** 요청 승인 */
  approve: (id: string, reviewNote?: string) =>
    apiClient.patch<ApiResponse<OrganizationJoinRequest>>(
      `/organization-join-requests/${id}/approve`,
      { reviewNote }
    ),

  /** 요청 반려 */
  reject: (id: string, reviewNote?: string) =>
    apiClient.patch<ApiResponse<OrganizationJoinRequest>>(
      `/organization-join-requests/${id}/reject`,
      { reviewNote }
    ),
};
