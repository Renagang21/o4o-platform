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

  /** V3: 일괄 승인 */
  batchApprove: (ids: string[], reviewNote?: string) =>
    apiClient.post<ApiResponse<{ results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> }>>(
      '/organization-join-requests/batch-approve',
      { ids, reviewNote }
    ),

  /** V3: 일괄 반려 */
  batchReject: (ids: string[], reviewNote?: string) =>
    apiClient.post<ApiResponse<{ results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> }>>(
      '/organization-join-requests/batch-reject',
      { ids, reviewNote }
    ),

  /** V3: AI 선택 요약 */
  aiSummarize: (items: Record<string, unknown>[], context?: string) =>
    apiClient.post<ApiResponse<{ summary: string; patterns: string[]; recommendations: string[]; warnings: string[]; source: 'ai' | 'rule-based' }>>(
      '/operator/ai/summarize-selection',
      { items, context }
    ),
};
