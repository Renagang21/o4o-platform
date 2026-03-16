/**
 * Store Hub API — GlycoPharm 통합 매장 허브
 * WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 */

import { api } from '@/lib/apiClient';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

export interface StoreHubOverview {
  organizationId: string;
  organizationName: string | null;
  products: {
    glycopharm: { totalCount: number; link: string };
  };
  contents: {
    slots: Array<{ serviceKey: string; slotKey: string; count: number; link: string }>;
    totalSlotCount: number;
  };
  signage: {
    pharmacy: { contentCount: number; activeCount: number; link: string };
  };
}

export type ChannelType = 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE';
export type ChannelStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';

export interface ChannelOverview {
  id: string;
  channelType: ChannelType;
  status: ChannelStatus;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  visibleProductCount: number;
  totalProductCount: number;
  salesLimitConfiguredCount: number;
}

export interface ChannelOverviewWithCode {
  channels: ChannelOverview[];
  organizationCode: string | null;
}

export interface StoreKpiSummary {
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  monthRevenue: number;
  avgOrderValue: number;
  lastMonthRevenue: number;
}

export interface LiveSignals {
  newOrders: number;
  pendingTabletRequests: number;
  pendingSalesRequests: number;
  surveyRequests: number;
}

// ─────────────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────────────

export async function fetchStoreHubOverview(): Promise<StoreHubOverview | null> {
  const res = await api.get('/glycopharm/store-hub/overview');
  return res.data?.data ?? null;
}

export async function fetchChannelOverview(): Promise<ChannelOverview[]> {
  const res = await api.get('/glycopharm/store-hub/channels');
  return res.data?.data ?? [];
}

export async function fetchChannelOverviewWithCode(): Promise<ChannelOverviewWithCode> {
  const res = await api.get('/glycopharm/store-hub/channels');
  return { channels: res.data?.data ?? [], organizationCode: res.data?.organizationCode ?? null };
}

export async function createChannel(channelType: ChannelType): Promise<ChannelOverview> {
  const res = await api.post('/glycopharm/store-hub/channels', { channelType });
  return res.data?.data;
}

export async function fetchStoreKpiSummary(): Promise<StoreKpiSummary> {
  const res = await api.get('/glycopharm/store-hub/kpi-summary');
  return res.data?.data ?? { todayOrders: 0, weekOrders: 0, monthOrders: 0, monthRevenue: 0, avgOrderValue: 0, lastMonthRevenue: 0 };
}

export async function fetchLiveSignals(): Promise<LiveSignals> {
  const res = await api.get('/glycopharm/store-hub/live-signals');
  return res.data?.data ?? { newOrders: 0, pendingTabletRequests: 0, pendingSalesRequests: 0, surveyRequests: 0 };
}

// ─────────────────────────────────────────────────────
// Store Capabilities (WO-O4O-CAPABILITY-MENU-INTEGRATION-V1)
// ─────────────────────────────────────────────────────

export interface StoreCapabilityOverview {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
  source: string;
}

export async function fetchStoreCapabilities(): Promise<StoreCapabilityOverview[]> {
  const res = await api.get('/glycopharm/store-hub/capabilities');
  return res.data?.data ?? [];
}
