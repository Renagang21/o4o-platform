/**
 * Tablet Display API Client — Store Display Management
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 *
 * Service-scoped API: /api/v1/glycopharm/store/tablets
 * (WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1 축 A —
 *  서비스 중립 /api/v1/store/* 는 타 서비스 조직을 고를 수 있어 GlycoPharm 축으로 스코프)
 * Manages tablet device display configurations (supplier + local products).
 */

import { api } from '@/lib/apiClient';
import type { LocalProduct } from './localProducts';
import type {
  StoreTabletChannelState,
  StoreTabletPoolSupplierProductRow,
} from '@o4o/store-ui-core';

const BASE = '/glycopharm/store';

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

/**
 * 공급 상품 행 · 채널 상태 계약은 `@o4o/store-ui-core` 가 정본이다.
 * WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1 (축 B)
 */
export type PoolSupplierProduct = StoreTabletPoolSupplierProductRow;

export interface ProductPool {
  supplierProducts: PoolSupplierProduct[];
  localProducts: LocalProduct[];
  tabletChannel?: StoreTabletChannelState | null;
}

// ==================== API ====================

export async function fetchTablets(): Promise<Tablet[]> {
  const res = await api.get(`${BASE}/tablets`);
  return res.data?.data;
}

export async function fetchTabletDisplays(
  tabletId: string,
): Promise<DisplayItem[]> {
  const res = await api.get(`${BASE}/tablets/${tabletId}/displays`);
  return res.data?.data;
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
  const res = await api.put(`${BASE}/tablets/${tabletId}/displays`, { displays });
  return res.data?.data;
}

export async function fetchProductPool(
  tabletId: string,
): Promise<ProductPool> {
  const res = await api.get(`${BASE}/tablets/${tabletId}/product-pool`);
  return res.data?.data;
}

// ==================== Idle Playlist (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1) ====================

import type { IdlePlaylistItem } from '@o4o/tablet-kiosk-core';

export async function fetchTabletIdlePlaylist(
  tabletId: string,
): Promise<IdlePlaylistItem[]> {
  const res = await api.get(`${BASE}/tablets/${tabletId}/idle-playlist`);
  return Array.isArray(res.data?.data?.items) ? res.data.data.items : [];
}

export async function saveTabletIdlePlaylist(
  tabletId: string,
  items: IdlePlaylistItem[],
): Promise<IdlePlaylistItem[]> {
  const res = await api.put(`${BASE}/tablets/${tabletId}/idle-playlist`, { items });
  return Array.isArray(res.data?.data?.items) ? res.data.data.items : [];
}
