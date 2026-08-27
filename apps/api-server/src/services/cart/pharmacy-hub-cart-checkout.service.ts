/**
 * PharmacyHubCartCheckoutService — Pharmacy-Hub 약국 장바구니 → 공급자별 주문 생성
 *
 * WO-PHARMACY-HUB-B2B-CART-AND-BUYER-ORDER-V1 (Phase 1)
 * Phase 2: WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1 (배송비 snapshot · paymentGroupId)
 * 공통화: WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1
 *
 * canonical Store Cart(`store_cart_items`, serviceKey='pharmacy-hub')에 담긴 항목을
 * **공급자별 `checkout_orders`** 로 생성한다. 주문 생성은 E-commerce Core 단일 진입점인
 * `checkoutService.createOrder()` 만 사용한다 (CLAUDE.md §4).
 *
 * ── 왜 이제 Core 를 공유하는가 ────────────────────────────────────────────────
 * 이전에는 "게이트 의미가 다르다"는 이유로 Neture 와 로직을 분리했다. 실제로 다른 것은
 * **공급 노출 정책 하나**였고, 그것은 이제 `OfferExposureStrategy` 로 명시적으로 분리됐다:
 *   Pharmacy-Hub → `optin`  : 공급자 opt-in(`service_keys @> {pharmacy-hub}`), 운영자 승인 없음
 *   Neture       → `neture` : approval_status / distribution_type / allowed_seller_ids
 *   승인축 3서비스 → `approval`: `offer_service_approvals` 승인 필수
 * 나머지(가격 재확정 · 공급자 그룹 원자성 · 주문 생성 · cart 정리)는 Core 가 담당한다.
 * 이 클래스에는 Pharmacy-Hub **계약 표면**만 남는다 — 실패 code 어휘, metadata, 결과 shape.
 *
 * ── 노출 게이트 (약국 상품 조회와 동일 SSOT) ──────────────────────────────────
 *   'pharmacy-hub' = ANY(spo.service_keys)   ← 공급자 opt-in (제공 축)
 *   spo.is_active = true · spo.deleted_at IS NULL
 *   spo.distribution_type <> 'PRIVATE'       ← PRIVATE 은 매장범위 모델, Pharmacy-Hub 에 축 없음
 *   neture_suppliers.status = 'ACTIVE' · product_masters.status = 'ACTIVE'
 * `PharmacyHubStoreProductController` 의 EXPOSURE_GATE_SQL 과 같은 조건이다 —
 * **조회에 보이면 담을 수 있고, 담을 수 있으면 주문 시점에 같은 기준으로 재검증**된다.
 *
 * ── 여전히 범위 밖 ────────────────────────────────────────────────────────────
 *   정산 · 쿠폰 · 반품(부분) · 공급자별 분할 결제.
 */
import { DataSource } from 'typeorm';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  B2BCheckoutConfirmCore,
  type B2BConfirmAdapter,
} from './b2b-checkout-confirm.core.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

export class PharmacyHubCheckoutError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = 'PharmacyHubCheckoutError';
  }
}

export interface PharmacyHubCheckoutScope {
  buyerId: string;
}

export interface PharmacyHubCheckoutInput {
  itemIds?: string[];
  note?: string;
}

export interface FailedItem {
  itemId: string;
  productName: string;
  code: string;
  reason: string;
}

/** Pharmacy-Hub 계약 표면 — code 어휘/metadata/seller 축. Core 가 이 adapter 를 호출한다. */
const pharmacyHubAdapter: B2BConfirmAdapter = {
  // Pharmacy-Hub 는 조직 격리 서비스가 아니다 — 조직을 주문에 승격하지 않는다.
  organizationPolicy: 'unused',
  requireCartSupplierId: false,
  enforceCartSupplierMatch: false,

  unsupportedSourceType: () => ({
    code: 'UNSUPPORTED_SOURCE_TYPE',
    reason: '주문할 수 없는 항목입니다.',
  }),
  missingOffer: () => ({
    code: 'MISSING_OFFER',
    reason: '공급자 상품 정보가 없어 주문할 수 없습니다.',
  }),
  // 제공 축은 쿼리(strategy WHERE)에서 이미 걸러졌으므로 미조회 = 미제공 또는 삭제됨
  offerNotFound: () => ({
    code: 'NOT_DELIVERED',
    reason: '현재 파머시 허브에 제공되지 않는 상품입니다.',
  }),
  groupPoisoned: () => ({
    code: 'SUPPLIER_GROUP_FAILED',
    reason: '같은 공급자의 다른 상품에 문제가 있어 주문하지 않았습니다.',
  }),
  orderCreateFailed: (error, ctx) => {
    logger.error('[PharmacyHubCartCheckout] order creation failed', {
      supplierId: ctx.supplierId,
      buyerId: ctx.scope.buyerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      code: 'ORDER_CREATE_FAILED',
      reason: '주문 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    };
  },

  onEmptySelection: () => {
    throw new PharmacyHubCheckoutError('EMPTY_CART', '주문할 상품이 없습니다.', 400);
  },

  // 주문 시점 snapshot — 이후 상품/가격이 바뀌어도 주문 내역은 보존된다
  buildLineItemMetadata: (v, ctx) => ({
    supplierProductOfferId: v.offer.id,
    masterId: v.offer.master_id,
    supplierId: ctx.supplierId,
    serviceKey: ctx.scope.serviceKey,
    unitPriceSource: v.unitPriceSource,
  }),

  buildSellerAxis: (ctx) => ({ sellerId: ctx.supplierId }),

  buildOrderMetadata: (ctx) => ({
    // 서비스 경계 축 — 기존 3개 서비스와 동일 규약 (OrderType=RETAIL + metadata.serviceKey)
    serviceKey: ctx.scope.serviceKey,
    source: 'pharmacy_hub_cart',
    note: ctx.input.note,
    supplierId: ctx.supplierId,
    // 공급자가 여럿이어도 1회 결제 — 결제 완료 이벤트가 이 그룹의 주문 전부를 전이시킨다.
    paymentGroupId: ctx.paymentGroupId,
    paymentGroupSource: 'pharmacy_hub_multi_supplier_cart',
    shippingFeeSource: ctx.shippingResult.policySource,
    freeShippingApplied: ctx.shippingResult.freeShippingApplied,
  }),
};

export class PharmacyHubCartCheckoutService {
  private core: B2BCheckoutConfirmCore;

  constructor(dataSource: DataSource) {
    this.core = new B2BCheckoutConfirmCore(dataSource, pharmacyHubAdapter);
  }

  /**
   * 장바구니 → 공급자별 주문 생성.
   *
   * 원자성: **공급자 그룹 단위**. 한 공급자 그룹 안에서 한 건이라도 검증에 실패하면
   * 그 그룹 전체를 주문하지 않는다(금액 일관성). 그룹 간에는 best-effort —
   * 실패한 그룹의 항목은 장바구니에 남고 `failedItems` 로 사유를 돌려준다.
   */
  async confirm(
    scope: PharmacyHubCheckoutScope,
    input: PharmacyHubCheckoutInput = {},
  ): Promise<{
    paymentGroupId: string;
    orders: Array<{
      orderId: string;
      orderNumber: string;
      supplierId: string;
      subtotal: number;
      shippingFee: number;
      totalAmount: number;
      itemCount: number;
    }>;
    failedItems: FailedItem[];
  }> {
    if (!scope.buyerId) {
      throw new PharmacyHubCheckoutError('INVALID_SCOPE', '구매자 정보를 확인할 수 없습니다.', 401);
    }

    const result = await this.core.confirm(
      { buyerId: scope.buyerId, serviceKey: SERVICE_KEY },
      { itemIds: input.itemIds, note: input.note },
    );

    return {
      paymentGroupId: result.paymentGroupId,
      orders: result.createdOrders.map((o) => ({
        orderId: o.orderId,
        orderNumber: o.orderNumber,
        supplierId: o.supplierId,
        subtotal: o.subtotal,
        shippingFee: o.shippingFee,
        totalAmount: o.totalAmount,
        itemCount: o.itemCount,
      })),
      failedItems: result.failedItems,
    };
  }
}
