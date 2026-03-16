/**
 * GlycoPharm Operator Dashboard API Client
 *
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1:
 *   Calls /api/v1/glycopharm/operator/dashboard — returns 5-block OperatorDashboardConfig.
 *   Replaces inline buildDashboardConfig() transform.
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 */

import { api } from '@/lib/apiClient';
import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';

export async function fetchOperatorDashboard(): Promise<OperatorDashboardConfig | null> {
  try {
    const response = await api.get('/glycopharm/operator/dashboard');
    return response.data?.data ?? null;
  } catch (error) {
    console.warn('[GlycoPharm Operator Dashboard] Fetch failed:', error);
    return null;
  }
}
