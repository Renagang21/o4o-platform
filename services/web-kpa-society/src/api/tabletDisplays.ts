/**
 * Tablet Display API Client — Store Display Management
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 *
 * Platform-level API: /api/v1/store/tablets
 * Manages tablet device display configurations (supplier + local products).
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';
import type { LocalProduct } from './localProducts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/v1/store`;

// ==================== Types ====================

export interface Tablet {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DisplayItem {
  id?: string;
  product_type: 'supplier' | 'local';
  product_id: string;
  sort_order: number;
  is_visible: boolean;
  created_at?: string;
}

export interface PoolSupplierProduct {
  id: string;
  offer_id: string;
  product_name: string;
  retail_price: string;
  is_active: boolean;
  service_key: string;
  created_at: string;
}

export interface ProductPool {
  supplierProducts: PoolSupplierProduct[];
  localProducts: LocalProduct[];
}

// ==================== Helpers ====================

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      response = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Network error' }));
    const error: any = new Error(body.error || body.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = body.code;
    throw error;
  }

  return response.json();
}

// ==================== API ====================

export async function fetchTablets(): Promise<Tablet[]> {
  const res = await request<{ success: boolean; data: Tablet[] }>(
    `${BASE}/tablets`,
  );
  return res.data;
}

export async function createTablet(name: string, location?: string): Promise<Tablet> {
  const res = await request<{ success: boolean; data: Tablet }>(
    `${BASE}/tablets`,
    {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), location: location?.trim() || undefined }),
    },
  );
  return res.data;
}

export async function deleteTablet(id: string): Promise<void> {
  await request<{ success: boolean; data: unknown }>(
    `${BASE}/tablets/${id}`,
    { method: 'DELETE' },
  );
}

export async function fetchTabletDisplays(
  tabletId: string,
): Promise<DisplayItem[]> {
  const res = await request<{ success: boolean; data: DisplayItem[] }>(
    `${BASE}/tablets/${tabletId}/displays`,
  );
  return res.data;
}

export async function saveTabletDisplays(
  tabletId: string,
  displays: Array<{
    productType: 'supplier' | 'local';
    productId: string;
    sortOrder: number;
    isVisible?: boolean;
  }>,
): Promise<DisplayItem[]> {
  const res = await request<{ success: boolean; data: DisplayItem[] }>(
    `${BASE}/tablets/${tabletId}/displays`,
    { method: 'PUT', body: JSON.stringify({ displays }) },
  );
  return res.data;
}

export async function fetchProductPool(
  tabletId: string,
): Promise<ProductPool> {
  const res = await request<{ success: boolean; data: ProductPool }>(
    `${BASE}/tablets/${tabletId}/product-pool`,
  );
  return res.data;
}

// ==================== Idle Playlist (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1) ====================

import type { IdlePlaylistItem } from '@o4o/tablet-kiosk-core';

/**
 * Tablet idle playlist 조회 (admin).
 * 값이 없거나 에러 시 빈 배열 반환은 호출자가 처리.
 */
export async function fetchTabletIdlePlaylist(
  tabletId: string,
): Promise<IdlePlaylistItem[]> {
  const res = await request<{ success: boolean; data: { items: IdlePlaylistItem[] } }>(
    `${BASE}/tablets/${tabletId}/idle-playlist`,
  );
  return Array.isArray(res.data?.items) ? res.data.items : [];
}

/**
 * Tablet idle playlist 저장 (전체 교체).
 * 빈 배열 허용 — kiosk 는 placeholder 표시.
 */
export async function saveTabletIdlePlaylist(
  tabletId: string,
  items: IdlePlaylistItem[],
): Promise<IdlePlaylistItem[]> {
  const res = await request<{ success: boolean; data: { items: IdlePlaylistItem[] } }>(
    `${BASE}/tablets/${tabletId}/idle-playlist`,
    { method: 'PUT', body: JSON.stringify({ items }) },
  );
  return Array.isArray(res.data?.items) ? res.data.items : [];
}
