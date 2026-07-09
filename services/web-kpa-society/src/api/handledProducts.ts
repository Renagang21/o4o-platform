/**
 * Handled Products API Client — "매장 취급제품" 통합 조회 (read-only)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1
 *
 * GET /api/v1/store/handled-products
 *   organization_product_listings(O4O 취급) + store_local_products(매장 자체) 통합 조회.
 *   매장 경영활용 제품의 온라인몰/상품설명은 구조적으로 'not_supported'.
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/v1/store`;

export type HandledProductSource = 'listing' | 'local';

// WO-O4O-KPA-STORE-HANDLED-PRODUCTS-DISPLAY-POOL-SIMPLIFY-V1:
//   제품 풀 화면에서 채널 상태(타블렛/온라인몰/상품설명) 컬럼을 제거 → 해당 필드도 응답/타입에서 제거.
//   채널 노출은 각 채널 메뉴에서 관리한다.
export interface HandledProduct {
  sourceType: HandledProductSource;
  sourceId: string;
  name: string;
  imageUrl: string | null;
  originLabel: string;
  ownerLabel: string;
  price: number | null;
  statusLabel: string;
  isActive: boolean;
  // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1: 연결된 자료함 콘텐츠 수(0 = 없음).
  linkedContentCount: number;
  updatedAt: string;
  managePath: string;
}

export interface HandledProductsResponse {
  success: boolean;
  data: {
    items: HandledProduct[];
    pagination: { page: number; limit: number; total: number };
  };
}

async function request<T>(url: string): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  let response = await fetch(url, { headers });
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      response = await fetch(url, { headers: { ...headers, Authorization: `Bearer ${newToken}` } });
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Network error' }));
    const error: any = new Error(body.error || body.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function fetchHandledProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  source?: 'all' | HandledProductSource;
}): Promise<HandledProductsResponse['data']> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  if (params?.source && params.source !== 'all') qs.set('source', params.source);
  const query = qs.toString();
  const res = await request<HandledProductsResponse>(`${BASE}/handled-products${query ? `?${query}` : ''}`);
  return res.data;
}

// ── WO-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-SELECTION-V1 ─────────────────────
// 매장 경영활용 제품(O4O 기반 listing)이 사용할 DESCRIPTION Resource(STORE/SUPPLIER_STORE) 선택.

export interface DescriptionSelectionItem {
  descriptionType: 'STORE' | 'SUPPLIER_STORE';
  label: string;
  descriptionId: string | null;
  status: string | null;
  exists: boolean;
  selected: boolean;
}

export interface DescriptionSelectionView {
  listingId: string;
  masterId: string;
  available: DescriptionSelectionItem[];
}

async function requestWithBody<T>(url: string, method: 'PUT', body: unknown): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const init: RequestInit = { method, headers, body: JSON.stringify(body) };
  let response = await fetch(url, init);
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      response = await fetch(url, { ...init, headers: { ...headers, Authorization: `Bearer ${newToken}` } });
    }
  }
  if (!response.ok) {
    const b = await response.json().catch(() => ({ message: 'Network error' }));
    const error: any = new Error(b.error || b.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

/** listing 의 사용 설명서 선택 현황 조회 */
export async function fetchDescriptionSelections(listingId: string): Promise<DescriptionSelectionView> {
  const res = await request<{ success: boolean; data: DescriptionSelectionView }>(
    `${BASE}/handled-products/${listingId}/description-selections`,
  );
  return res.data;
}

/** listing 의 사용 설명서 선택 저장 (선택할 descriptionId 배열) */
export async function saveDescriptionSelections(
  listingId: string,
  selectedDescriptionIds: string[],
): Promise<DescriptionSelectionView> {
  const res = await requestWithBody<{ success: boolean; data: DescriptionSelectionView }>(
    `${BASE}/handled-products/${listingId}/description-selections`,
    'PUT',
    { selectedDescriptionIds },
  );
  return res.data;
}
