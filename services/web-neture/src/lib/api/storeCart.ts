/**
 * Canonical Store Cart API client (neture) — WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1
 *
 * web-neture B2B 장바구니를 legacy localStorage + /neture/seller/orders 에서
 * canonical Store Cart(/api/v1/store/cart/neture/*) + checkout-confirm-b2b 로 전환.
 *
 * payment-first: 결제 전 주문은 공급자 미노출. 결제 단위 = paymentGroupId.
 */
import { api } from '../apiClient';

const SERVICE_KEY = 'neture';
const BASE = `/store/cart/${SERVICE_KEY}`;

export interface StoreCartItemDto {
  id: string;
  productName: string;
  quantity: number;
  priceSnapshot: number;
  supplierId: string | null;
  supplierProductOfferId: string | null;
  sourceType: string;
}

export interface SupplierGroupShippingDto {
  shippingFee: number;
  freeShippingApplied: boolean;
  freeShippingThreshold: number | null;
  remainingForFreeShipping: number | null;
  policyConfigured: boolean;
}

export interface SupplierGroupDto {
  supplierId: string | null;
  items: StoreCartItemDto[];
  itemCount: number;
  totalQuantity: number;
  displaySubtotal: number;
  shipping: SupplierGroupShippingDto;
  displayTotal: number;
}

export interface AddCartItemPayload {
  supplierProductOfferId: string;
  supplierId: string;
  productName: string;
  priceSnapshot: number;
  quantity: number;
  productMasterId?: string | null;
}

export interface CheckoutConfirmB2BResult {
  paymentGroupId: string;
  groupTotalAmount: number;
  orderCount: number;
  createdOrders: Array<{ orderId: string; supplierId: string; totalAmount: number; paymentGroupId: string }>;
  failedItems: Array<{ itemId: string; productName: string; reason: string; code: string }>;
  removedCartItemIds: string[];
}

function unwrap<T>(body: any, fallbackMsg: string): T {
  if (!body?.success) throw new Error(body?.error || body?.error?.message || fallbackMsg);
  return body.data as T;
}

export const storeCart = {
  async addItem(payload: AddCartItemPayload): Promise<StoreCartItemDto> {
    const res = await api.post(`${BASE}/items`, {
      sourceType: 'b2b',
      pricingSource: 'regular',
      supplierProductOfferId: payload.supplierProductOfferId,
      supplierId: payload.supplierId,
      productMasterId: payload.productMasterId ?? null,
      productName: payload.productName,
      priceSnapshot: Math.trunc(payload.priceSnapshot) || 0,
      quantity: payload.quantity,
    });
    return unwrap<StoreCartItemDto>(res.data, '장바구니 담기에 실패했습니다.');
  },

  async listGroups(): Promise<{ groups: SupplierGroupDto[]; supplierCount: number }> {
    const res = await api.get(`${BASE}/groups`);
    return unwrap<{ groups: SupplierGroupDto[]; supplierCount: number }>(res.data, '장바구니 조회에 실패했습니다.');
  },

  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    const res = await api.patch(`${BASE}/items/${itemId}`, { quantity });
    unwrap(res.data, '수량 변경에 실패했습니다.');
  },

  async removeItem(itemId: string): Promise<void> {
    const res = await api.delete(`${BASE}/items/${itemId}`);
    unwrap(res.data, '삭제에 실패했습니다.');
  },

  async clear(): Promise<void> {
    const res = await api.delete(`${BASE}`);
    unwrap(res.data, '장바구니 비우기에 실패했습니다.');
  },

  async checkoutConfirmB2B(): Promise<CheckoutConfirmB2BResult> {
    const res = await api.post(`${BASE}/checkout-confirm-b2b`, {});
    return unwrap<CheckoutConfirmB2BResult>(res.data, '주문 확정에 실패했습니다.');
  },
};
