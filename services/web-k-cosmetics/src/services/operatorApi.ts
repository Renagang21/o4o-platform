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

/**
 * WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1:
 * 백엔드 응답의 meta.featureStatus 를 읽어 orderMetricsReady 추가.
 * silent 0 거짓 신호 대신 UI 가 "준비 중" 안내로 분기할 수 있게 한다.
 */
export interface DashboardSummaryResult {
  config: OperatorDashboardConfig | null;
  orderMetricsReady: boolean;
}

export const operatorApi = {
  async getDashboardSummary(): Promise<DashboardSummaryResult> {
    try {
      const response = await api.get('/cosmetics/operator/dashboard');
      const body = response.data;
      return {
        config: (body?.data as OperatorDashboardConfig | undefined) ?? null,
        // not_ready 가 아니면 ready (응답 자체가 없거나 meta 부재면 기본 true — 본 WO 이전 동작 유지).
        orderMetricsReady: body?.meta?.featureStatus !== 'not_ready',
      };
    } catch (error) {
      console.error('[OperatorAPI] /cosmetics/operator/dashboard error:', error);
      return { config: null, orderMetricsReady: true };
    }
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
