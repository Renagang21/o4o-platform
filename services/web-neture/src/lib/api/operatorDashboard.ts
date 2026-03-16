/**
 * Neture Operator Dashboard API Client
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 5)
 *
 * Calls /api/v1/neture/operator/dashboard — returns 5-block OperatorDashboardConfig.
 * Replaces 8 separate operatorCopilotApi calls with a single endpoint.
 */

import { api } from '../apiClient';
import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';

export async function fetchOperatorDashboard(): Promise<OperatorDashboardConfig | null> {
  try {
    const response = await api.get('/neture/operator/dashboard');
    return response.data?.data ?? null;
  } catch (error) {
    console.warn('[Neture Operator Dashboard] Fetch failed:', error);
    return null;
  }
}
