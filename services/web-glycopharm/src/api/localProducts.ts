/**
 * Local Product API Client — Store Display Domain
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 *
 * Platform-level API: /api/v1/store/local-products
 * Local Products are Display Domain only — NOT Commerce Objects.
 */

import { api } from '@/lib/apiClient';

// ==================== Types ====================

export type BadgeType = 'none' | 'new' | 'recommend' | 'event';

export interface LocalProduct {
  id: string;
  name: string;
  description: string | null;
  summary: string | null;
  category: string | null;
  price_display: string | null;
  thumbnail_url: string | null;
  images: string[];
  gallery_images: string[];
  badge_type: BadgeType;
  highlight_flag: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LocalProductInput {
  name: string;
  description?: string;
  summary?: string;
  category?: string;
  priceDisplay?: string;
  thumbnailUrl?: string;
  images?: string[];
  galleryImages?: string[];
  badgeType?: BadgeType;
  highlightFlag?: boolean;
  sortOrder?: number;
}

export interface LocalProductListResponse {
  success: boolean;
  data: {
    items: LocalProduct[];
    total: number;
    page: number;
    limit: number;
  };
}

// ==================== CRUD ====================

export async function fetchLocalProducts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  activeOnly?: string;
  highlightOnly?: string;
}): Promise<{ items: LocalProduct[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.category) qs.set('category', params.category);
  if (params?.activeOnly !== undefined) qs.set('activeOnly', params.activeOnly);
  if (params?.highlightOnly) qs.set('highlightOnly', params.highlightOnly);

  const query = qs.toString();
  const res = await api.get(`/store/local-products${query ? `?${query}` : ''}`);
  return res.data?.data;
}

export async function createLocalProduct(
  data: LocalProductInput,
): Promise<LocalProduct> {
  const res = await api.post('/store/local-products', data);
  return res.data?.data;
}

export async function updateLocalProduct(
  id: string,
  data: Partial<LocalProductInput>,
): Promise<LocalProduct> {
  const res = await api.put(`/store/local-products/${id}`, data);
  return res.data?.data;
}

export async function deleteLocalProduct(id: string): Promise<void> {
  await api.delete(`/store/local-products/${id}`);
}
