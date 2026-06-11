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

export type CartSourceType =
  | 'regular'
  | 'operator_approved'
  | 'b2b'
  | 'event_offer'
  // 'seller_recruitment': legacy/internal — 매장 취급 신청/공급 승인 전 상태. 주문 경로 아님.
  // Neture 제휴(파트너 모집)와 무관. 근거: WO-O4O-SELLER-RECRUITMENT-TERMINOLOGY-BOUNDARY-FIX-V1.
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

// WO-O4O-STORE-CART-SUPPLIER-GROUP-SHIPPING-PREVIEW-V1
export interface SupplierGroupShipping {
  shippingFee: number;
  freeShippingApplied: boolean;
  freeShippingThreshold: number | null;
  remainingForFreeShipping: number | null;
  policyConfigured: boolean;
}

export interface SupplierGroup {
  supplierId: string | null;
  items: StoreCartItem[];
  itemCount: number;
  totalQuantity: number;
  displaySubtotal: number;
  shipping: SupplierGroupShipping;
  displayTotal: number;
}

export interface CreatedOrderSummary {
  orderId: string;
  orderNumber: string;
  supplierId: string;
  sellerOrganizationId: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  cartItemIds: string[];
}

export interface FailedCartItem {
  itemId: string;
  reason: string;
  message: string;
}

export interface CheckoutConfirmResult {
  serviceKey: string;
  createdOrders: CreatedOrderSummary[];
  failedItems: FailedCartItem[];
  removedCartItemIds: string[];
}

interface ApiOk<T> {
  success: true;
  data: T;
}

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
