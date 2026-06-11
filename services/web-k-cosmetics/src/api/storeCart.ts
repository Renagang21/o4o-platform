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
