/**
 * Operator Dashboard API
 * K-Cosmetics 운영자 대시보드 API
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1:
 *   Switched to /cosmetics/operator/dashboard (5-block direct)
 */

import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';
import { api } from '../lib/apiClient';

export interface StoreMemberInfo {
  id: string;
  storeId: string;
  storeName: string;
  userId: string;
  role: string;
  isActive: boolean;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  createdAt: string;
}

async function fetchWithAuth<T>(endpoint: string, options?: { method?: string }): Promise<T | null> {
  try {
    const method = (options?.method || 'GET').toLowerCase();
    const response = method === 'patch'
      ? await api.patch(endpoint)
      : await api.get(endpoint);
    return response.data?.data || response.data || null;
  } catch (error) {
    console.error(`[OperatorAPI] ${endpoint} error:`, error);
    return null;
  }
}

export const operatorApi = {
  async getDashboardSummary(): Promise<OperatorDashboardConfig | null> {
    return fetchWithAuth<OperatorDashboardConfig>('/cosmetics/operator/dashboard');
  },

  async getMembers(includeInactive = false): Promise<StoreMemberInfo[] | null> {
    const qs = includeInactive ? '?includeInactive=true' : '';
    return fetchWithAuth<StoreMemberInfo[]>(`/cosmetics/stores/admin/members${qs}`);
  },

  async deactivateMember(memberId: string): Promise<boolean> {
    const result = await fetchWithAuth(`/cosmetics/stores/admin/members/${memberId}/deactivate`, {
      method: 'PATCH',
    });
    return result !== null;
  },

  async reactivateMember(memberId: string): Promise<boolean> {
    const result = await fetchWithAuth(`/cosmetics/stores/admin/members/${memberId}/reactivate`, {
      method: 'PATCH',
    });
    return result !== null;
  },
};
