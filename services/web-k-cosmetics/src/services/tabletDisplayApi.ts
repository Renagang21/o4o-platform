/**
 * Tablet Display API Client — Store Display Management
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 *
 * Service-scoped API: /api/v1/cosmetics/store/tablets
 * (WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1 축 A —
 *  서비스 중립 /api/v1/store/* 는 타 서비스 조직을 고를 수 있어 KCos 축으로 스코프)
 * Manages tablet device display configurations (supplier + local products).
 */

import { api } from '../lib/apiClient';
import type { LocalProduct } from './localProductApi';
import type {
  StoreTabletDisplayRow,
  StoreTabletPoolSupplierProductRow,
  StoreTabletProductPoolResponse,
  StoreTabletRow,
} from '@o4o/store-ui-core';

const BASE = '/cosmetics/store';

// ==================== Types ====================

/**
 * 태블릿 · 진열 · 상품 풀 · 채널 상태 계약은 `@o4o/store-ui-core` 가 정본이다.
 * 두 서비스가 같은 선언을 각자 들고 있던 것을 계약 하나로 모았다 —
 * WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1 (축 B).
 * 자체 상품(LocalProduct)만 서비스 소유라 제네릭 인자로 넘긴다.
 */
export type Tablet = StoreTabletRow;
export type DisplayItem = StoreTabletDisplayRow;
export type PoolSupplierProduct = StoreTabletPoolSupplierProductRow;
export type ProductPool = StoreTabletProductPoolResponse<LocalProduct>;

// ==================== API ====================

export async function fetchTablets(): Promise<Tablet[]> {
  const res = await api.get<{ success: boolean; data: Tablet[] }>(
    `${BASE}/tablets`,
  );
  return res.data.data;
}

export async function fetchTabletDisplays(
  tabletId: string,
): Promise<DisplayItem[]> {
  const res = await api.get<{ success: boolean; data: DisplayItem[] }>(
    `${BASE}/tablets/${tabletId}/displays`,
  );
  return res.data.data;
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
  const res = await api.put<{ success: boolean; data: DisplayItem[] }>(
    `${BASE}/tablets/${tabletId}/displays`,
    { displays },
  );
  return res.data.data;
}

export async function fetchProductPool(
  tabletId: string,
): Promise<ProductPool> {
  const res = await api.get<{ success: boolean; data: ProductPool }>(
    `${BASE}/tablets/${tabletId}/product-pool`,
  );
  return res.data.data;
}

// ==================== Idle Playlist (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1) ====================

import type { IdlePlaylistItem } from '@o4o/tablet-kiosk-core';

export async function fetchTabletIdlePlaylist(
  tabletId: string,
): Promise<IdlePlaylistItem[]> {
  const res = await api.get<{ success: boolean; data: { items: IdlePlaylistItem[] } }>(
    `${BASE}/tablets/${tabletId}/idle-playlist`,
  );
  return Array.isArray(res.data.data?.items) ? res.data.data.items : [];
}

export async function saveTabletIdlePlaylist(
  tabletId: string,
  items: IdlePlaylistItem[],
): Promise<IdlePlaylistItem[]> {
  const res = await api.put<{ success: boolean; data: { items: IdlePlaylistItem[] } }>(
    `${BASE}/tablets/${tabletId}/idle-playlist`,
    { items },
  );
  return Array.isArray(res.data.data?.items) ? res.data.data.items : [];
}
