/**
 * Handled Products API Client — "매장 취급제품" 통합 조회 (read-only)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1
 *
 * GET /api/v1/store/handled-products
 *   organization_product_listings(O4O 취급) + store_local_products(매장 자체) 통합 조회.
 *   매장 자체 제품의 온라인몰/상품설명은 구조적으로 'not_supported'.
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/v1/store`;

export type HandledProductSource = 'listing' | 'local';
export type TabletExposure = 'exposed' | 'partial' | 'not_exposed';
export type OnlineExposure = 'exposed' | 'inactive' | 'not_exposed' | 'not_supported';
export type DescriptionStatus = 'available' | 'none' | 'not_supported';

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
  tabletExposure: TabletExposure;
  onlineSalesExposure: OnlineExposure;
  productDescriptionStatus: DescriptionStatus;
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
