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
