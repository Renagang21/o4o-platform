/**
 * Local Product API Client — Store Display Domain
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 *
 * Platform-level API: /api/v1/store/local-products
 * Local Products are Display Domain only — NOT Commerce Objects.
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/v1/store`;

// ==================== Types ====================

export type BadgeType = 'none' | 'new' | 'recommend' | 'event';

export interface LocalProduct {
  id: string;
  name: string;
  description: string | null;
  summary: string | null;
  /**
   * WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1:
   *   매장 상품 상세 설명의 canonical 저장 위치. 목록 응답은 raw SQL snake_case,
   *   POST/PUT 응답은 entity camelCase 이므로 소비처에서 둘 다 수용한다.
   */
  detail_html?: string | null;
  detailHtml?: string | null;
  category: string | null;
  // WO-O4O-KPA-STORE-LOCAL-PRODUCT-REGISTRATION-ENHANCEMENT-V1: 선택 입력 바코드(빈 값=null)
  barcode: string | null;
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
  /** WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1: 매장 소유 상세 설명 (부분 업데이트) */
  detailHtml?: string;
  category?: string;
  barcode?: string;
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

/**
 * WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1
 * 매장 자체 상품 단건 조회 (organization 격리). canonical POP 화면의 local prefill 전용.
 * 다른 조직 상품·미존재 → 404 (error.status === 404).
 */
export async function getLocalProduct(id: string): Promise<LocalProduct> {
  const res = await request<{ success: boolean; data: LocalProduct }>(
    `${BASE}/local-products/${id}`,
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
