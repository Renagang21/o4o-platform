/**
 * Pharmacy-Hub 매장 경영활용 제품 API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubHandledProductController.ts):
 *   GET   /pharmacy-hub/store-owner/handled-products
 *   POST  /pharmacy-hub/store-owner/handled-products          취급 등록(offerId)
 *   PATCH /pharmacy-hub/store-owner/handled-products/active   활성/비활성
 *   POST  /pharmacy-hub/store-owner/handled-products/remove    취급 해제(다건)
 *
 * ⚠️ organizationId 는 **보내지 않는다.** 서버가 Pharmacy-Hub enrollment 로 결정한다.
 *
 * 이 목록은 organization_product_listings(O4O 기반) + store_local_products(매장 자체) 통합
 * 조회다. `/store-owner/products` 의 **공급 상품 목록(B2B 구매 대상)과는 다른 축**이며,
 * 주문 완료 상품이 자동으로 여기에 들어오지 않는다.
 */
import type {
  HandledProductListItem,
  HandledProductsPagination,
  HandledProductSource,
} from '@o4o/store-ui-core/handled-products';
import { api } from '../apiClient';

export type { HandledProductSource } from '@o4o/store-ui-core/handled-products';

const BASE = '/pharmacy-hub/store-owner/handled-products';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

// Pharmacy-Hub keeps masterId as its service-local extension.
export interface HandledProduct extends HandledProductListItem {
  masterId: string | null;
}

/** 매장 연결 상태 — 미연결·다중이어도 목록은 200 + 빈 배열로 온다. */
export interface HandledStoreConnection {
  status: 'connected' | 'not_connected' | 'ambiguous';
  candidateCount: number;
  errorCode: 'AMBIGUOUS_STORE_CONNECTION' | null;
}

export interface HandledProductsPage {
  storeConnection: HandledStoreConnection;
  items: HandledProduct[];
  pagination: HandledProductsPagination;
}

export async function fetchHandledProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  source?: 'all' | HandledProductSource;
}): Promise<HandledProductsPage> {
  const res = await api.get(BASE, {
    params: {
      page: params?.page,
      limit: params?.limit,
      search: params?.search || undefined,
      source: params?.source && params.source !== 'all' ? params.source : undefined,
    },
  });
  return unwrap<HandledProductsPage>(res.data, '매장 경영활용 제품을 불러오지 못했습니다.');
}

export interface ApplyHandledProductResult {
  sourceType: 'listing';
  sourceId: string;
  offerId: string;
  masterId: string;
  name: string;
  /** false = 이미 등록돼 있어 활성화만 됨(멱등) */
  created: boolean;
}

/** 공급 상품(offer)을 매장 경영활용 제품으로 등록한다. 이미 있으면 활성화(멱등). */
export async function applyHandledProduct(offerId: string): Promise<ApplyHandledProductResult> {
  const res = await api.post(BASE, { offerId });
  return unwrap<ApplyHandledProductResult>(res.data, '매장 경영활용 제품으로 등록하지 못했습니다.');
}

export async function setHandledProductActive(
  sourceType: HandledProductSource,
  sourceId: string,
  isActive: boolean,
): Promise<void> {
  const res = await api.patch(`${BASE}/active`, { sourceType, sourceId, isActive });
  unwrap<unknown>(res.data, '활성 상태를 변경하지 못했습니다.');
}

export interface RemoveHandledResult {
  removed: number;
  failed: Array<{ sourceType: string; sourceId: string; reason: string }>;
}

/**
 * 매장 경영활용 목록에서 제거(연결 해제). 상품 정보·설명서·QR 은 삭제되지 않는다.
 * (DELETE + body 대신 POST — 공통 라우트와 같은 형태를 유지한다.)
 */
export async function removeHandledProducts(
  items: Array<{ sourceType: HandledProductSource; sourceId: string }>,
): Promise<RemoveHandledResult> {
  const res = await api.post(`${BASE}/remove`, { items });
  return unwrap<RemoveHandledResult>(res.data, '매장 경영활용에서 제거하지 못했습니다.');
}
