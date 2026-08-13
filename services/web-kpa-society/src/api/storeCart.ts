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
 * WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1:
 *   3 서비스에 중복돼 있던 타입 정의를 @o4o/store-ui-core 로 이관하고 여기서 re-export 한다.
 *   endpoint · payload · 응답 계약은 변경하지 않는다(아래 client 구현이 정본 그대로).
 *
 * Phase 1a 범위: 담기/조회/수량변경/삭제/비우기 + 공급자별 묶음 + checkout preview.
 *   주문/결제/정산/수량차감은 후속 Phase. priceSnapshot 은 표시용 임시값이다.
 */

import { coreApiClient } from './client';
import type { StoreCartApiOk as ApiOk } from '@o4o/store-ui-core';

export type {
  CartSourceType,
  CartPricingSource,
  StoreCartItem,
  AddCartItemInput,
  SupplierGroupShipping,
  SupplierGroup,
  CreatedOrderSummary,
  FailedCartItem,
  CheckoutConfirmResult,
} from '@o4o/store-ui-core';

import type {
  AddCartItemInput,
  CheckoutConfirmResult,
  StoreCartItem,
  SupplierGroup,
} from '@o4o/store-ui-core';

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

  /** 주문 확정 — 공급자별 주문 생성 (Phase 1b). itemIds 미지정 시 전체. */
  checkoutConfirm: (serviceKey: string, input?: { itemIds?: string[]; note?: string }) =>
    coreApiClient.post<ApiOk<CheckoutConfirmResult>>(
      `/store/cart/${serviceKey}/checkout-confirm`,
      input ?? {},
    ),
};
