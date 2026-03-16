/**
 * Tablet Display API Client — Store Display Management
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 *
 * Platform-level API: /api/v1/store/tablets
 * Manages tablet device display configurations (supplier + local products).
 */

import { api } from '../lib/apiClient';
import type { LocalProduct } from './localProductApi';

const BASE = '/store';

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
