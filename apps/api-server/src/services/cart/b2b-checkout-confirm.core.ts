/**
 * B2B Checkout Confirm Core — service-agnostic `store_cart_items` → `checkout_orders`
 *
 * WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1
 * 계약 정본: `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇이 공통인가
 *
 *   active membership(라우터 경계) → buyer organization 서버 확정 → cart item 조회 →
 *   sourceType ∈ {b2b, regular} 선별 → supplier offer **서버 재조회** →
 *   canonical price 재확정 → quantity 검증 → 공급자별 grouping →
 *   `checkoutService.createOrder()` → 성공 그룹 cart 정리
 *
 *   이 전부가 서비스와 무관하다. Neture / Pharmacy-Hub / 승인축 서비스(GlycoPharm 등)에서
 *   실제로 다른 것은 **공급 노출 정책 하나**이며 그것만 `OfferExposureStrategy` 로 분리한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇이 여전히 서비스별인가 (adapter)
 *
 *   · 실패 code/문구 어휘 — 기존 API 소비자가 code 로 분기하므로 절대 통일하지 않는다.
 *     (Neture `UNSUPPORTED_CART_ITEM_SOURCE`/`OFFER_NOT_FOUND`/`GROUP_PARTIAL_FAILURE`
 *      vs Pharmacy-Hub `UNSUPPORTED_SOURCE_TYPE`/`NOT_DELIVERED`/`SUPPLIER_GROUP_FAILED`)
 *   · order metadata (`source` tag 포함) 와 seller 축
 *   · 빈 선택 시 동작 (PH 는 EMPTY_CART throw, Neture 는 빈 결과 반환)
 *   · cart supplierId 요구/일치 강제 여부
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 신뢰 경계 (결함 O1 / O2 종료)
 *
 *   O1  cart 의 `organizationId` 는 클라이언트가 넣은 값이다. **권위가 아니다.**
 *       Core 는 주문 승격 전에 `resolveBuyerOrganization` 으로 서버 검증한다.
 *       잘못된 organizationId 가 cart 에 들어가더라도 `checkout_orders` 로 승격되지 않는다.
 *   O2  성공 그룹 cart 삭제는 **항상** `id + buyerId + serviceKey` 로 스코프한다.
 *       "내 쿼리 산출 id" 라는 이유로 id-only delete 를 쓰지 않는다.
 *
 * 범위 밖: CheckoutFulfillmentBridge(결제 완료 이후), PG 결제, 정산/쿠폰/반품.
 */
import { randomUUID } from 'crypto';
import { DataSource, Repository, In } from 'typeorm';
import { StoreCartItem } from '../../entities/cart/StoreCartItem.entity.js';
import { checkoutService } from '../checkout.service.js';
import {
  calculateSupplierShippingFee,
  type SupplierShippingPolicy,
} from '../shipping/supplier-shipping.js';
import {
  resolveOfferExposureStrategy,
  type ExposureOfferRow,
  type OfferExposureStrategy,
} from './offer-exposure-strategy.js';
import { resolveBuyerOrganization } from '../../utils/buyer-organization.resolver.js';

/** 주문 대상 cart source type — B2B 축은 공급자 offer 직접 구매만 다룬다. */
export const B2B_ORDERABLE_SOURCE_TYPES: ReadonlySet<string> = new Set(['b2b', 'regular']);

export class B2BConfirmError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = 'B2BConfirmError';
  }
}

export interface B2BConfirmScope {
  buyerId: string;
  serviceKey: string;
}

export interface B2BConfirmInput {
  itemIds?: string[];
  note?: string;
  /** 클라이언트가 **선택**한 매장 조직. 권위가 아니다 — 서버가 검증한다. */
  organizationId?: string | null;
}

export interface CoreFailedItem {
  itemId: string;
  productName: string;
  code: string;
  reason: string;
}

export interface CoreValidItem {
  item: StoreCartItem;
  offer: ExposureOfferRow;
  unitPrice: number;
  /** canonical price 출처 — `offer_service_prices` 인지 `price_general` fallback 인지 */
  unitPriceSource: 'offer_service_price' | 'price_general';
  subtotal: number;
}

export interface CoreGroupContext {
  supplierId: string;
  group: CoreValidItem[];
  cartItemIds: string[];
  groupSubtotal: number;
  shippingPolicy: SupplierShippingPolicy;
  shippingResult: ReturnType<typeof calculateSupplierShippingFee>;
  /** 서버가 확정한 매장 조직 (organizationPolicy='unused' 면 항상 null) */
  organizationId: string | null;
  paymentGroupId: string;
  scope: B2BConfirmScope;
  input: B2BConfirmInput;
}

export interface CoreCreatedOrder {
  orderId: string;
  orderNumber: string;
  supplierId: string;
  organizationId: string | null;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  cartItemIds: string[];
  paymentStatus: string;
}

export interface CoreConfirmResult {
  serviceKey: string;
  paymentGroupId: string;
  createdOrders: CoreCreatedOrder[];
  failedItems: CoreFailedItem[];
  removedCartItemIds: string[];
}

/**
 * 매장 조직(buyer organization) 처리 정책.
 *
 *   required      — 서버가 조직을 확정해야만 주문 가능(승인축 서비스). §7 전체 계약 적용.
 *   validate-only — cart 에 조직이 들어있을 때만 검증하고, 없으면 조직 없이 진행.
 *                   자동 확정하지 않는다 — 자동으로 채우면 seller 축과 SERVICE 유통 판정이
 *                   바뀌어 기존 주문 결과가 달라진다(회귀).
 *   unused        — 이 서비스는 조직을 주문에 승격하지 않는다(조회조차 하지 않는다).
 */
export type BuyerOrganizationPolicy = 'required' | 'validate-only' | 'unused';

export interface B2BConfirmAdapter {
  /** 실패 code/문구 어휘와 order 구성 — 서비스 계약 그대로 */
  organizationPolicy: BuyerOrganizationPolicy;
  /** cart item 에 supplierId 가 반드시 있어야 하는가 (Neture 계약) */
  requireCartSupplierId: boolean;
  /** cart 의 supplierId 와 서버 offer.supplier_id 불일치를 실패로 볼 것인가 (Neture 계약) */
  enforceCartSupplierMatch: boolean;
  /** paymentGroupId 접두사 — 기존 식별 형태를 보존한다 (Neture 'pg_', Pharmacy-Hub 없음) */
  paymentGroupIdPrefix?: string;

  unsupportedSourceType(item: StoreCartItem): { code: string; reason: string };
  missingOffer(item: StoreCartItem): { code: string; reason: string };
  missingSupplier?(item: StoreCartItem): { code: string; reason: string };
  offerNotFound(item: StoreCartItem): { code: string; reason: string };
  supplierMismatch?(item: StoreCartItem): { code: string; reason: string };
  groupPoisoned(v: CoreValidItem): { code: string; reason: string };
  orderCreateFailed(error: unknown, ctx: CoreGroupContext): { code: string; reason: string };

  /** 주문 대상이 하나도 없을 때. throw 하면 그대로 전파된다(PH EMPTY_CART). */
  onEmptySelection?(scope: B2BConfirmScope): void;

  buildLineItemMetadata(v: CoreValidItem, ctx: CoreGroupContext): Record<string, unknown>;
  buildOrderMetadata(ctx: CoreGroupContext): Record<string, unknown>;
  buildSellerAxis(ctx: CoreGroupContext): { sellerId: string; sellerOrganizationId?: string };
}

/**
 * 공통 offer enrich SELECT.
 *
 * `$1` = offerIds(text[]), `$2` = serviceKey. strategy 의 WHERE 절만 뒤에 붙는다 —
 * 값은 전부 파라미터 바인딩이고 strategy 조각은 코드 상수다(사용자 입력 결합 없음).
 *
 * soft delete(`spo.deleted_at`)는 **strategy 가 아니라 여기서** 건다
 * (WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 DF-6).
 * 삭제된 offer 가 주문 가능한지는 서비스별 공급 노출 정책이 아니라 offer 자체의 존재 여부이므로
 * 3축(approval / optin / neture) 공통 불변식이다. strategy 조각에 두면 축이 늘어날 때마다
 * 누락될 수 있고 실제로 `neture` 축에 누락돼 있었다.
 */
function buildOfferQuery(strategy: OfferExposureStrategy): string {
  return `SELECT spo.id::text            AS id,
                 spo.supplier_id::text   AS supplier_id,
                 spo.price_general,
                 spo.is_active,
                 spo.approval_status,
                 spo.distribution_type,
                 spo.allowed_seller_ids,
                 spo.track_inventory,
                 spo.stock_quantity,
                 spo.reserved_quantity,
                 spo.master_id::text     AS master_id,
                 pm.name                 AS product_name,
                 COALESCE(pm.status, 'ACTIVE') AS master_status,
                 ns.status               AS supplier_status,
                 ns.base_shipping_fee,
                 ns.free_shipping_threshold,
                 -- canonical price: 서비스별 공급가 우선, 없으면 price_general fallback
                 (SELECT osp.unit_price FROM offer_service_prices osp
                   WHERE osp.offer_id = spo.id AND osp.service_key = $2) AS service_unit_price
            FROM supplier_product_offers spo
            JOIN product_masters pm  ON pm.id = spo.master_id
            JOIN neture_suppliers ns ON ns.id = spo.supplier_id
           WHERE spo.id::text = ANY($1)
             AND spo.deleted_at IS NULL${strategy.offerWhereSql}`;
}

export class B2BCheckoutConfirmCore {
  private cartRepo: Repository<StoreCartItem>;

  constructor(private dataSource: DataSource, private adapter: B2BConfirmAdapter) {
    this.cartRepo = dataSource.getRepository(StoreCartItem);
  }

  async confirm(scope: B2BConfirmScope, input: B2BConfirmInput = {}): Promise<CoreConfirmResult> {
    if (!scope.buyerId) {
      throw new B2BConfirmError('INVALID_SCOPE', '구매자 정보를 확인할 수 없습니다.', 401);
    }

    const strategy = resolveOfferExposureStrategy(scope.serviceKey);
    if (!strategy) {
      throw new B2BConfirmError(
        'UNSUPPORTED_CART_SERVICE',
        `B2B 주문 확정을 지원하지 않는 서비스입니다: ${scope.serviceKey}`,
      );
    }

    // ── 1. cart item 조회 (buyerId + serviceKey 경계) ────────────────────────
    const all = await this.cartRepo.find({
      where: { buyerId: scope.buyerId, serviceKey: scope.serviceKey },
      order: { createdAt: 'ASC' },
    });
    const selected = input.itemIds?.length
      ? all.filter((it) => input.itemIds!.includes(it.id))
      : all;

    if (selected.length === 0) {
      this.adapter.onEmptySelection?.(scope);
    }

    // ── 2. buyer organization 서버 확정 (결함 O1) ────────────────────────────
    const organizationId = await this.resolveOrganization(scope, input, selected);

    const paymentGroupId = `${this.adapter.paymentGroupIdPrefix ?? ''}${randomUUID()}`;
    const failedItems: CoreFailedItem[] = [];

    // ── 3. 주문 대상 선별 ────────────────────────────────────────────────────
    const candidates: StoreCartItem[] = [];
    for (const it of selected) {
      if (!B2B_ORDERABLE_SOURCE_TYPES.has(it.sourceType)) {
        failedItems.push({ itemId: it.id, productName: it.productName, ...this.adapter.unsupportedSourceType(it) });
        continue;
      }
      if (!it.supplierProductOfferId) {
        failedItems.push({ itemId: it.id, productName: it.productName, ...this.adapter.missingOffer(it) });
        continue;
      }
      if (this.adapter.requireCartSupplierId && !it.supplierId) {
        const f = this.adapter.missingSupplier?.(it) ?? {
          code: 'MISSING_SUPPLIER',
          reason: 'supplierId 가 없어 주문할 수 없습니다.',
        };
        failedItems.push({ itemId: it.id, productName: it.productName, ...f });
        continue;
      }
      candidates.push(it);
    }

    if (candidates.length === 0) {
      return {
        serviceKey: scope.serviceKey,
        paymentGroupId,
        createdOrders: [],
        failedItems,
        removedCartItemIds: [],
      };
    }

    // ── 4. supplier offer 서버 재조회 (cart snapshot 미신뢰) ─────────────────
    //   "cart 에 담겼다" 는 주문 가능의 근거가 아니다. 노출·가격·재고를 지금 다시 본다.
    const offerIds = [...new Set(candidates.map((c) => c.supplierProductOfferId as string))];
    const offerRows: ExposureOfferRow[] = await this.dataSource.query(buildOfferQuery(strategy), [
      offerIds,
      scope.serviceKey,
    ]);
    const offerMap = new Map<string, ExposureOfferRow>(offerRows.map((o) => [o.id, o]));

    // ── 5. 게이트 검증 ───────────────────────────────────────────────────────
    const valids: CoreValidItem[] = [];
    const poisonedSuppliers = new Set<string>();

    for (const it of candidates) {
      const offer = offerMap.get(it.supplierProductOfferId as string);
      const fail = (code: string, reason: string) => {
        failedItems.push({ itemId: it.id, productName: it.productName, code, reason });
        // 그룹 금액 일관성: 실패 item 이 속한 공급자 그룹 전체를 무효화한다.
        if (offer?.supplier_id) poisonedSuppliers.add(offer.supplier_id);
        if (it.supplierId) poisonedSuppliers.add(it.supplierId);
      };

      if (!offer) {
        const f = this.adapter.offerNotFound(it);
        fail(f.code, f.reason);
        continue;
      }
      if (this.adapter.enforceCartSupplierMatch && offer.supplier_id !== it.supplierId) {
        const f = this.adapter.supplierMismatch?.(it) ?? {
          code: 'SUPPLIER_MISMATCH',
          reason: '공급자 정보가 일치하지 않습니다.',
        };
        fail(f.code, f.reason);
        continue;
      }
      if (!offer.is_active) {
        fail('PRODUCT_INACTIVE', `비활성 상품입니다: ${offer.product_name}`);
        continue;
      }

      // 서비스별 공급 노출 정책 — 유일한 서비스 분기점
      const exposureFail = strategy.gate(offer, {
        buyerId: scope.buyerId,
        serviceKey: scope.serviceKey,
        organizationId: this.adapter.organizationPolicy === 'unused' ? null : (it.organizationId ?? organizationId ?? null),
      });
      if (exposureFail) {
        fail(exposureFail.code, exposureFail.reason);
        continue;
      }

      if (offer.supplier_status !== 'ACTIVE') {
        fail('SUPPLIER_INACTIVE', `비활성 공급자입니다: ${offer.product_name}`);
        continue;
      }
      if (!Number.isInteger(it.quantity) || it.quantity <= 0 || it.quantity > 1000) {
        fail('INVALID_QUANTITY', `수량이 올바르지 않습니다: ${offer.product_name}`);
        continue;
      }

      // canonical price 재확정 — frontend/cart snapshot 은 표시용이며 신뢰하지 않는다.
      const hasServicePrice = offer.service_unit_price != null;
      const unitPrice = hasServicePrice ? Number(offer.service_unit_price) : Number(offer.price_general);
      if (!(unitPrice > 0)) {
        fail('INVALID_PRICE', `가격이 올바르지 않습니다: ${offer.product_name}`);
        continue;
      }

      if (offer.track_inventory) {
        const available = Number(offer.stock_quantity) - Number(offer.reserved_quantity);
        if (available < it.quantity) {
          fail(
            'INSUFFICIENT_STOCK',
            `재고가 부족합니다: ${offer.product_name} (가용 ${available}, 요청 ${it.quantity})`,
          );
          continue;
        }
      }

      valids.push({
        item: it,
        offer,
        unitPrice,
        unitPriceSource: hasServicePrice ? 'offer_service_price' : 'price_general',
        subtotal: unitPrice * it.quantity,
      });
    }

    // ── 6. 공급자별 grouping (권위 = 서버 offer.supplier_id) ─────────────────
    const groups = new Map<string, CoreValidItem[]>();
    for (const v of valids) {
      if (poisonedSuppliers.has(v.offer.supplier_id)) continue;
      const bucket = groups.get(v.offer.supplier_id);
      if (bucket) bucket.push(v);
      else groups.set(v.offer.supplier_id, [v]);
    }
    // 오염된 그룹의 유효 항목도 주문하지 않고 사유를 남긴다.
    for (const v of valids) {
      if (!poisonedSuppliers.has(v.offer.supplier_id)) continue;
      failedItems.push({ itemId: v.item.id, productName: v.item.productName, ...this.adapter.groupPoisoned(v) });
    }

    // ── 7. 그룹별 주문 생성 ──────────────────────────────────────────────────
    const createdOrders: CoreCreatedOrder[] = [];
    const removedCartItemIds: string[] = [];

    for (const [supplierId, group] of groups.entries()) {
      const cartItemIds = group.map((v) => v.item.id);
      const groupSubtotal = group.reduce((sum, v) => sum + v.subtotal, 0);
      const shippingPolicy: SupplierShippingPolicy = {
        baseShippingFee:
          group[0].offer.base_shipping_fee != null ? Number(group[0].offer.base_shipping_fee) : null,
        freeShippingThreshold:
          group[0].offer.free_shipping_threshold != null
            ? Number(group[0].offer.free_shipping_threshold)
            : null,
      };
      const shippingResult = calculateSupplierShippingFee(groupSubtotal, shippingPolicy);

      const ctx: CoreGroupContext = {
        supplierId,
        group,
        cartItemIds,
        groupSubtotal,
        shippingPolicy,
        shippingResult,
        organizationId:
          this.adapter.organizationPolicy === 'unused'
            ? null
            : (organizationId ?? group.map((v) => v.item.organizationId).find((o): o is string => !!o) ?? null),
        paymentGroupId,
        scope,
        input,
      };

      const lineItems = group.map((v) => ({
        // ⚠️ productId = **SupplierProductOffer id** (master_id 아님).
        //   공급자 workspace 는 `supplier_product_offers.id = neture_order_items.product_id` 로
        //   주문을 스코프한다. master_id 를 넣으면 결제까지 성공하고도 공급자에게 보이지 않는다.
        productId: v.offer.id,
        productName: v.offer.product_name,
        quantity: v.item.quantity,
        unitPrice: v.unitPrice,
        subtotal: v.subtotal,
        metadata: this.adapter.buildLineItemMetadata(v, ctx),
      }));

      try {
        const savedOrder = await checkoutService.createOrder({
          buyerId: scope.buyerId,
          supplierId,
          ...this.adapter.buildSellerAxis(ctx),
          items: lineItems,
          shippingPolicy,
          shippingFeeSnapshot: shippingResult.shippingFee,
          metadata: this.adapter.buildOrderMetadata(ctx),
        });

        // 결함 O2: 성공 그룹 cart 정리는 **항상** buyerId + serviceKey 로 스코프한다.
        await this.cartRepo.delete({
          id: In(cartItemIds),
          buyerId: scope.buyerId,
          serviceKey: scope.serviceKey,
        });
        removedCartItemIds.push(...cartItemIds);

        createdOrders.push({
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          supplierId,
          organizationId: ctx.organizationId,
          subtotal: Number(savedOrder.subtotal),
          shippingFee: Number(savedOrder.shippingFee),
          totalAmount: Number(savedOrder.totalAmount),
          itemCount: lineItems.length,
          cartItemIds,
          paymentStatus: savedOrder.paymentStatus,
        });
      } catch (error) {
        const f = this.adapter.orderCreateFailed(error, ctx);
        for (const v of group) {
          failedItems.push({ itemId: v.item.id, productName: v.item.productName, ...f });
        }
      }
    }

    return {
      serviceKey: scope.serviceKey,
      paymentGroupId,
      createdOrders,
      failedItems,
      removedCartItemIds,
    };
  }

  /**
   * 결함 O1 종료 — client `organizationId` 는 선택값(hint), 서버 판정이 권위.
   *
   * `required` 정책에서만 조직을 확정한다. `validate-only` 는 cart/요청에 조직이 있을 때만
   * 검증하고(타인 조직이면 403), 없으면 조직 없이 진행한다 — 자동 확정은 seller 축과
   * SERVICE 유통 판정을 바꾸므로 기존 서비스의 회귀가 된다.
   */
  private async resolveOrganization(
    scope: B2BConfirmScope,
    input: B2BConfirmInput,
    selected: StoreCartItem[],
  ): Promise<string | null> {
    const policy = this.adapter.organizationPolicy;
    if (policy === 'unused') return null;

    const requested = input.organizationId?.trim() || null;

    if (policy === 'validate-only') {
      // cart 에 들어있는 조직도 클라이언트 유래다 — 승격 전에 반드시 서버 검증한다.
      // 조직이 아예 없으면 조직 없이 진행한다(자동 확정 금지 — 기존 주문 결과가 바뀐다).
      const cartOrgs = [
        ...new Set(selected.map((it) => it.organizationId).filter((o): o is string => !!o)),
      ];
      const targets = requested ? [...new Set([requested, ...cartOrgs])] : cartOrgs;
      if (targets.length === 0) return null;

      let resolved: string | null = null;
      for (const target of targets) {
        const r = await resolveBuyerOrganization(this.dataSource, scope.buyerId, scope.serviceKey, target);
        if (r.status !== 'resolved') {
          throw new B2BConfirmError(
            'FOREIGN_STORE_ORGANIZATION',
            '선택한 매장에 대한 권한이 없습니다.',
            403,
          );
        }
        if (resolved === null) resolved = r.organizationId;
      }
      return resolved;
    }

    // policy === 'required'
    const resolution = await resolveBuyerOrganization(this.dataSource, scope.buyerId, scope.serviceKey, requested);
    switch (resolution.status) {
      case 'resolved':
        return resolution.organizationId;
      case 'none':
        throw new B2BConfirmError(
          'STORE_ORGANIZATION_NOT_FOUND',
          '주문할 수 있는 매장(조직)이 없습니다.',
          403,
        );
      case 'ambiguous':
        // 다중 조직 사용자를 차단하지 않는다 — 어느 매장인지 선택을 요구할 뿐이다.
        throw new B2BConfirmError(
          'AMBIGUOUS_STORE_ORGANIZATION',
          '주문할 매장(조직)을 선택해 주세요.',
          400,
        );
      case 'forbidden':
      default:
        throw new B2BConfirmError(
          'FOREIGN_STORE_ORGANIZATION',
          '선택한 매장에 대한 권한이 없습니다.',
          403,
        );
    }
  }
}
