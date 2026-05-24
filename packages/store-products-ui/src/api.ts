/**
 * Store Products UI — API Client
 *
 * WO-O4O-STORE-PRODUCTS-UI-CORE-EXTRACTION-V1
 * WO-O4O-STORE-PRODUCTS-AUTHCLIENT-INJECTION-FIX-V1:
 *   @o4o/auth-client 의 cookie-strategy singleton 직접 import 제거.
 *   소비 서비스(KPA / Neture / Glycopharm / K-Cosmetics)가 자신의
 *   localStorage-strategy getApi() 를 부팅 시점에 주입한다.
 *   미주입 상태에서 호출 시 명확한 에러를 발생시켜 silent 401 회귀를 차단한다.
 *
 * Base: /api/v1/store/products
 *
 * Backend gate: requireAuth + requireStoreOwner (role_assignments 기반)
 */

import type {
  StoreProductSearchResult,
  StoreListingItem,
  PaginatedResponse,
  ProductImageItem,
  StoreChannel,
  ChannelProductItem,
} from './types.js';

// ── 주입형 HTTP 클라이언트 ────────────────────────────────────────────────────
// axios AxiosInstance 와 구조적으로 호환되는 최소 인터페이스.
// store-products-ui 가 axios / @o4o/auth-client 런타임에 직접 의존하지 않도록 한다.

export interface StoreProductsApiClient {
  get<T = unknown>(url: string, config?: unknown): Promise<{ data: T }>;
  post<T = unknown>(url: string, body?: unknown, config?: unknown): Promise<{ data: T }>;
  patch<T = unknown>(url: string, body?: unknown, config?: unknown): Promise<{ data: T }>;
  delete<T = unknown>(url: string, config?: unknown): Promise<{ data: T }>;
}

let _api: StoreProductsApiClient | null = null;

/**
 * 패키지 호출 전 1회 실행.
 * 서비스의 인증 전략(현재 모두 localStorage)을 반영한 getApi() 를 그대로 주입한다.
 */
export function configureStoreProductsApi(api: StoreProductsApiClient): void {
  _api = api;
}

function getApi(): StoreProductsApiClient {
  if (!_api) {
    throw new Error(
      '[@o4o/store-products-ui] API client is not configured. ' +
      'Call configureStoreProductsApi(getApi()) once at app startup ' +
      '(usually next to where authClient is created).',
    );
  }
  return _api;
}

const BASE = '/store/products';
const CHANNEL_BASE = '/store/channel-products';

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
  const res = await getApi().get<PaginatedResponse<StoreProductSearchResult>>(
    `${BASE}/search?${params}`,
  );
  return res.data;
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
  const res = await getApi().post<{
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
  const res = await getApi().get<PaginatedResponse<StoreListingItem>>(
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
  const res = await getApi().patch<{ success: boolean; data: StoreListingItem }>(
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
  const res = await getApi().get<{ success: boolean; data: ProductImageItem[] }>(
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
  const res = await getApi().post<{
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
  const res = await getApi().patch<{ success: boolean }>(
    `${BASE}/images/reorder`,
    { items },
  );
  return res.data;
}

/**
 * 대표 이미지 지정
 */
export async function setImagePrimary(imageId: string): Promise<{ success: boolean }> {
  const res = await getApi().patch<{ success: boolean }>(
    `${BASE}/images/${imageId}/primary`,
  );
  return res.data;
}

/**
 * 이미지 삭제
 */
export async function deleteImage(imageId: string): Promise<{ success: boolean }> {
  const res = await getApi().delete<{ success: boolean }>(
    `${BASE}/images/${imageId}`,
  );
  return res.data;
}

// ── 채널 ────────────────────────────────────────────────────────────────────

/**
 * 내 매장 채널 목록 (B2C/KIOSK)
 */
export async function getMyChannels(): Promise<StoreChannel[]> {
  const res = await getApi().get<{ success: boolean; data: StoreChannel[] }>(
    `${BASE}/my-channels`,
  );
  return res.data?.data ?? [];
}

/**
 * 특정 채널에 등록된 제품 목록
 */
export async function getChannelProducts(channelId: string): Promise<ChannelProductItem[]> {
  const res = await getApi().get<{ success: boolean; data: ChannelProductItem[] }>(
    `${CHANNEL_BASE}/${channelId}`,
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
  const res = await getApi().post<{
    success: boolean;
    data: { id: string; reactivated: boolean };
  }>(`${CHANNEL_BASE}/${channelId}`, { productListingId });
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
  const res = await getApi().patch<{ success: boolean }>(
    `${CHANNEL_BASE}/${channelId}/${productChannelId}/${action}`,
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
  const res = await getApi().patch<{
    success: boolean;
    data: { id: string; description: string | null; detailDescription: string | null; updatedAt: string };
  }>(`${BASE}/${offerId}/description`, body);
  return res.data;
}

// ── Bundled API object (선택적 — 단순 import용) ──────────────────────────────

export const storeProductsApi = {
  searchStoreProducts,
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
