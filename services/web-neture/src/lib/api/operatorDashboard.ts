/**
 * Neture Operator Dashboard API Client
 *
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 5)
 *
 * Calls /api/v1/neture/operator/dashboard — returns 5-block OperatorDashboardConfig.
 * Replaces 8 separate operatorCopilotApi calls with a single endpoint.
 */

import { API_BASE_URL } from './client.js';
import { getAccessToken } from '../../contexts/AuthContext';
import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchOperatorDashboard(): Promise<OperatorDashboardConfig | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/operator/dashboard`, {
      credentials: 'include',
      headers: authHeaders(),
    });
    if (!response.ok) {
      console.warn(`[Neture Operator Dashboard] HTTP ${response.status}`);
      return null;
    }
    const result = await response.json();
    return result.data ?? null;
  } catch (error) {
    console.warn('[Neture Operator Dashboard] Fetch failed:', error);
    return null;
  }
}
