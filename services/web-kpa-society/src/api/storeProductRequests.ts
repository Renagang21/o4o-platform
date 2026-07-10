/**
 * Store Product Requests API Client — 매장 신규 상품 등록 요청 (P1)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 1)
 *
 * 매장 경영자가 O4O DB 에 없는 신규 상품의 등록을 요청·조회·재제출한다.
 * 저장소는 백엔드 product_candidates(source_type='store_web') 재사용.
 *
 * 백엔드:
 *   GET  /api/v1/store/product-requests      — 내 매장 요청 목록
 *   POST /api/v1/store/product-requests      — 요청 제출
 *   PUT  /api/v1/store/product-requests/:id  — 보완 요청 건 수정 재제출
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/v1/store/product-requests`;

/** 매장 표시 상태 (4버킷) */
export type StoreRequestDisplayStatus = 'reviewing' | 'revision_requested' | 'registered' | 'rejected';

export interface StoreProductRequest {
  id: string;
  productName: string | null;
  classification: { code: string; label: string };
  manufacturer: string | null;
  spec: string | null;
  unit: string | null;
  barcode: string | null;
  noBarcode: boolean;
  imageUrl: string | null;
  displayStatus: StoreRequestDisplayStatus;
  displayStatusLabel: string;
  reviewNote: string | null;
  matchedProductMasterId: string | null;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
}

/** 요청 제출/수정 입력 (상세설명·가격·재고·배송 없음 — WO 요구) */
export interface StoreProductRequestInput {
  productName: string;
  classification: string;
  barcode?: string;
  noBarcode?: boolean;
  manufacturer?: string;
  spec?: string;
  unit?: string;
  imageUrl?: string;
}

export interface StoreProductRequestsResult {
  items: StoreProductRequest[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** API 오류 — code 별 분기 + EXISTING_PRODUCT_FOUND 시 data(masterId/name) 전달 */
export interface StoreRequestApiError extends Error {
  status?: number;
  code?: string;
  data?: { masterId?: string; name?: string } | null;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string> | undefined),
  };
  let response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      response = await fetch(url, { ...options, headers: { ...headers, Authorization: `Bearer ${newToken}` } });
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: { message: 'Network error' } }));
    const err: StoreRequestApiError = new Error(body?.error?.message || body?.error || body?.message || `HTTP ${response.status}`);
    err.status = response.status;
    err.code = body?.error?.code;
    err.data = body?.data ?? null;
    throw err;
  }
  return response.json();
}

export async function listProductRequests(params: { page?: number; limit?: number } = {}): Promise<StoreProductRequestsResult> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 20));
  const res = await request<{ success: boolean; data: StoreProductRequest[]; meta: StoreProductRequestsResult['meta'] }>(
    `${BASE}?${qs.toString()}`,
  );
  return {
    items: res.data ?? [],
    meta: res.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export async function submitProductRequest(input: StoreProductRequestInput): Promise<StoreProductRequest> {
  const res = await request<{ success: boolean; data: StoreProductRequest }>(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function resubmitProductRequest(id: string, input: StoreProductRequestInput): Promise<StoreProductRequest> {
  const res = await request<{ success: boolean; data: StoreProductRequest }>(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return res.data;
}
