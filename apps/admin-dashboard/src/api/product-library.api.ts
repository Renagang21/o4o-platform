/**
 * Product Library API
 *
 * WO-O4O-PRODUCT-INPUT-ASSIST-V1
 *
 * ProductMaster 라이브러리 검색 API.
 * GET /api/v1/neture/products/library/search
 */

import { authClient } from '@o4o/auth-client';

export interface ProductMasterSearchResult {
  id: string;
  barcode: string;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  regulatoryType: string;
  specification: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  primaryImageUrl: string | null;
}

export interface ProductMasterDetail extends ProductMasterSearchResult {
  brandName: string | null;
  originCountry: string | null;
  tags: string[];
  isMfdsVerified: boolean;
  mfdsPermitNumber?: string | null;
}

/**
 * 상품명/바코드/제조사 키워드로 ProductMaster를 검색한다.
 *
 * @param q     검색 키워드
 * @param limit 최대 결과 수 (기본값: 5)
 */
export async function searchProductMaster(
  q: string,
  limit = 5,
): Promise<ProductMasterSearchResult[]> {
  if (!q.trim()) return [];
  const res = await authClient.api.get<{
    success: boolean;
    data: ProductMasterSearchResult[];
  }>(`/neture/products/library/search?q=${encodeURIComponent(q.trim())}&limit=${limit}`);
  return res.data?.data ?? [];
}

// ─── Bulk Match ───────────────────────────────────────────────────────────────

export type MatchStatus = 'EXACT_MATCH' | 'SIMILAR_MATCH' | 'NOT_FOUND';

export interface MasterCandidate {
  id: string;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  barcode: string;
}

export interface MatchResult {
  rawName: string;
  normalizedName: string;
  status: MatchStatus;
  master?: MasterCandidate;
  candidates?: MasterCandidate[];
}

export interface BulkMatchResponse {
  success: boolean;
  data: MatchResult[];
  summary: {
    total: number;
    exactMatch: number;
    similarMatch: number;
    notFound: number;
  };
}

/**
 * XLSX/CSV 파일 또는 이름 배열로 ProductMaster 매칭 결과를 반환한다.
 * 배치 레코드 생성 없음 — 순수 preview 전용.
 */
export async function bulkMatchProducts(file: File): Promise<BulkMatchResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authClient.api.post<BulkMatchResponse>(
    '/neture/products/bulk-match',
    formData,
  );
  if (!res.data?.success) {
    throw new Error('Bulk match failed');
  }
  return res.data;
}

export async function bulkMatchNames(names: string[]): Promise<BulkMatchResponse> {
  const res = await authClient.api.post<BulkMatchResponse>(
    '/neture/products/bulk-match',
    { names },
  );
  if (!res.data?.success) {
    throw new Error('Bulk match failed');
  }
  return res.data;
}
