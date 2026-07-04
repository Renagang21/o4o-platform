/**
 * O4O Product DB API (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * 정부/공공데이터 기반 기본 상품 DB(read-only) admin 조회 client.
 * - ProductCandidate: GET /operator/product-candidates (+ :id)
 * - ProductMaster   : GET /neture/products/library/search (+ /:id)
 *
 * 원칙: read-only. 어떤 mutation endpoint 도 여기서 호출하지 않는다.
 * 검증 근거:
 *  - 후보 API 는 platform admin 에게 all=true 또는 serviceKey 를 요구한다
 *    (utils/serviceScope.ts resolveOperatorScope). platform 전역 조회를 위해 all=true 기본 전송.
 *  - 후보 목록 응답은 { success, data: { items, total } } — meta/page 없음.
 *  - master 검색 응답은 { success, data, meta{page,limit,total,totalPages} } — meta 사용.
 */

import { authClient } from '@o4o/auth-client';

// ─── ProductCandidate ──────────────────────────────────────────────────────

export interface ProductCandidateRow {
  id: string;
  serviceKey: string | null;
  organizationId: string | null;
  sourceType: string;
  sourceLabel: string | null;
  candidateStatus: string;
  matchStatus: string;
  matchedProductMasterId: string | null;
  identifierType: string | null;
  identifierValue: string | null;
  candidateName: string | null;
  candidateBrand: string | null;
  candidateManufacturer: string | null;
  candidateCategory: string | null;
  candidateSpec: string | null;
  candidateUnit: string | null;
  candidateImageUrl: string | null;
  candidatePrice: string | null;
  confidenceScore: string | null;
  rawPayload: Record<string, unknown> | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCandidateListParams {
  status?: string;
  matchStatus?: string;
  sourceType?: string;
  serviceKey?: string;
  page?: number;
  limit?: number;
}

export interface ProductCandidateListResult {
  items: ProductCandidateRow[];
  total: number;
}

/**
 * 후보 목록. platform admin 전역 조회를 위해 all=true 를 기본 전송한다.
 * serviceKey 를 지정하면 단일 서비스 스코프로 좁힌다 (all 대신 serviceKey 우선).
 */
export async function listProductCandidates(
  params: ProductCandidateListParams = {},
): Promise<ProductCandidateListResult> {
  const query: Record<string, string> = {};
  if (params.serviceKey) {
    query.serviceKey = params.serviceKey;
  } else {
    query.all = 'true'; // platform cross-service opt-in (감사 로그 기록됨)
  }
  if (params.status) query.status = params.status;
  if (params.matchStatus) query.matchStatus = params.matchStatus;
  if (params.sourceType) query.sourceType = params.sourceType;
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);

  const res = await authClient.api.get<{
    success: boolean;
    data: { items: ProductCandidateRow[]; total: number };
  }>(`/operator/product-candidates?${new URLSearchParams(query).toString()}`);

  return {
    items: res.data?.data?.items ?? [],
    total: res.data?.data?.total ?? 0,
  };
}

export async function getProductCandidate(id: string): Promise<ProductCandidateRow | null> {
  const res = await authClient.api.get<{ success: boolean; data: ProductCandidateRow }>(
    `/operator/product-candidates/${encodeURIComponent(id)}`,
  );
  return res.data?.data ?? null;
}

// ─── ProductMaster ─────────────────────────────────────────────────────────

export interface ProductMasterRow {
  id: string;
  barcode: string;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  specification: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  primaryImageUrl: string | null;
}

export interface ProductMasterListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductMasterListResult {
  items: ProductMasterRow[];
  meta: ProductMasterListMeta;
}

export interface ProductMasterListParams {
  q?: string;
  page?: number;
  limit?: number;
}

/**
 * 기본 상품(ProductMaster) 목록/검색.
 * 검증: 빈 q 는 전체 목록(이름순)을 반환하므로 검색어 없이도 브라우징 가능.
 * (admin 전용 목록 helper — 기존 searchProductMaster 는 빈 q 를 차단하므로 별도 함수.)
 */
export async function listProductMasters(
  params: ProductMasterListParams = {},
): Promise<ProductMasterListResult> {
  const query: Record<string, string> = {};
  if (params.q?.trim()) query.q = params.q.trim();
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);

  const res = await authClient.api.get<{
    success: boolean;
    data: ProductMasterRow[];
    meta: ProductMasterListMeta;
  }>(`/neture/products/library/search?${new URLSearchParams(query).toString()}`);

  return {
    items: res.data?.data ?? [],
    meta: res.data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export interface ProductMasterImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  type: string;
}

export interface ProductMasterDetail {
  id: string;
  barcode: string;
  regulatoryType: string;
  regulatoryName: string;
  name: string;
  manufacturerName: string;
  brandName: string | null;
  specification: string | null;
  originCountry: string | null;
  tags: string[];
  isMfdsVerified: boolean;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  images: ProductMasterImage[];
  createdAt: string;
}

export async function getProductMaster(id: string): Promise<ProductMasterDetail | null> {
  const res = await authClient.api.get<{ success: boolean; data: ProductMasterDetail }>(
    `/neture/products/library/${encodeURIComponent(id)}`,
  );
  return res.data?.data ?? null;
}
