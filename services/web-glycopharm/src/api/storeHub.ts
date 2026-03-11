/**
 * Store Hub API — GlycoPharm 통합 매장 허브
 * WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1
 *
 * KPA storeHub.ts 패턴과 동일하지만 /api/v1/glycopharm/ 네임스페이스 사용
 */

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/glycopharm${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw { status: response.status, code: err.code, message: err.error || 'Request failed' };
  }
  return response.json();
}

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
  const res = await request<{ success: boolean; data: StoreHubOverview | null }>('/store-hub/overview');
  return res.data;
}

export async function fetchChannelOverview(): Promise<ChannelOverview[]> {
  const res = await request<{ success: boolean; data: ChannelOverview[] }>('/store-hub/channels');
  return res.data ?? [];
}

export async function fetchChannelOverviewWithCode(): Promise<ChannelOverviewWithCode> {
  const res = await request<{ success: boolean; data: ChannelOverview[]; organizationCode?: string | null }>(
    '/store-hub/channels',
  );
  return { channels: res.data ?? [], organizationCode: res.organizationCode ?? null };
}

export async function createChannel(channelType: ChannelType): Promise<ChannelOverview> {
  const res = await request<{ success: boolean; data: ChannelOverview }>('/store-hub/channels', {
    method: 'POST',
    body: JSON.stringify({ channelType }),
  });
  return res.data;
}

export async function fetchStoreKpiSummary(): Promise<StoreKpiSummary> {
  const res = await request<{ success: boolean; data: StoreKpiSummary }>('/store-hub/kpi-summary');
  return res.data ?? { todayOrders: 0, weekOrders: 0, monthOrders: 0, monthRevenue: 0, avgOrderValue: 0, lastMonthRevenue: 0 };
}

export async function fetchLiveSignals(): Promise<LiveSignals> {
  const res = await request<{ success: boolean; data: LiveSignals }>('/store-hub/live-signals');
  return res.data ?? { newOrders: 0, pendingTabletRequests: 0, pendingSalesRequests: 0, surveyRequests: 0 };
}
