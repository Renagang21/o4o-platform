/**
 * Platform Admin API client — WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1
 *
 * 기존 backend platform API 재사용(신규 API 없음):
 *   GET   /api/v1/admin/platform-accounts
 *   PATCH /api/v1/admin/platform-accounts/:id/password   { newPassword }
 *   PATCH /api/v1/admin/platform-accounts/:id/status     { isActive }
 *   GET   /api/v1/admin/platform-services
 * guard(backend): platform:admin / platform:super_admin (+ 서버측 SELF_LOCK / LAST_SUPER_ADMIN / SUPER_ADMIN_ONLY).
 */

import { api } from './client.js';

export interface PlatformAccount {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

/** 전체 사용자 read-only 행 (WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1, 안전 투영) */
export interface PlatformUser {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  status: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface PlatformUsersResult {
  data: PlatformUser[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface PlatformUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface PlatformService {
  id: string;
  code: string;
  name: string;
  shortDescription: string | null;
  entryUrl: string | null;
  serviceType: string;
  approvalRequired: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  status: string; // 'active' | 'hidden'
  iconEmoji: string | null;
}

/** axios 오류 → 사용자 메시지(권한 우회 없이 상태/서버 메시지 표시). */
function toError(err: any): Error {
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.error;
  if (status === 401) return new Error('로그인이 필요합니다.');
  if (status === 403) return new Error(typeof serverMsg === 'string' ? serverMsg : '이 영역은 O4O 플랫폼 관리자 권한이 필요합니다.');
  if (status === 404) return new Error(typeof serverMsg === 'string' ? serverMsg : '대상을 찾을 수 없습니다.');
  if (status === 400 || status === 422) return new Error(typeof serverMsg === 'string' ? serverMsg : '입력값을 확인해 주세요.');
  return new Error(typeof serverMsg === 'string' ? serverMsg : '서버 오류가 발생했습니다.');
}

export const platformAdminApi = {
  async getAccounts(): Promise<PlatformAccount[]> {
    try {
      const res = await api.get('/admin/platform-accounts');
      return res.data?.data ?? [];
    } catch (err) { throw toError(err); }
  },
  async resetPassword(id: string, newPassword: string): Promise<void> {
    try {
      await api.patch(`/admin/platform-accounts/${id}/password`, { newPassword });
    } catch (err) { throw toError(err); }
  },
  async setAccountStatus(id: string, isActive: boolean): Promise<void> {
    try {
      await api.patch(`/admin/platform-accounts/${id}/status`, { isActive });
    } catch (err) { throw toError(err); }
  },
  async getServices(): Promise<PlatformService[]> {
    try {
      const res = await api.get('/admin/platform-services');
      return res.data?.data ?? [];
    } catch (err) { throw toError(err); }
  },
  // WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1: 전체 사용자 read-only 조회(투영)
  async getUsers(params: PlatformUsersParams = {}): Promise<PlatformUsersResult> {
    try {
      const res = await api.get('/admin/platform-users', { params });
      return {
        data: res.data?.data ?? [],
        pagination: res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    } catch (err) { throw toError(err); }
  },
};
