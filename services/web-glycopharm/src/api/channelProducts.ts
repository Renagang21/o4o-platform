/**
 * Channel Products API — GlycoPharm 채널별 제품 진열 관리
 * WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1
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
    { method: 'POST', body: JSON.stringify({ productListingId }) },
  );
  return res.data;
}

export async function deactivateChannelProduct(channelId: string, productChannelId: string): Promise<void> {
  await request<{ success: boolean }>(
    `/store-hub/channel-products/${channelId}/${productChannelId}/deactivate`,
    { method: 'PATCH', body: JSON.stringify({}) },
  );
}

export async function reorderChannelProducts(
  channelId: string,
  items: Array<{ id: string; displayOrder: number }>,
): Promise<void> {
  await request<{ success: boolean }>(
    `/store-hub/channel-products/${channelId}/reorder`,
    { method: 'PATCH', body: JSON.stringify({ items }) },
  );
}
