/**
 * Pharmacy Products API Client — GlycoPharm
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 * WO-O4O-GLYCOPHARM-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1:
 *   KPA-Society canonical 정렬 — getCatalog 의 품목(category) 필터 제거,
 *   유통유형(distributionType / operatorView / recommended) 파라미터로 전환(공유 backend 동일 지원).
 *   카탈로그 기반 신청/제외(applyBySupplyProductId / cancelProductByOfferId) 추가.
 *
 * B2B 상품 카탈로그 조회 (Store HUB 상품 카탈로그용). 공유 컨트롤러
 * (o4o-store/pharmacy-products.controller) 가 service prefix(glycopharm)로 등록됨 — KPA 와 동일 백엔드.
 */

import { api } from '@/lib/apiClient';

export interface CatalogProduct {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  purpose: string;
  distributionType: string;
  /** 일반 공급가 (B2B) */
  priceGeneral: number | null;
  /** 서비스 공급가 (기준가) */
  priceGold: number | null;
  /** 소비자 참고가 */
  consumerReferencePrice: number | null;
  createdAt: string;
  updatedAt: string;
  supplierId: string;
  supplierName: string;
  supplierLogoUrl: string | null;
  supplierCategory: string | null;
  /** 내 매장 취급 여부 */
  isAdded: boolean;
}

export interface CatalogResponse {
  success: boolean;
  data: CatalogProduct[];
  pagination: { total: number; limit: number; offset: number };
}

/** 카탈로그 기반 신청 응답 (공유 컨트롤러 POST /apply) */
export interface ProductApplication {
  id: string;
  organization_id: string;
  service_key: string;
  status: 'pending' | 'approved' | 'rejected';
  [key: string]: unknown;
}

/**
 * 플랫폼 B2B 상품 카탈로그 조회 (유통유형 기준 — KPA canonical 정합)
 */
export async function getCatalog(params?: {
  distributionType?: string;
  recommended?: boolean;
  operatorView?: boolean;
  limit?: number;
  offset?: number;
}): Promise<CatalogResponse> {
  const searchParams = new URLSearchParams();
  if (params?.distributionType) searchParams.set('distributionType', params.distributionType);
  if (params?.recommended) searchParams.set('recommended', 'true');
  if (params?.operatorView) searchParams.set('operatorView', 'true');
  if (params?.limit != null) searchParams.set('limit', params.limit.toString());
  if (params?.offset != null) searchParams.set('offset', params.offset.toString());

  const queryString = searchParams.toString();
  const res = await api.get(`/glycopharm/pharmacy/products/catalog${queryString ? `?${queryString}` : ''}`);
  return res.data;
}

/**
 * 카탈로그 기반 상품 신청 (supplyProductId) — 공유 컨트롤러 POST /apply
 */
export async function applyBySupplyProductId(
  supplyProductId: string,
): Promise<{ success: boolean; data: ProductApplication }> {
  const res = await api.post('/glycopharm/pharmacy/products/apply', { supplyProductId });
  return res.data;
}

/**
 * 내 매장에서 상품 제외 (offer ID 기반) — 공유 컨트롤러 DELETE /by-offer/:offerId
 */
export async function cancelProductByOfferId(offerId: string): Promise<{ success: boolean }> {
  const res = await api.delete(`/glycopharm/pharmacy/products/by-offer/${offerId}`);
  return res.data;
}
