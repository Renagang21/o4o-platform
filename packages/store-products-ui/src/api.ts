/**
 * Store Products UI — API Client
 *
 * WO-O4O-STORE-PRODUCTS-UI-CORE-EXTRACTION-V1
 *
 * 매장 경영자가 ProductMaster를 검색하고,
 * OrganizationProductListing을 생성·관리하는 API 클라이언트.
 *
 * Base: /api/v1/store/products
 *
 * Backend gate: requireAuth + requireStoreOwner (role_assignments 기반)
 */

import { authClient } from '@o4o/auth-client';
import type {
  StoreProductSearchResult,
  StoreProductOffer,
  StoreListingItem,
  PaginatedResponse,
  ProductImageItem,
  StoreChannel,
  ChannelProductItem,
} from './types.js';

const BASE = '/api/v1/store/products';

// ── 검색/조회/등록 ──────────────────────────────────────────────────────────

/**
 * ProductMaster 검색 (바코드/상품명/제조사)
 */
export async function searchStoreProducts(
  q: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<StoreProductSearchResult>> {
  const params = new URLSearchParams({
    q,
    page: String(page),
    limit: String(limit),
  });
  const res = await authClient.api.get<PaginatedResponse<StoreProductSearchResult>>(
    `${BASE}/search?${params}`,
  );
  return res.data;
}

/**
 * 특정 ProductMaster의 APPROVED Offer 목록 조회
 */
export async function getMasterOffers(
  masterId: string,
): Promise<StoreProductOffer[]> {
  const res = await authClient.api.get<{ success: boolean; data: StoreProductOffer[] }>(
    `${BASE}/master/${masterId}/offers`,
  );
  return res.data?.data ?? [];
}

/**
 * 매장 상품 등록 (OrganizationProductListing 생성)
 *
 * WO-O4O-KPA-STORE-MY-PRODUCTS-FLOW-SIMPLIFY-V1:
 *   masterId 단독 전달 시 offer_id=NULL로 등록 (ProductMaster 기반).
 *   offerId 전달 시 기존 offer 기반 등록 흐름 유지.
 */
export async function createStoreListing(
  masterId: string,
  price?: number,
): Promise<{ success: boolean; data: StoreListingItem; message?: string }> {
  const body: Record<string, unknown> = { masterId };
  if (price != null) body.price = price;
  const res = await authClient.api.post<{
    success: boolean;
    data: StoreListingItem;
    message?: string;
  }>(`${BASE}/list`, body);
  return res.data;
}

/**
 * 내 매장 진열 목록 조회
 */
export async function getMyStoreListings(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<StoreListingItem>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await authClient.api.get<PaginatedResponse<StoreListingItem>>(
    `${BASE}?${params}`,
  );
  return res.data;
}

/**
 * 매장 상품 수정 (활성/비활성 토글, 가격 override)
 */
export async function updateStoreListing(
  id: string,
  body: { isActive?: boolean; price?: number | null },
): Promise<{ success: boolean; data: StoreListingItem }> {
  const res = await authClient.api.patch<{ success: boolean; data: StoreListingItem }>(
    `${BASE}/${id}`,
    body,
  );
  return res.data;
}

// ── 이미지 ──────────────────────────────────────────────────────────────────

/**
 * 상품 이미지 목록 조회
 */
export async function getMasterImages(masterId: string): Promise<ProductImageItem[]> {
  const res = await authClient.api.get<{ success: boolean; data: ProductImageItem[] }>(
    `${BASE}/master/${masterId}/images`,
  );
  return res.data?.data ?? [];
}

/**
 * URL → GCS 이미지 임포트 등록
 */
export async function importImageFromUrl(
  masterId: string,
  url: string,
  type: 'thumbnail' | 'detail' | 'content' = 'detail',
): Promise<{ success: boolean; data?: ProductImageItem; error?: { code: string; message: string } }> {
  const res = await authClient.api.post<{
    success: boolean;
    data?: ProductImageItem;
    error?: { code: string; message: string };
  }>(`${BASE}/master/${masterId}/images/from-url`, { url, type });
  return res.data;
}

/**
 * 이미지 정렬 순서 일괄 저장
 */
export async function reorderImages(
  items: { id: string; sortOrder: number }[],
): Promise<{ success: boolean }> {
  const res = await authClient.api.patch<{ success: boolean }>(
    `${BASE}/images/reorder`,
    { items },
  );
  return res.data;
}

/**
 * 대표 이미지 지정
 */
export async function setImagePrimary(imageId: string): Promise<{ success: boolean }> {
  const res = await authClient.api.patch<{ success: boolean }>(
    `${BASE}/images/${imageId}/primary`,
  );
  return res.data;
}

/**
 * 이미지 삭제
 */
export async function deleteImage(imageId: string): Promise<{ success: boolean }> {
  const res = await authClient.api.delete<{ success: boolean }>(
    `${BASE}/images/${imageId}`,
  );
  return res.data;
}

// ── 채널 ────────────────────────────────────────────────────────────────────

/**
 * 내 매장 채널 목록 (B2C/KIOSK)
 */
export async function getMyChannels(): Promise<StoreChannel[]> {
  const res = await authClient.api.get<{ success: boolean; data: StoreChannel[] }>(
    `${BASE}/my-channels`,
  );
  return res.data?.data ?? [];
}

/**
 * 특정 채널에 등록된 제품 목록
 */
export async function getChannelProducts(channelId: string): Promise<ChannelProductItem[]> {
  const res = await authClient.api.get<{ success: boolean; data: ChannelProductItem[] }>(
    `/api/v1/store/channel-products/${channelId}`,
  );
  return res.data?.data ?? [];
}

/**
 * 채널에 제품 등록
 */
export async function addProductToChannel(
  channelId: string,
  productListingId: string,
): Promise<{ success: boolean; data: { id: string; reactivated: boolean } }> {
  const res = await authClient.api.post<{
    success: boolean;
    data: { id: string; reactivated: boolean };
  }>(`/api/v1/store/channel-products/${channelId}`, { productListingId });
  return res.data;
}

/**
 * 채널 제품 활성/비활성
 */
export async function toggleChannelProduct(
  channelId: string,
  productChannelId: string,
  activate: boolean,
): Promise<{ success: boolean }> {
  const action = activate ? 'activate' : 'deactivate';
  const res = await authClient.api.patch<{ success: boolean }>(
    `/api/v1/store/channel-products/${channelId}/${productChannelId}/${action}`,
  );
  return res.data;
}

/**
 * 매장 상품 설명 override (StoreProductProfile upsert)
 * @param offerId  SupplierProductOffer.id (listing의 offerId 필드)
 */
export async function updateListingDescription(
  offerId: string,
  body: { shortDescription?: string; description?: string },
): Promise<{ success: boolean; data: { id: string; description: string | null; detailDescription: string | null; updatedAt: string } }> {
  const res = await authClient.api.patch<{
    success: boolean;
    data: { id: string; description: string | null; detailDescription: string | null; updatedAt: string };
  }>(`${BASE}/${offerId}/description`, body);
  return res.data;
}

// ── Bundled API object (선택적 — 단순 import용) ──────────────────────────────

export const storeProductsApi = {
  searchStoreProducts,
  getMasterOffers,
  createStoreListing,
  getMyStoreListings,
  updateStoreListing,
  updateListingDescription,
  getMasterImages,
  importImageFromUrl,
  reorderImages,
  setImagePrimary,
  deleteImage,
  getMyChannels,
  getChannelProducts,
  addProductToChannel,
  toggleChannelProduct,
} as const;
