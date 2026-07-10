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
  // WO-O4O-KPA-STORE-HANDLED-PRODUCT-CATEGORY-COLUMN-V1: O4O 표준 분류(코드+표시 라벨). 분류 없으면 '미분류'.
  classificationCode: string;
  classificationLabel: string;
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

// WO-O4O-KPA-STORE-HANDLED-PRODUCT-REMOVE-AND-STATUS-AUDIT-V1:
//   선택 제품을 매장 경영활용 제품 목록에서 제거(상품 정보 삭제 아님, 경영활용 연결만 해제).
export interface RemoveHandledResult {
  removed: number;
  failed: Array<{ sourceType: string; sourceId: string; reason: string }>;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  let response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      response = await fetch(url, {
        method: 'POST',
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
        body: JSON.stringify(body),
      });
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

export async function removeHandledProducts(
  items: Array<{ sourceType: HandledProductSource; sourceId: string }>,
): Promise<RemoveHandledResult> {
  const res = await post<{ success: boolean; data: RemoveHandledResult }>(`${BASE}/handled-products/remove`, { items });
  return res.data;
}

// WO-O4O-KPA-STORE-PRODUCT-QR-ALWAYS-AVAILABLE-V1:
//   상품 기준 고정 QR(ProductMaster Landing) — 다국어 콘텐츠 유무와 무관하게 항상 발급/조회.
//   languages = 해당 상품의 canonical STORE 상세설명서 언어(제공 언어).
export interface HandledProductQr {
  qr: { publicKey: string; url: string; svg: string } | null;
  languages: string[];
  reason?: string;
}

export async function fetchHandledProductQr(
  sourceType: HandledProductSource,
  sourceId: string,
): Promise<HandledProductQr> {
  const qs = new URLSearchParams({ sourceType, sourceId });
  const res = await request<{ success: boolean; data: HandledProductQr }>(
    `${BASE}/handled-products/qr?${qs.toString()}`,
  );
  return res.data;
}

// WO-O4O-KPA-STORE-PRODUCT-QR-DOWNLOAD-AND-PRINT-SIZE-V1:
//   상품 QR 파일(png/svg/pdf) — pdf 는 지정 mm 라벨. 같은 상품 기준 고정 QR(데이터 재생성 아님).
export type QrExportFormat = 'png' | 'svg' | 'pdf';

export async function fetchHandledProductQrFile(
  sourceType: HandledProductSource,
  sourceId: string,
  format: QrExportFormat,
  sizeMm?: number,
): Promise<Blob> {
  const qs = new URLSearchParams({ sourceType, sourceId, format });
  if (sizeMm) qs.set('sizeMm', String(Math.round(sizeMm)));
  const url = `${BASE}/handled-products/qr/export?${qs.toString()}`;
  const token = getAccessToken();
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  let response = await fetch(url, { headers });
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) response = await fetch(url, { headers: { Authorization: `Bearer ${newToken}` } });
  }
  if (!response.ok) {
    const b = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(b?.error || b?.message || `HTTP ${response.status}`);
  }
  return response.blob();
}

