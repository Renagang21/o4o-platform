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
    '/v1/admin/store-network/summary',
  );
  return res.data.data;
}

export async function fetchTopStores(limit = 10): Promise<TopStore[]> {
  const res = await api.get<{ success: boolean; data: TopStore[] }>(
    `/v1/admin/store-network/top-stores?limit=${limit}`,
  );
  return res.data.data;
}
