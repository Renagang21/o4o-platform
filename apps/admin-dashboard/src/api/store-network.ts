/**
 * Store Network Dashboard API Client
 *
 * WO-O4O-STORE-NETWORK-DASHBOARD-V1
 * Platform admin — cross-service store KPI aggregation
 */

import { authClient } from '@o4o/auth-client';

const api = authClient.api;

// ==================== Types ====================

export interface ServiceBreakdown {
  serviceType: string;
  storeCount: number;
  monthlyRevenue: number;
  monthlyOrders: number;
}

export interface NetworkSummary {
  totalStores: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  serviceBreakdown: ServiceBreakdown[];
}

export interface TopStore {
  storeId: string;
  storeName: string;
  serviceType: string;
  monthlyRevenue: number;
  monthlyOrders: number;
}

// ==================== API ====================

export async function fetchNetworkSummary(): Promise<NetworkSummary> {
  const res = await api.get<{ success: boolean; data: NetworkSummary }>(
    // WO-O4O-ADMIN-API-DOUBLE-PREFIX-FIX-V1: authClient base 가 이미 /api/v1 이라
    //   선행 '/v1' 을 붙이면 /api/v1/v1/... 로 404. 백엔드 mount 는
    //   register-routes.ts:306 app.use('/api/v1/admin/store-network', ...)
    '/admin/store-network/summary',
  );
  return res.data.data;
}

export async function fetchTopStores(limit = 10): Promise<TopStore[]> {
  const res = await api.get<{ success: boolean; data: TopStore[] }>(
    `/admin/store-network/top-stores?limit=${limit}`,
  );
  return res.data.data;
}
