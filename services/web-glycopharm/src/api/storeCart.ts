/**
 * Store Cart API 서비스 — Canonical Store Cart (GlycoPharm)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2
 *
 * KPA 에서 검증된 canonical Store Cart 흐름을 GlycoPharm 으로 확장.
 * backend foundation: WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1 / -CONFIRMATION-V1.
 *
 * 경계: serviceKey(URL 경로) + buyerId(인증 사용자). core 네임스페이스(/api/v1)이므로
 *   `api`(authClient.api, baseURL=/api/v1) 를 그대로 사용한다. serviceKey 는 'glycopharm'.
 *   메서드는 응답 body(ApiOk<T>)를 반환하도록 .data 를 언랩한다(KPA storeCart 와 동일 형상).
 */
import { api } from '../lib/apiClient';
import type { StoreCartApiOk as ApiOk } from '@o4o/store-ui-core';

// WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1:
//   3 서비스 중복 타입 정의를 @o4o/store-ui-core 로 이관하고 re-export 한다. API 계약 무변경.
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
  addItem: (serviceKey: string, input: AddCartItemInput) =>
    api
      .post<ApiOk<StoreCartItem>>(`/store/cart/${serviceKey}/items`, input)
      .then((r: { data: ApiOk<StoreCartItem> }) => r.data),

  list: (serviceKey: string) =>
    api
      .get<ApiOk<{ items: StoreCartItem[]; total: number }>>(`/store/cart/${serviceKey}/items`)
      .then((r: { data: ApiOk<{ items: StoreCartItem[]; total: number }> }) => r.data),

  groupBySupplier: (serviceKey: string) =>
    api
      .get<ApiOk<{ groups: SupplierGroup[]; supplierCount: number }>>(
        `/store/cart/${serviceKey}/groups`,
      )
      .then((r: { data: ApiOk<{ groups: SupplierGroup[]; supplierCount: number }> }) => r.data),

  updateQuantity: (serviceKey: string, id: string, quantity: number) =>
    api
      .patch<ApiOk<StoreCartItem>>(`/store/cart/${serviceKey}/items/${id}`, { quantity })
      .then((r: { data: ApiOk<StoreCartItem> }) => r.data),

  removeItem: (serviceKey: string, id: string) =>
    api
      .delete<ApiOk<{ removed: boolean }>>(`/store/cart/${serviceKey}/items/${id}`)
      .then((r: { data: ApiOk<{ removed: boolean }> }) => r.data),

  clear: (serviceKey: string) =>
    api
      .delete<ApiOk<{ removed: number }>>(`/store/cart/${serviceKey}`)
      .then((r: { data: ApiOk<{ removed: number }> }) => r.data),

  checkoutConfirm: (serviceKey: string, input?: { itemIds?: string[]; note?: string }) =>
    api
      .post<ApiOk<CheckoutConfirmResult>>(`/store/cart/${serviceKey}/checkout-confirm`, input ?? {})
      .then((r: { data: ApiOk<CheckoutConfirmResult> }) => r.data),
};
