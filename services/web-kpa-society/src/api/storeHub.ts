/**
 * Store Hub API — 통합 매장 허브
 *
 * WO-STORE-HUB-UNIFIED-RENDERING-PHASE1-V1
 */

import { apiClient } from './client';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

export interface StoreHubOverview {
  organizationId: string;
  organizationName: string | null;
  products: {
    glycopharm: { totalCount: number; link: string };
    cosmetics: { listedCount: number; link: string };
  };
  contents: {
    slots: Array<{
      serviceKey: string;
      slotKey: string;
      count: number;
      link: string;
    }>;
    totalSlotCount: number;
  };
  signage: {
    pharmacy: { contentCount: number; activeCount: number; link: string };
  };
}

// ─────────────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────────────

export async function fetchStoreHubOverview(): Promise<StoreHubOverview | null> {
  const response = await apiClient.get<{ success: boolean; data: StoreHubOverview | null }>(
    '/store-hub/overview'
  );
  return response.data;
}

// ─────────────────────────────────────────────────────
// Channel Layer (WO-PHARMACY-HUB-CHANNEL-LAYER-UI-V1)
// ─────────────────────────────────────────────────────

export type ChannelType = 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE';
export type ChannelStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';

export interface ChannelOverview {
  id: string;
  channelType: ChannelType;
  status: ChannelStatus;
  approvedAt: string | null;
  createdAt: string;
  visibleProductCount: number;
  totalProductCount: number;
  salesLimitConfiguredCount: number;
}

export async function fetchChannelOverview(): Promise<ChannelOverview[]> {
  const response = await apiClient.get<{ success: boolean; data: ChannelOverview[] }>(
    '/store-hub/channels'
  );
  return response.data ?? [];
}

// ─────────────────────────────────────────────────────
// Store KPI Summary (WO-O4O-STORE-KPI-REALDATA-V1)
// ─────────────────────────────────────────────────────

export interface StoreKpiSummary {
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  monthRevenue: number;
  avgOrderValue: number;
  lastMonthRevenue: number;
}

export async function fetchStoreKpiSummary(): Promise<StoreKpiSummary> {
  const response = await apiClient.get<{ success: boolean; data: StoreKpiSummary }>(
    '/store-hub/kpi-summary'
  );
  return response.data ?? {
    todayOrders: 0, weekOrders: 0, monthOrders: 0,
    monthRevenue: 0, avgOrderValue: 0, lastMonthRevenue: 0,
  };
}

// ─────────────────────────────────────────────────────
// Live Signals (WO-O4O-STORE-LIVE-SIGNAL-LAYER-V1)
// ─────────────────────────────────────────────────────

export interface LiveSignals {
  newOrders: number;
  pendingTabletRequests: number;
  pendingSalesRequests: number;
  surveyRequests: number;
}

const EMPTY_SIGNALS: LiveSignals = {
  newOrders: 0,
  pendingTabletRequests: 0,
  pendingSalesRequests: 0,
  surveyRequests: 0,
};

export async function fetchLiveSignals(): Promise<LiveSignals> {
  const response = await apiClient.get<{ success: boolean; data: LiveSignals }>(
    '/store-hub/live-signals'
  );
  return response.data ?? EMPTY_SIGNALS;
}
