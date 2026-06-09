/**
 * Store Cart API 서비스 — Canonical Store Cart
 *
 * WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1 (Phase 1a)
 *
 * 매장 경영자(buyer)의 서버 백엔드 장바구니. 이벤트오퍼/B2B/일반 상품을 단일
 * cart item 표준(sourceType)으로 담는다. foundation backend:
 *   WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1
 *
 * 경계: serviceKey(URL 경로) + buyerId(인증 사용자, body 신뢰 안 함).
 *   - core 네임스페이스(/api/v1)이므로 /kpa 접두사가 없는 coreApiClient 사용.
 *   - serviceKey 는 호출부에서 'kpa-society' 로 전달한다.
 *
 * Phase 1a 범위: 담기/조회/수량변경/삭제/비우기 + 공급자별 묶음 + checkout preview.
 *   주문/결제/정산/수량차감은 후속 Phase. priceSnapshot 은 표시용 임시값이다.
 */

import { coreApiClient } from './client';

export type CartSourceType =
  | 'regular'
  | 'operator_approved'
  | 'b2b'
  | 'event_offer'
  | 'seller_recruitment';

export type CartPricingSource = 'regular' | 'event_offer';

export interface StoreCartItem {
  id: string;
  buyerId: string;
  organizationId: string | null;
  serviceKey: string;
  sourceType: CartSourceType;
  supplierId: string | null;
  supplierProductOfferId: string | null;
  organizationProductListingId: string | null;
  eventOfferId: string | null;
  productMasterId: string | null;
  productName: string;
  quantity: number;
  pricingSource: CartPricingSource;
  priceSnapshot: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddCartItemInput {
  sourceType?: CartSourceType;
  supplierId?: string | null;
  supplierProductOfferId?: string | null;
  organizationProductListingId?: string | null;
  eventOfferId?: string | null;
  productMasterId?: string | null;
  productName: string;
  quantity?: number;
  pricingSource?: CartPricingSource;
  priceSnapshot?: number;
}

export interface SupplierGroup {
  supplierId: string | null;
  items: StoreCartItem[];
  itemCount: number;
  totalQuantity: number;
  /** priceSnapshot 기준 표시용 소계(원). 신뢰 금액 아님. */
  displaySubtotal: number;
}

interface ApiOk<T> {
  success: true;
  data: T;
}

export const storeCartApi = {
  /** 장바구니 담기 */
  addItem: (serviceKey: string, input: AddCartItemInput) =>
    coreApiClient.post<ApiOk<StoreCartItem>>(`/store/cart/${serviceKey}/items`, input),

  /** 장바구니 목록 */
  list: (serviceKey: string) =>
    coreApiClient.get<ApiOk<{ items: StoreCartItem[]; total: number }>>(
      `/store/cart/${serviceKey}/items`,
    ),

  /** 공급자별 묶음 (배송비/주문 분할 단위) */
  groupBySupplier: (serviceKey: string) =>
    coreApiClient.get<ApiOk<{ groups: SupplierGroup[]; supplierCount: number }>>(
      `/store/cart/${serviceKey}/groups`,
    ),

  /** 수량 변경 */
  updateQuantity: (serviceKey: string, id: string, quantity: number) =>
    coreApiClient.patch<ApiOk<StoreCartItem>>(`/store/cart/${serviceKey}/items/${id}`, {
      quantity,
    }),

  /** 항목 삭제 */
  removeItem: (serviceKey: string, id: string) =>
    coreApiClient.delete<ApiOk<{ removed: boolean }>>(`/store/cart/${serviceKey}/items/${id}`),

  /** 비우기 */
  clear: (serviceKey: string) =>
    coreApiClient.delete<ApiOk<{ removed: number }>>(`/store/cart/${serviceKey}`),
};
