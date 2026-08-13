/**
 * Store Cart API 서비스 — Canonical Store Cart (K-Cosmetics)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2
 *
 * KPA 에서 검증된 canonical Store Cart 흐름을 K-Cosmetics 로 확장.
 * core 네임스페이스(/api/v1)이므로 `api`(authClient.api) 사용. serviceKey 는 'k-cosmetics'.
 * 메서드는 응답 body(ApiOk<T>)를 반환하도록 .data 를 언랩한다.
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

// authClient.api(Axios) 를 응답 타입이 명확한 shape 으로 한정. .then 콜백 인자 타입 추론 보장.
const http = api as unknown as {
  get: <T>(url: string) => Promise<{ data: T }>;
  post: <T>(url: string, body?: unknown) => Promise<{ data: T }>;
  patch: <T>(url: string, body?: unknown) => Promise<{ data: T }>;
  delete: <T>(url: string) => Promise<{ data: T }>;
};

export const storeCartApi = {
  addItem: (serviceKey: string, input: AddCartItemInput) =>
    http.post<ApiOk<StoreCartItem>>(`/store/cart/${serviceKey}/items`, input).then((r) => r.data),

  list: (serviceKey: string) =>
    http
      .get<ApiOk<{ items: StoreCartItem[]; total: number }>>(`/store/cart/${serviceKey}/items`)
      .then((r) => r.data),

  groupBySupplier: (serviceKey: string) =>
    http
      .get<ApiOk<{ groups: SupplierGroup[]; supplierCount: number }>>(
        `/store/cart/${serviceKey}/groups`,
      )
      .then((r) => r.data),

  updateQuantity: (serviceKey: string, id: string, quantity: number) =>
    http
      .patch<ApiOk<StoreCartItem>>(`/store/cart/${serviceKey}/items/${id}`, { quantity })
      .then((r) => r.data),

  removeItem: (serviceKey: string, id: string) =>
    http
      .delete<ApiOk<{ removed: boolean }>>(`/store/cart/${serviceKey}/items/${id}`)
      .then((r) => r.data),

  clear: (serviceKey: string) =>
    http.delete<ApiOk<{ removed: number }>>(`/store/cart/${serviceKey}`).then((r) => r.data),

  checkoutConfirm: (serviceKey: string, input?: { itemIds?: string[]; note?: string }) =>
    http
      .post<ApiOk<CheckoutConfirmResult>>(`/store/cart/${serviceKey}/checkout-confirm`, input ?? {})
      .then((r) => r.data),
};
