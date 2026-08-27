/**
 * createStoreCartApi — canonical Store Cart 클라이언트 팩토리
 *
 * WO-O4O-STORE-HUB-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   KPA / K-Cosmetics / GlycoPharm 3 서비스가 동일한 7개 endpoint 목록을 각각 복제하고 있었다.
 *   차이는 오직 **전송 계층**(coreApiClient / authClient.api 언랩 방식)뿐이었으므로
 *   endpoint·payload·응답 계약을 여기 한 곳으로 모으고, 서비스는 http 어댑터만 주입한다.
 *
 *   API 계약은 무변경이다 — 경로·메서드·body·응답 형상 모두 기존 3 서비스 구현과 동일하다.
 *   경계: serviceKey(URL 경로) + buyerId(인증 사용자, body 신뢰 안 함).
 *   backend foundation: WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1 / -CONFIRMATION-V1.
 */

import type {
  AddCartItemInput,
  B2BCheckoutConfirmResult,
  CheckoutConfirmResult,
  StoreCartApiOk as ApiOk,
  StoreCartItem,
  SupplierGroup,
} from './storeCartTypes';

/**
 * 서비스가 주입하는 최소 전송 계층.
 * 각 메서드는 **응답 body 를 그대로** 반환해야 한다(axios 라면 `.data` 언랩 후 전달).
 */
export interface StoreCartHttp {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body?: unknown): Promise<T>;
  patch<T>(url: string, body?: unknown): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

export interface StoreCartApiClient {
  /** 장바구니 담기 */
  addItem(serviceKey: string, input: AddCartItemInput): Promise<ApiOk<StoreCartItem>>;
  /** 장바구니 목록 */
  list(serviceKey: string): Promise<ApiOk<{ items: StoreCartItem[]; total: number }>>;
  /** 공급자별 묶음 (배송비/주문 분할 단위) */
  groupBySupplier(
    serviceKey: string,
  ): Promise<ApiOk<{ groups: SupplierGroup[]; supplierCount: number }>>;
  /** 수량 변경 */
  updateQuantity(serviceKey: string, id: string, quantity: number): Promise<ApiOk<StoreCartItem>>;
  /** 항목 삭제 */
  removeItem(serviceKey: string, id: string): Promise<ApiOk<{ removed: boolean }>>;
  /** 비우기 */
  clear(serviceKey: string): Promise<ApiOk<{ removed: number }>>;
  /** 주문 확정 — 공급자별 주문 생성. itemIds 미지정 시 전체. */
  checkoutConfirm(
    serviceKey: string,
    input?: { itemIds?: string[]; note?: string },
  ): Promise<ApiOk<CheckoutConfirmResult>>;
  /**
   * B2B 축 주문 확정 — 공급자 offer(`sourceType` ∈ {b2b, regular}) 항목 전용.
   * event_offer 축(`checkoutConfirm`)과 endpoint 를 통일하지 않는다(API 호환 우선).
   */
  checkoutConfirmB2B(
    serviceKey: string,
    input?: { itemIds?: string[]; note?: string; organizationId?: string },
  ): Promise<ApiOk<B2BCheckoutConfirmResult>>;
}

export function createStoreCartApi(http: StoreCartHttp): StoreCartApiClient {
  const base = (serviceKey: string) => `/store/cart/${serviceKey}`;

  return {
    addItem: (serviceKey, input) =>
      http.post<ApiOk<StoreCartItem>>(`${base(serviceKey)}/items`, input),

    list: (serviceKey) =>
      http.get<ApiOk<{ items: StoreCartItem[]; total: number }>>(`${base(serviceKey)}/items`),

    groupBySupplier: (serviceKey) =>
      http.get<ApiOk<{ groups: SupplierGroup[]; supplierCount: number }>>(
        `${base(serviceKey)}/groups`,
      ),

    updateQuantity: (serviceKey, id, quantity) =>
      http.patch<ApiOk<StoreCartItem>>(`${base(serviceKey)}/items/${id}`, { quantity }),

    removeItem: (serviceKey, id) =>
      http.delete<ApiOk<{ removed: boolean }>>(`${base(serviceKey)}/items/${id}`),

    clear: (serviceKey) => http.delete<ApiOk<{ removed: number }>>(base(serviceKey)),

    checkoutConfirm: (serviceKey, input) =>
      http.post<ApiOk<CheckoutConfirmResult>>(
        `${base(serviceKey)}/checkout-confirm`,
        input ?? {},
      ),

    checkoutConfirmB2B: (serviceKey, input) =>
      http.post<ApiOk<B2BCheckoutConfirmResult>>(
        `${base(serviceKey)}/checkout-confirm-b2b`,
        input ?? {},
      ),
  };
}
