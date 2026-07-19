/**
 * O4O Standard Products API Client — O4O 표준 상품(ProductMaster) 검색 + 매장 등록
 *
 * WO-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1
 *
 * 매장 경영자가 O4O 표준 상품 DB(ProductMaster)를 검색·조회하고,
 * 선택한 상품을 매장 경영활용 제품(O4O 기반 제품 listing)으로 등록한다.
 *
 * 백엔드(기존, 변경 없음):
 *   GET  /api/v1/store/products/search  — ProductMaster 검색 (store owner scope)
 *   POST /api/v1/store/products/list    — master 기반 등록 (offer_id=NULL, idempotent)
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/v1/store/products`;

/** 표시용 상품 분류(배지) — 백엔드 deriveProductClassification 파생 */
export interface ProductClassification {
  code: 'otc' | 'rx' | 'drug' | 'quasi' | 'health_functional' | 'medical_device' | 'cosmetic' | 'general' | 'unknown';
  label: string;
}

export interface O4oStandardProduct {
  id: string;
  barcode: string | null;
  name: string;
  regulatoryName: string | null;
  manufacturerName: string | null;
  specification: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  classification: ProductClassification | null;
  primaryImageUrl: string | null;
}

export interface O4oStandardProductsResult {
  items: O4oStandardProduct[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * WO-O4O-STORE-HANDLED-PRODUCTS-SKU-DISTINGUISHABILITY-IMPROVEMENT-V1
 * 동일 상품명의 ProductMaster 를 구분하기 위한 SKU 보조 라벨.
 *
 * 검색 응답에서 SKU 를 구분할 수 있는, 실제로 채워지는 유일한 필드는 `specification`
 * (약품규격/총수량/제형/포장형태를 ' / ' 로 결합한 원문 문자열, 예: "20밀리리터 / 6 / 시럽 / 포") 이다.
 * 개별 함량/제형/포장 컬럼은 검색 응답에 없고 원천도 대부분 비어 있으므로, 원문을 임의로
 * 구조화·재라벨하지 않고 **존재하는 토큰만** 정리해 노출한다.
 *
 * 규칙:
 *  - '/' 또는 '·' 로 분리 후 trim. 빈 값·의미 없는 토큰(없음/0/-/미상/undefined/null)은 제거.
 *  - 동일 토큰 중복 제거(순서 유지). 남은 값이 없으면 '' 반환(상품명만 표시).
 */
export function buildProductVariantLabel(product: { specification?: string | null }): string {
  const spec = product?.specification;
  if (!spec || typeof spec !== 'string') return '';
  const DROP = new Set(['', '없음', '0', '-', '미상', 'undefined', 'null', 'n/a', 'na']);
  const seen = new Set<string>();
  return spec
    .split(/[/·]/)
    .map((s) => s.trim())
    .filter((s) => s && !DROP.has(s.toLowerCase()))
    .filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
    .join(' · ');
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
    const body = await response.json().catch(() => ({ message: 'Network error' }));
    const err: any = new Error(body?.error?.message || body.error || body.message || `HTTP ${response.status}`);
    err.status = response.status;
    err.code = body?.error?.code;
    throw err;
  }
  return response.json();
}

/** O4O 표준 상품(ProductMaster) 검색. 빈 q 는 전체 목록(이름순). */
export async function searchO4oStandardProducts(params: {
  q?: string;
  /** 표시용 분류 필터 (배지 buckets). 미전달 시 전체. */
  classification?: string;
  page?: number;
  limit?: number;
}): Promise<O4oStandardProductsResult> {
  const qs = new URLSearchParams();
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.classification) qs.set('classification', params.classification);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 20));
  const res = await request<{ success: boolean; data: O4oStandardProduct[]; meta: O4oStandardProductsResult['meta'] }>(
    `${BASE}/search?${qs.toString()}`,
  );
  return {
    items: res.data ?? [],
    meta: res.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export interface RegisterMasterResult {
  success: boolean;
  message?: string; // 'ALREADY_LISTED' 이면 이미 등록됨
}

/** 선택한 O4O 표준 상품(master)을 매장 경영활용 제품(O4O 기반 제품 listing)으로 등록. idempotent. */
export async function registerStandardProductToStore(masterId: string): Promise<RegisterMasterResult> {
  const res = await request<{ success: boolean; message?: string }>(`${BASE}/list`, {
    method: 'POST',
    body: JSON.stringify({ masterId }),
  });
  return { success: res.success, message: res.message };
}
