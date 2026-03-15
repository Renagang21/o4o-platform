/**
 * Local Product API Client — Store Display Domain
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 *
 * Platform-level API: /api/v1/store/local-products
 * Local Products are Display Domain only — NOT Commerce Objects.
 */

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/v1/store`;

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

// ==================== Helpers ====================

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers, credentials: 'include' });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Network error' }));
    const error: any = new Error(body.error || body.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = body.code;
    throw error;
  }

  return response.json();
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
  const res = await request<LocalProductListResponse>(
    `${BASE}/local-products${query ? `?${query}` : ''}`,
  );
  return res.data;
}

export async function createLocalProduct(
  data: LocalProductInput,
): Promise<LocalProduct> {
  const res = await request<{ success: boolean; data: LocalProduct }>(
    `${BASE}/local-products`,
    { method: 'POST', body: JSON.stringify(data) },
  );
  return res.data;
}

export async function updateLocalProduct(
  id: string,
  data: Partial<LocalProductInput>,
): Promise<LocalProduct> {
  const res = await request<{ success: boolean; data: LocalProduct }>(
    `${BASE}/local-products/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
  );
  return res.data;
}

export async function deleteLocalProduct(id: string): Promise<void> {
  await request<{ success: boolean }>(`${BASE}/local-products/${id}`, {
    method: 'DELETE',
  });
}
