/**
 * Pharmacy Products API — K-Cosmetics Store HUB 상품 카탈로그
 *
 * WO-O4O-HUB-TO-STORE-UX-BRIDGE-V1
 * WO-O4O-KCOS-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1:
 *   KPA-Society canonical 정렬 — getCatalog 의 품목(category) 필터 제거,
 *   유통유형(distributionType / operatorView / recommended) 파라미터로 전환(공유 backend 동일 지원).
 *   카탈로그 기반 신청/제외(applyBySupplyProductId / cancelProductByOfferId).
 *
 * 공유 컨트롤러(o4o-store/pharmacy-products.controller)가 /cosmetics 네임스페이스로 등록됨 — KPA 와 동일 backend.
 */

import { createSupplyCatalogApi } from '@o4o/store-ui-core';
import { api } from '../lib/apiClient';

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

/**
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 (census F1):
 *   카탈로그 3 endpoint 의 경로·query·payload 구성을 공통 `createSupplyCatalogApi` 로 이관.
 *   여기 남는 것은 `/cosmetics` prefix · axios `.data` 언랩 · canonical service_key 뿐이다.
 *   전송 URL·파라미터·응답 형상 무변경.
 */
const catalogApi = createSupplyCatalogApi<CatalogResponse, void, void>({
  get: <T,>(url: string) => (api as any).get(`/cosmetics${url}`).then((r: any) => r.data as T),
  post: <T,>(url: string, body?: unknown) =>
    (api as any).post(`/cosmetics${url}`, body).then((r: any) => r.data as T),
  delete: <T,>(url: string) => (api as any).delete(`/cosmetics${url}`).then((r: any) => r.data as T),
});

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
  return catalogApi.getCatalog({ ...params, service_key: 'k-cosmetics' });
}

/**
 * 카탈로그 기반 상품 신청 (supplyProductId) — 공유 컨트롤러 POST /apply
 *
 * WO-O4O-STORE-HUB-PRODUCT-APPLY-APPROVAL-GATE-PARITY-V1 (HUB-P0-04):
 *   service_key 는 body 로 보내지 않는다. 서비스 경계는 요청 경로(/cosmetics/*)가 결정하며,
 *   backend 가 마운트 serviceKey('cosmetics')에서 'k-cosmetics' 를 도출한다.
 */
export async function applyBySupplyProductId(supplyProductId: string): Promise<void> {
  await catalogApi.applyBySupplyProductId(supplyProductId);
}

/**
 * 내 매장에서 상품 제외 (offer ID 기반) — 공유 컨트롤러 DELETE /by-offer/:offerId
 */
export async function cancelProductByOfferId(offerId: string): Promise<void> {
  await catalogApi.cancelProductByOfferId(offerId);
}
