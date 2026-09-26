/**
 * Channel Products API — K-Cosmetics 채널별 제품 진열 관리
 * WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 */

import { api } from '../lib/apiClient';

async function request<T>(endpoint: string, options?: { method?: string; data?: any }): Promise<T> {
  const method = (options?.method || 'GET').toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete';

  let response;
  if (method === 'get' || method === 'delete') {
    response = await (api as any)[method](`/cosmetics${endpoint}`);
  } else {
    response = await (api as any)[method](`/cosmetics${endpoint}`, options?.data);
  }

  if (!response.data?.success && response.data?.success === false) {
    const err = response.data;
    throw { status: response.status, code: err.code, message: err.error || 'Request failed' };
  }
  return response.data;
}

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
  const res = await request<{ success: boolean; data: ChannelProduct[] }>(
    `/store-hub/channel-products/${channelId}`,
  );
  return res.data ?? [];
}

export async function fetchAvailableProducts(channelId: string): Promise<AvailableProduct[]> {
  const res = await request<{ success: boolean; data: AvailableProduct[] }>(
    `/store-hub/channel-products/${channelId}/available`,
  );
  return res.data ?? [];
}

export async function addProductToChannel(
  channelId: string,
  productListingId: string,
): Promise<{ id: string; reactivated: boolean }> {
  const res = await request<{ success: boolean; data: { id: string; reactivated: boolean } }>(
    `/store-hub/channel-products/${channelId}`,
    { method: 'POST', data: { productListingId } },
  );
  return res.data;
}

export async function deactivateChannelProduct(channelId: string, productChannelId: string): Promise<void> {
  await request<{ success: boolean }>(
    `/store-hub/channel-products/${channelId}/${productChannelId}/deactivate`,
    { method: 'PATCH', data: {} },
  );
}

export async function reorderChannelProducts(
  channelId: string,
  items: Array<{ id: string; displayOrder: number }>,
): Promise<void> {
  await request<{ success: boolean }>(
    `/store-hub/channel-products/${channelId}/reorder`,
    { method: 'PATCH', data: { items } },
  );
}
