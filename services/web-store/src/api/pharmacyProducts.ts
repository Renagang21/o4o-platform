/**
 * Pharmacy Products API Client
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 * WO-O4O-API-PHARMACY-B2B-CATALOG-V1: getCatalog + applyBySupplyProductId 추가
 *
 * GET  /pharmacy/products/catalog        — 플랫폼 B2B 상품 카탈로그
 * POST /pharmacy/products/apply          — 상품 판매 신청
 * GET  /pharmacy/products/applications   — 내 신청 목록
 * GET  /pharmacy/products/approved       — 승인된 상품 목록
 * GET  /pharmacy/products/listings       — 내 매장 진열 상품
 * PUT  /pharmacy/products/listings/:id   — 진열 상품 수정
 */

import { createSupplyCatalogApi } from '@o4o/store-ui-core';
import { apiClient } from './client';

export interface ProductApplication {
  id: string;
  organization_id: string;
  service_key: string;
  external_product_id: string;
  product_name: string;
  product_metadata: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductListing {
  id: string;
  organization_id: string;
  service_key: string;
  external_product_id: string;
  product_name: string;
  product_metadata: Record<string, unknown>;
  retail_price: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1:
  //   master_id+offer_id 리팩토링(WO-O4O-PRODUCT-MASTER-CORE-RESET-V1) 이후 실제 엔티티 필드.
  //   product_name/external_product_id 는 컬럼 제거됨(런타임 undefined) → offer_id 로 catalog 병합해 상품명 도출.
  offer_id?: string | null;
  master_id?: string;
  price?: number | null;
  status?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────
// Catalog (WO-O4O-API-PHARMACY-B2B-CATALOG-V1)
// ─────────────────────────────────────────────────────

export interface CatalogProduct {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  purpose: string;
  distributionType: string;
  /** 일반 공급가 (B2B) */
  priceGeneral: number | null;
  /** 서비스 공급가 (KPA 기준가) */
  priceGold: number | null;
  /** 소비자 참고가 */
  consumerReferencePrice: number | null;
  createdAt: string;
  updatedAt: string;
  supplierId: string;
  supplierName: string;
  supplierLogoUrl: string | null;
  supplierCategory: string | null;
  /** 내 매장 취급 여부 (WO-O4O-STORE-PRODUCT-STATUS-REMOVAL-V1) */
  isAdded: boolean;
  /** WO-O4O-KPA-STORE-HUB-HOME-LATEST-RESOURCE-FEED-V1: 대표 이미지(additive, 없으면 null). 홈 피드 카드용. */
  imageUrl?: string | null;
}

export interface CatalogResponse {
  success: boolean;
  data: CatalogProduct[];
  pagination: { total: number; limit: number; offset: number };
}

/**
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 (census F1):
 *   카탈로그 3 endpoint 의 경로·query·payload 구성을 공통 `createSupplyCatalogApi` 로 이관.
 *   KPA `apiClient` 는 base 가 `/api/v1/kpa` 이고 이미 body 를 반환하므로 언랩이 없다.
 *   service_key 는 전송하지 않는다(경로 기반 도출) — 종전과 동일.
 */
const catalogApi = createSupplyCatalogApi<
  CatalogResponse,
  { success: boolean; data: ProductApplication },
  { success: boolean }
>({
  get: (url) => apiClient.get(url),
  post: (url, body) => apiClient.post(url, body),
  delete: (url) => apiClient.delete(url),
});

/**
 * 플랫폼 B2B 상품 카탈로그 조회
 */
export async function getCatalog(params?: {
  category?: string;
  distributionType?: string;
  recommended?: boolean;
  operatorView?: boolean;
  limit?: number;
  offset?: number;
}): Promise<CatalogResponse> {
  return catalogApi.getCatalog(params);
}

// ─────────────────────────────────────────────────────
// 주문 가능 상품 통합 조회 (공급유형 탭)
// WO-O4O-KPA-STORE-ORDERABLE-PRODUCT-SOURCE-TABS-V1
// ─────────────────────────────────────────────────────

export type OrderableSourceType = 'b2b' | 'operator' | 'event_offer' | 'seller_recruitment';
export type OrderableSourceTab = 'all' | 'b2b' | 'operator' | 'event' | 'seller-recruitment';

export interface OrderableProduct {
  listingId: string;
  offerId: string | null;
  masterId: string | null;
  sourceType: OrderableSourceType;
  serviceKey: string;
  productName: string;
  category: string | null;
  supplierId: string | null;
  supplierName: string;
  supplierLogoUrl: string | null;
  unitPrice: number | null;
  eventPrice: number | null;
  consumerReferencePrice: number | null;
  startAt: string | null;
  endAt: string | null;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
  createdAt: string | null;
}

export interface OrderableResponse {
  success: boolean;
  data: OrderableProduct[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

/**
 * 주문 가능 상품 통합 조회 — 공급유형(source)별 권위 조회.
 * source: all | b2b | operator | event | seller-recruitment
 */
export async function getOrderable(params?: {
  source?: OrderableSourceTab;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<OrderableResponse> {
  return apiClient.get('/pharmacy/products/orderable', params);
}

/**
 * 상품 판매 신청 (카탈로그 기반 — supplyProductId)
 */
export async function applyBySupplyProductId(supplyProductId: string): Promise<{ success: boolean; data: ProductApplication }> {
  return catalogApi.applyBySupplyProductId(supplyProductId);
}

/**
 * 내 매장에서 상품 제외 (offer ID 기반)
 * WO-O4O-STORE-HUB-B2B-UI-REFINEMENT-V1
 */
export async function cancelProductByOfferId(offerId: string): Promise<{ success: boolean }> {
  return catalogApi.cancelProductByOfferId(offerId);
}

// WO-O4O-KPA-LEGACY-MANUAL-PRODUCT-APPLICATION-REMOVE-AND-LISTING-MANAGEMENT-PRESERVE-V1:
//   구형 수동 판매 신청(applyProduct: externalProductId 자유입력 → 항상 400 MISSING_PARAM)과
//   그 신청 내역 조회(getApplications)는 소비 화면 제거와 함께 삭제했다.
//   상품 추가의 canonical 경로는 카탈로그 기반 applyBySupplyProductId(offer.id) 이다.

/**
 * 승인된 상품 목록
 *
 * WO-O4O-STORE-HUB-PRODUCT-APPLY-APPROVAL-GATE-PARITY-V1 (HUB-P0-04):
 *   service_key 제거 — backend 가 마운트에서 도출하며 query 값은 무시한다.
 */
export async function getApprovedProducts(): Promise<{ success: boolean; data: ProductApplication[] }> {
  return apiClient.get('/pharmacy/products/approved');
}

/**
 * 내 매장 진열 상품 목록
 */
export async function getListings(params?: {
  service_key?: string;
}): Promise<{ success: boolean; data: ProductListing[] }> {
  return apiClient.get('/pharmacy/products/listings', params);
}

/**
 * 진열 상품 수정
 */
export async function updateListing(
  id: string,
  params: {
    retailPrice?: number;
    isActive?: boolean;
    displayOrder?: number;
    // WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1:
    //   백엔드 PUT /listings/:id 는 { id, organization_id, service_key } 로 listing 을 조회한다.
    //   혼합 도메인(all 탭) listing 활성화 시 해당 row 의 실제 service_key 를 전달해야 정확히 매칭된다.
    service_key?: string;
  }
): Promise<{ success: boolean; data: ProductListing }> {
  return apiClient.put(`/pharmacy/products/listings/${id}`, params);
}

// ─────────────────────────────────────────────────────
// Channel Settings (WO-PHARMACY-PRODUCT-CHANNEL-MANAGEMENT-V1)
// ─────────────────────────────────────────────────────

export interface ListingChannelSetting {
  channelId: string;
  channelType: 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';
  productChannelId: string | null;
  isVisible: boolean;
  salesLimit: number | null;
  displayOrder: number | null;
}

/**
 * 상품의 채널별 설정 조회
 *
 * WO-O4O-KPA-LISTING-CHANNEL-UPDATE-404-MINIMAL-FIX-V1:
 *   백엔드 GET /listings/:id/channels 는 { id, organization_id, service_key } 로 listing 을 조회하고
 *   service_key 미전달 시 'kpa-society' 로 기본값을 잡는다(resolveServiceKeyFromQuery).
 *   organization_product_listings.service_key 는 한 매장 안에서도 복수 값을 가지므로
 *   해당 row 의 실제 service_key 를 전달해야 404 NOT_FOUND 가 되지 않는다.
 */
export async function getListingChannels(
  listingId: string,
  serviceKey?: string
): Promise<{ success: boolean; data: ListingChannelSetting[] }> {
  return apiClient.get(
    `/pharmacy/products/listings/${listingId}/channels`,
    serviceKey ? { service_key: serviceKey } : undefined
  );
}

/**
 * 상품의 채널별 설정 저장
 *
 * WO-O4O-KPA-LISTING-CHANNEL-UPDATE-404-MINIMAL-FIX-V1:
 *   PUT 은 body 에서 service_key 를 읽는다(resolveServiceKeyFromBody). 조회와 동일 계약.
 */
export async function updateListingChannels(
  listingId: string,
  channels: Array<{
    channelId: string;
    isVisible: boolean;
    salesLimit?: number | null;
    displayOrder?: number;
  }>,
  serviceKey?: string
): Promise<{ success: boolean; data: { updated: number } }> {
  return apiClient.put(`/pharmacy/products/listings/${listingId}/channels`, {
    channels,
    ...(serviceKey ? { service_key: serviceKey } : {}),
  });
}
