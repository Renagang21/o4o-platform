/**
 * StoreB2BCartCheckoutService — 승인축 서비스의 B2B Store Cart 주문화
 *
 * WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1 (§18 · §20)
 * 계약 정본: `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md`
 *
 * 대상: `APPROVAL_ELIGIBLE_SERVICE_KEYS` = glycopharm / kpa-society / k-cosmetics.
 * 이 서비스들에서 공급자 상품이 노출되려면 `offer_service_approvals` 의 **승인 행**이 있어야
 * 한다. Pharmacy-Hub 식 `service_keys` opt-in 만으로는 우회되지 않는다
 * (`OfferExposureStrategy('approval')` 참조).
 *
 * 이 클래스는 wrapper 다 — 승격 로직은 전부 `B2BCheckoutConfirmCore` 에 있다. 여기 남는 것은
 * 승인축 계약 표면(실패 code 어휘 · order metadata · seller 축 · 결과 shape)뿐이다.
 *
 * 매장 조직(organizationId): `required`. 승인축 서비스의 B2B 주문은 **매장이 주체**이므로
 * 서버가 조직을 확정하지 못하면 주문하지 않는다. 클라이언트가 보낸 organizationId 는
 * 선택값(hint)이며, 서버 후보 집합 안에 있을 때만 유효하다(결함 O1).
 *
 * payment-first: `createOrder` 기본값 paymentStatus='pending'. 결제 완료 이후에야
 * `CheckoutFulfillmentBridge` 가 공급자 fulfillment 로 넘긴다(그 단계는 confirm 밖).
 */
import { DataSource } from 'typeorm';
import {
  B2BCheckoutConfirmCore,
  type B2BConfirmAdapter,
  type B2BConfirmInput,
  type B2BConfirmScope,
} from './b2b-checkout-confirm.core.js';
import type {
  B2BCheckoutResult,
  B2BCreatedOrderSummary,
} from './neture-b2b-cart-checkout.service.js';

/**
 * CheckoutFulfillmentBridge 가 이 축의 주문을 식별하는 source tag.
 *
 * 서비스별로 tag 를 쪼개지 않는다 — 공급자 workspace 의 실제 스코프 축은
 * `metadata.serviceKey` → `neture_orders.service_key` 이고, `source` 는 bridge 진입 자격
 * 판정용이다. 기존 tag(`neture_b2b_checkout` · `pharmacy_hub_cart`)는 건드리지 않는다.
 */
export const STORE_B2B_ORDER_SOURCE = 'store_b2b_cart';

const storeB2BAdapter: B2BConfirmAdapter = {
  organizationPolicy: 'required',
  requireCartSupplierId: false,
  enforceCartSupplierMatch: false,
  paymentGroupIdPrefix: 'pg_',

  unsupportedSourceType: (it) => ({
    code: 'UNSUPPORTED_CART_ITEM_SOURCE',
    reason: `지원하지 않는 항목 유형입니다 (${it.sourceType}). B2B 주문은 b2b/regular 만 가능합니다.`,
  }),
  missingOffer: () => ({
    code: 'MISSING_OFFER',
    reason: 'supplierProductOfferId 가 없어 주문할 수 없습니다.',
  }),
  // 승인 축은 strategy WHERE 에서 이미 걸러졌으므로 미조회 = 미승인/미제공/삭제됨
  offerNotFound: () => ({
    code: 'OFFER_NOT_APPROVED',
    reason: '이 서비스에 공급 승인되지 않은 상품입니다.',
  }),
  groupPoisoned: () => ({
    code: 'GROUP_PARTIAL_FAILURE',
    reason: '동일 공급자 항목 중 일부가 검증 실패하여 그룹 전체 주문을 보류했습니다.',
  }),
  orderCreateFailed: (error) => ({
    code: 'ORDER_CREATE_FAILED',
    reason: (error as { message?: string } | null)?.message || '주문 생성에 실패했습니다.',
  }),

  buildLineItemMetadata: (v, ctx) => ({
    sourceType: v.item.sourceType,
    supplierProductOfferId: v.offer.id,
    masterId: v.offer.master_id,
    cartItemId: v.item.id,
    serviceKey: ctx.scope.serviceKey,
    unitPriceSource: v.unitPriceSource,
    confirmedUnitPrice: v.unitPrice,
  }),

  buildSellerAxis: (ctx) => ({
    // 매장이 주체다 — 서버가 확정한 조직이 seller 축이다.
    sellerId: ctx.organizationId ?? ctx.scope.buyerId,
    sellerOrganizationId: ctx.organizationId ?? undefined,
  }),

  buildOrderMetadata: (ctx) => ({
    source: STORE_B2B_ORDER_SOURCE,
    serviceKey: ctx.scope.serviceKey,
    sourceTypes: [...new Set(ctx.group.map((v) => v.item.sourceType))],
    orderType: 'STORE_RESTOCK',
    cartItemIds: ctx.cartItemIds,
    supplierProductOfferIds: ctx.group.map((v) => v.offer.id),
    supplierId: ctx.supplierId,
    pricingRevalidationRequired: true,
    fulfillmentVisibility: 'hidden_until_paid',
    paymentGroupId: ctx.paymentGroupId,
    paymentGroupSource: 'multi_supplier_cart',
    shippingFeeSource: ctx.shippingResult.policySource,
    freeShippingApplied: ctx.shippingResult.freeShippingApplied,
    ...(ctx.input.note ? { note: ctx.input.note } : {}),
  }),
};

export class StoreB2BCartCheckoutService {
  private core: B2BCheckoutConfirmCore;

  constructor(dataSource: DataSource) {
    this.core = new B2BCheckoutConfirmCore(dataSource, storeB2BAdapter);
  }

  /** 응답 shape 은 Neture B2B confirm 과 동일하다 — 공통 frontend 소비자가 분기하지 않도록. */
  async confirm(scope: B2BConfirmScope, input: B2BConfirmInput = {}): Promise<B2BCheckoutResult> {
    const result = await this.core.confirm(scope, input);

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
