/**
 * Channel Products API — 채널별 제품 진열 관리
 *
 * WO-CHANNEL-EXECUTION-CONSOLE-V1 Phase 1 + Phase 2
 */

import { apiClient } from './client';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

export interface ChannelProduct {
  id: string;
  productListingId: string;
  productName: string;
  retailPrice: number | null;
  serviceKey: string;
  isActive: boolean;
  displayOrder: number;
  listingActive: boolean;
  createdAt: string;
}

export interface AvailableProduct {
  id: string;
  productName: string;
  retailPrice: number | null;
  serviceKey: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────────────

export async function fetchChannelProducts(channelId: string): Promise<ChannelProduct[]> {
  const response = await apiClient.get<{ success: boolean; data: ChannelProduct[] }>(
    `/store-hub/channel-products/${channelId}`
  );
  return response.data ?? [];
}

export async function fetchAvailableProducts(channelId: string): Promise<AvailableProduct[]> {
  const response = await apiClient.get<{ success: boolean; data: AvailableProduct[] }>(
    `/store-hub/channel-products/${channelId}/available`
  );
  return response.data ?? [];
}

export async function addProductToChannel(
  channelId: string,
  productListingId: string
): Promise<{ id: string; reactivated: boolean }> {
  const response = await apiClient.post<{ success: boolean; data: { id: string; reactivated: boolean } }>(
    `/store-hub/channel-products/${channelId}`,
    { productListingId }
  );
  return response.data;
}

export async function deactivateChannelProduct(
  channelId: string,
  productChannelId: string
): Promise<void> {
  await apiClient.patch<{ success: boolean; data: { id: string; isActive: boolean } }>(
    `/store-hub/channel-products/${channelId}/${productChannelId}/deactivate`,
    {}
  );
}

export async function reorderChannelProducts(
  channelId: string,
  items: Array<{ id: string; displayOrder: number }>
): Promise<void> {
  await apiClient.patch<{ success: boolean; data: { updated: number } }>(
    `/store-hub/channel-products/${channelId}/reorder`,
    { items }
  );
}
