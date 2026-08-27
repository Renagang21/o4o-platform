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
  /** 매장 조직. 서버가 확정한 값이며, 조직 축을 쓰지 않는 주문에서는 null 이다. */
  sellerOrganizationId: string | null;
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

/**
 * WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1:
 *   B2B(공급자 offer 직접 구매) 축 확정 결과. event_offer 축(`CheckoutConfirmResult`)과
 *   **다른 endpoint** 다 — route 를 하나로 통일하지 않는다(§24). 서버는 두 경로 모두
 *   같은 공통 Core 를 쓰지만 응답 shape 은 각 축의 기존 계약을 유지한다.
 */
export interface B2BCreatedOrderSummary extends CreatedOrderSummary {
  paymentStatus: string;
  paymentGroupId: string;
}

export interface B2BCheckoutConfirmResult {
  serviceKey: string;
  /** 다중 공급자 1회 결제 단위 */
  paymentGroupId: string;
  /** 사용자가 1회에 결제할 예정 금액 = Σ createdOrders.totalAmount */
  groupTotalAmount: number;
  orderCount: number;
  createdOrders: B2BCreatedOrderSummary[];
  failedItems: Array<{ itemId: string; productName: string; code: string; reason: string }>;
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
  /**
   * B2B 축 확정(선택). 구현하지 않은 서비스의 cart 는 event_offer 축만 담기므로
   * 호출되지 않는다 — 기존 구현을 깨뜨리지 않기 위해 optional 이다.
   *
   * `organizationId` 는 **선택값(hint)** 이다. 권위는 서버 검증이며, 다중 매장 사용자가
   * 어느 매장으로 주문할지 고르는 용도다(단일 매장이면 보내지 않아도 서버가 확정한다).
   */
  checkoutConfirmB2B?(
    serviceKey: string,
    input?: { itemIds?: string[]; note?: string; organizationId?: string },
  ): Promise<StoreCartApiOk<B2BCheckoutConfirmResult>>;
}
