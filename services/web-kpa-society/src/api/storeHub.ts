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
  updatedAt: string;
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

/** WO-CHANNEL-EXECUTION-CONSOLE-V1: includes organizationCode for storefront preview */
export interface ChannelOverviewWithCode {
  channels: ChannelOverview[];
  organizationCode: string | null;
}

export async function fetchChannelOverviewWithCode(): Promise<ChannelOverviewWithCode> {
  const response = await apiClient.get<{
    success: boolean;
    data: ChannelOverview[];
    organizationCode?: string | null;
  }>('/store-hub/channels');
  return {
    channels: response.data ?? [],
    organizationCode: response.organizationCode ?? null,
  };
}

// ─────────────────────────────────────────────────────
// Channel Creation (WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1)
// ─────────────────────────────────────────────────────

export async function createChannel(channelType: ChannelType): Promise<ChannelOverview> {
  const response = await apiClient.post<{ success: boolean; data: ChannelOverview }>(
    '/store-hub/channels',
    { channelType }
  );
  return response.data;
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

// ─────────────────────────────────────────────────────
// Store Capabilities (WO-O4O-STORE-CAPABILITY-SYSTEM-V1)
// ─────────────────────────────────────────────────────

export interface StoreCapabilityOverview {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
  source: string;
}

export async function fetchStoreCapabilities(): Promise<StoreCapabilityOverview[]> {
  const response = await apiClient.get<{ success: boolean; data: StoreCapabilityOverview[] }>(
    '/store-hub/capabilities'
  );
  return response.data ?? [];
}

// ─────────────────────────────────────────────────────
// Store Slug (WO-O4O-STORE-SLUG-EDITABLE-V1)
// ─────────────────────────────────────────────────────

export interface StoreSlugStatus {
  slug: string | null;
  isActive: boolean;
  canChange: boolean;
}

export interface StoreSlugChangeResult {
  slug: string;
  unchanged: boolean;
}

/**
 * Backend slug error codes — apiClient 가 4xx 응답을 throw 할 때
 * `(err as Error & { code?: string }).code` 로 식별 가능.
 */
export type StoreSlugErrorCode =
  | 'SLUG_RESERVED'
  | 'SLUG_DUPLICATE'
  | 'SLUG_INVALID'
  | 'SLUG_ALREADY_CHANGED'
  | 'INVALID_INPUT'
  | 'SERVICE_KEY_REQUIRED'
  | 'INTERNAL_ERROR';

export async function fetchStoreSlugStatus(): Promise<StoreSlugStatus> {
  const response = await apiClient.get<{ success: boolean; data: StoreSlugStatus }>(
    '/store-hub/slug'
  );
  return response.data ?? { slug: null, isActive: false, canChange: false };
}

/**
 * 매장 slug 변경. apiClient 가 4xx/5xx 응답을 throw — 호출처는 try/catch 로 (err as any).code 분기.
 */
export async function updateStoreSlug(newSlug: string): Promise<StoreSlugChangeResult> {
  const response = await apiClient.patch<{ success: boolean; data: StoreSlugChangeResult }>(
    '/store-hub/slug',
    { newSlug },
  );
  return response.data;
}
