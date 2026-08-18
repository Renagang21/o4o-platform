/**
 * Store Cart 공통 타입 — canonical Store Cart API 계약 (frontend 표현)
 *
 * WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1
 *
 * KPA-Society / K-Cosmetics / GlycoPharm 의 `src/api/storeCart.ts` 3벌에 글자 그대로
 * 중복돼 있던 타입 정의를 여기로 모은다. **API 계약 자체는 변경하지 않는다** —
 * endpoint · payload · 응답 shape 은 backend 가 정본이고 이 파일은 그 표현일 뿐이다.
 * 각 서비스는 자기 http client(coreApiClient / authClient.api)로 구현한 storeCartApi 를
 * 그대로 유지하고, 타입만 여기서 re-export 한다.
 *
 * 업무 경계 (변경 없음):
 *   장바구니 = 주문 준비. 장바구니 ≠ 상품 신청(ProductApproval) ≠ 주문 가능 상품(OrganizationProductListing).
 *   priceSnapshot 은 표시용이며 주문 확정 시 backend 가 재검증한다.
 */

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
  /** 담을 때의 표시용 스냅샷 가격(원). 신뢰 금액 아님 — 확정 시 재검증. */
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
  /** 공급자 표시명(SSOT = organizations.name). 미연결이면 null — 화면은 UUID 를 노출하지 않는다. */
  supplierName?: string | null;
  items: StoreCartItem[];
  itemCount: number;
  totalQuantity: number;
  /** priceSnapshot 기준 표시용 소계(원). */
  displaySubtotal: number;
  /** 공급자별 배송비 미리보기 (표시용 — 확정 시 재계산) */
  shipping: SupplierGroupShipping;
  /** displaySubtotal + shipping.shippingFee */
  displayTotal: number;
}

// WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1 (Phase 1b)
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

/** 응답 body 표준 — `{ success: true, data: T }` (CLAUDE.md §8). */
export interface StoreCartApiOk<T> {
  success: true;
  data: T;
}

/**
 * 서비스별 storeCartApi 가 구조적으로 만족해야 하는 계약.
 * (http client 구현은 서비스가 소유한다 — Core 는 호출만 한다.)
 */
export interface StoreCartApi {
  groupBySupplier(
    serviceKey: string,
  ): Promise<StoreCartApiOk<{ groups: SupplierGroup[]; supplierCount: number }>>;
  updateQuantity(
    serviceKey: string,
    id: string,
    quantity: number,
  ): Promise<StoreCartApiOk<StoreCartItem>>;
  removeItem(serviceKey: string, id: string): Promise<StoreCartApiOk<{ removed: boolean }>>;
  clear(serviceKey: string): Promise<StoreCartApiOk<{ removed: number }>>;
  checkoutConfirm(
    serviceKey: string,
    input?: { itemIds?: string[]; note?: string },
  ): Promise<StoreCartApiOk<CheckoutConfirmResult>>;
}
