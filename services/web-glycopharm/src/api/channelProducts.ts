/**
 * Channel Products API — GlycoPharm 채널별 제품 진열 관리
 * WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 */

import { api } from '@/lib/apiClient';

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
  const res = await api.get(`/glycopharm/store-hub/channel-products/${channelId}`);
  return res.data?.data ?? [];
}

export async function fetchAvailableProducts(channelId: string): Promise<AvailableProduct[]> {
  const res = await api.get(`/glycopharm/store-hub/channel-products/${channelId}/available`);
  return res.data?.data ?? [];
}

export async function addProductToChannel(
  channelId: string,
  productListingId: string,
): Promise<{ id: string; reactivated: boolean }> {
  const res = await api.post(`/glycopharm/store-hub/channel-products/${channelId}`, { productListingId });
  return res.data?.data;
}

export async function deactivateChannelProduct(channelId: string, productChannelId: string): Promise<void> {
  await api.patch(`/glycopharm/store-hub/channel-products/${channelId}/${productChannelId}/deactivate`, {});
}

export async function reorderChannelProducts(
  channelId: string,
  items: Array<{ id: string; displayOrder: number }>,
): Promise<void> {
  await api.patch(`/glycopharm/store-hub/channel-products/${channelId}/reorder`, { items });
}
