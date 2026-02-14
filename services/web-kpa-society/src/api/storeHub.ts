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
