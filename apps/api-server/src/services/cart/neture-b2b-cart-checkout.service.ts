/**
 * NetureB2BCartCheckoutService — Neture B2B Store Cart 주문화 (payment-first)
 *
 * WO-O4O-NETURE-B2B-CHECKOUT-ORCHESTRATOR-V1
 * 상위 기준: CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1
 * 공통화: WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1
 *
 * 이 클래스는 이제 **얇은 wrapper** 다. `store_cart_items` → `checkout_orders` 승격 로직은
 * `B2BCheckoutConfirmCore` 가, Neture 공급 노출 정책(approval_status / distribution_type /
 * allowed_seller_ids)은 `OfferExposureStrategy('neture')` 가 담당한다.
 * 여기 남는 것은 **Neture 계약 표면**뿐이다 — 실패 code 어휘, order metadata, seller 축,
 * `pg_` paymentGroupId 형태, 결과 shape.
 *
 * 절대 기준 (payment-first):
 *   - 생성 주문은 paymentStatus='pending' (createOrder 기본값). 결제 완료 전 공급자 미노출.
 *   - collectionStatus 사용 안 함 (후불/인보이스/수금확인형 전제 폐기 — 위 CHECK 참조).
 *   - fulfillment bridge 는 confirm 밖 — 결제 완료 이후 단계다.
 *   - priceSnapshot 은 표시용. 주문 금액은 SupplierProductOffer 서버 가격으로 재계산.
 *
 * 원자성: 공급자(supplierId) 그룹 단위. 그룹 내 일부 item 검증 실패 시 그룹 전체 실패
 *   (공급자별 금액/배송비 일관성). 그룹 간 best-effort — 실패 그룹 item 은 cart 유지 + failedItems.
 *
 * 매장 조직(organizationId): `validate-only`. cart 에 조직이 들어 있으면 서버가 소속을
 *   검증하고(타인 조직이면 403), 없으면 조직 없이 진행한다. 서버가 임의로 채우지 않는다 —
 *   자동 확정은 seller 축과 SERVICE 유통 판정을 바꿔 기존 주문 결과를 바꾼다(회귀).
 */
import { DataSource } from 'typeorm';
import {
  B2BCheckoutConfirmCore,
  type B2BConfirmAdapter,
  type B2BConfirmInput,
  type B2BConfirmScope,
} from './b2b-checkout-confirm.core.js';

/** CheckoutFulfillmentBridge 가 이 축의 주문을 식별하는 source tag — 바꾸면 공급자 노출이 끊긴다. */
export const NETURE_B2B_ORDER_SOURCE = 'neture_b2b_checkout';

export interface B2BCheckoutScope {
  buyerId: string;
  serviceKey: string;
}

export interface B2BCheckoutInput {
  itemIds?: string[];
  note?: string;
  /** 매장 조직 **선택값**. 권위는 서버 검증이다. */
  organizationId?: string | null;
}

export interface B2BCreatedOrderSummary {
  orderId: string;
  orderNumber: string;
  supplierId: string;
  sellerOrganizationId: string | null;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  cartItemIds: string[];
  paymentStatus: string;
  paymentGroupId: string;
}

export interface B2BFailedCartItem {
  itemId: string;
  productName: string;
  reason: string;
  code: string;
}

export interface B2BCheckoutResult {
  serviceKey: string;
  /** 다중 공급자 1회 결제 단위 (WO-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1) */
  paymentGroupId: string;
  /** group total = Σ createdOrders.totalAmount (사용자 1회 결제 예정 금액) */
  groupTotalAmount: number;
  orderCount: number;
  createdOrders: B2BCreatedOrderSummary[];
  failedItems: B2BFailedCartItem[];
  removedCartItemIds: string[];
}

/** Neture 계약 표면 — code 어휘/metadata/seller 축. Core 가 이 adapter 를 호출한다. */
const netureAdapter: B2BConfirmAdapter = {
  organizationPolicy: 'validate-only',
  requireCartSupplierId: true,
  enforceCartSupplierMatch: true,
  paymentGroupIdPrefix: 'pg_',

  unsupportedSourceType: (it) => ({
    code: 'UNSUPPORTED_CART_ITEM_SOURCE',
    reason: `지원하지 않는 항목 유형입니다 (${it.sourceType}). B2B 주문은 b2b/regular 만 가능합니다.`,
  }),
  missingOffer: () => ({
    code: 'MISSING_OFFER',
    reason: 'supplierProductOfferId 가 없어 주문할 수 없습니다.',
  }),
  missingSupplier: () => ({
    code: 'MISSING_SUPPLIER',
    reason: 'supplierId 가 없어 주문할 수 없습니다.',
  }),
  offerNotFound: () => ({ code: 'OFFER_NOT_FOUND', reason: '공급자 상품을 찾을 수 없습니다.' }),
  supplierMismatch: () => ({ code: 'SUPPLIER_MISMATCH', reason: '공급자 정보가 일치하지 않습니다.' }),
  groupPoisoned: () => ({
    code: 'GROUP_PARTIAL_FAILURE',
    reason: '동일 공급자 항목 중 일부가 검증 실패하여 그룹 전체 주문을 보류했습니다.',
  }),
  orderCreateFailed: (error) => ({
    code: 'ORDER_CREATE_FAILED',
    reason: (error as { message?: string } | null)?.message || '주문 생성에 실패했습니다.',
  }),

  buildLineItemMetadata: (v) => ({
    sourceType: v.item.sourceType,
    supplierProductOfferId: v.offer.id,
    cartItemId: v.item.id,
    pricingSource: 'regular',
    confirmedUnitPrice: v.unitPrice,
  }),

  buildSellerAxis: (ctx) => ({
    sellerId: ctx.organizationId ?? ctx.scope.buyerId,
    sellerOrganizationId: ctx.organizationId ?? undefined,
  }),

  buildOrderMetadata: (ctx) => ({
    // payment-first: 결제 완료(paymentStatus='paid') 전 공급자 미노출.
    // collectionStatus 미사용(후불/인보이스 전제 폐기).
    source: NETURE_B2B_ORDER_SOURCE,
    // 서비스 축은 scope 에서 온다 — 상수 하드코딩 금지(service-agnostic Core 계약).
    serviceKey: ctx.scope.serviceKey,
    sourceTypes: [...new Set(ctx.group.map((v) => v.item.sourceType))],
    orderType: 'STORE_RESTOCK',
    cartItemIds: ctx.cartItemIds,
    supplierProductOfferIds: ctx.group.map((v) => v.offer.id),
    pricingRevalidationRequired: true,
    fulfillmentVisibility: 'hidden_until_paid',
    // 다중 공급자 1회 결제 group (WO-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1)
    paymentGroupId: ctx.paymentGroupId,
    paymentGroupSource: 'multi_supplier_cart',
    ...(ctx.input.note ? { note: ctx.input.note } : {}),
  }),
};

export class NetureB2BCartCheckoutService {
  private core: B2BCheckoutConfirmCore;

  constructor(dataSource: DataSource) {
    this.core = new B2BCheckoutConfirmCore(dataSource, netureAdapter);
  }

  async confirm(scope: B2BCheckoutScope, input: B2BCheckoutInput = {}): Promise<B2BCheckoutResult> {
    const result = await this.core.confirm(scope as B2BConfirmScope, input as B2BConfirmInput);

    const createdOrders: B2BCreatedOrderSummary[] = result.createdOrders.map((o) => ({
      orderId: o.orderId,
      orderNumber: o.orderNumber,
      supplierId: o.supplierId,
      sellerOrganizationId: o.organizationId,
      subtotal: o.subtotal,
      shippingFee: o.shippingFee,
      totalAmount: o.totalAmount,
      itemCount: o.itemCount,
      cartItemIds: o.cartItemIds,
      paymentStatus: o.paymentStatus,
      paymentGroupId: result.paymentGroupId,
    }));

    return {
      serviceKey: result.serviceKey,
      paymentGroupId: result.paymentGroupId,
      groupTotalAmount: createdOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
      orderCount: createdOrders.length,
      createdOrders,
      failedItems: result.failedItems.map((f) => ({
        itemId: f.itemId,
        productName: f.productName,
        reason: f.reason,
        code: f.code,
      })),
      removedCartItemIds: result.removedCartItemIds,
    };
  }
}
