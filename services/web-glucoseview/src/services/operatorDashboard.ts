/**
 * GlucoseView Operator Dashboard API Client
 *
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1:
 *   Calls /api/v1/glucoseview/operator/dashboard — returns 5-block OperatorDashboardConfig.
 */

import { api } from '../lib/apiClient';
import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';

export async function fetchOperatorDashboard(): Promise<OperatorDashboardConfig | null> {
  try {
    const response = await api.get('/glucoseview/operator/dashboard');
    return response.data?.data ?? null;
  } catch (error) {
    console.warn('[GlucoseView Operator Dashboard] Fetch failed:', error);
    return null;
  }
}
