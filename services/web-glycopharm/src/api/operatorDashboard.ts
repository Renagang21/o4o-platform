/**
 * GlycoPharm Operator Dashboard API Client
 *
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1:
 *   Calls /api/v1/glycopharm/operator/dashboard — returns 5-block OperatorDashboardConfig.
 *   Replaces inline buildDashboardConfig() transform.
 */

import { getAccessToken } from '@/contexts/AuthContext';
import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export async function fetchOperatorDashboard(): Promise<OperatorDashboardConfig | null> {
  try {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/glycopharm/operator/dashboard`, {
      credentials: 'include',
      headers,
    });
    if (!response.ok) {
      console.warn(`[GlycoPharm Operator Dashboard] HTTP ${response.status}`);
      return null;
    }
    const result = await response.json();
    return result.data ?? null;
  } catch (error) {
    console.warn('[GlycoPharm Operator Dashboard] Fetch failed:', error);
    return null;
  }
}
