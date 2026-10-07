/**
 * EventOfferCartCheckoutService — Store Cart checkout 확정 (Phase 1b)
 *
 * WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1
 *
 * canonical Store Cart 에 담긴 KPA 이벤트오퍼(sourceType='event_offer') 항목을 주문 확정한다.
 *
 * 정책(고정):
 *   - 이벤트오퍼는 별도 주문 단위가 아니라 line item 의 성격이다. 주문 단위는 **공급자(+판매 org)**.
 *   - 같은 (supplierId, sellerOrganizationId) 그룹의 항목은 하나의 checkout_order 로 병합 생성한다.
 *   - line item metadata 에서만 source(event_offer)·eventOfferId·priceSnapshot 등을 보존한다.
 *   - 배송비/무료배송/합계는 공급자 그룹 단위로 계산(createOrder 가 group subtotal 로 계산).
 *   - participate API 는 주문 생성 경로로 쓰지 않는다. 검증/차감은 EventOfferService 의
 *     loadEventOfferContext + reserveEventOfferListing helper 를 재사용한다.
 *
 * 원자성: 공급자 그룹 단위 atomic(그룹 1트랜잭션으로 reserve→commit→createOrder, 실패 시 차감 보상).
 *   그룹 간은 best-effort — 실패 그룹 item 은 cart 에 남기고 failedItems 로 보고한다.
 *   (createOrder 가 비트랜잭션이라 교차 공급자 전역 all-or-nothing 은 V1 범위 밖.)
 *
 * V1 한정: KPA event_offer (cart serviceKey 'kpa-society' → event-offer service_key 'kpa-groupbuy').
 */
import { DataSource, Repository, In } from 'typeorm';
import { StoreCartItem } from '../../entities/cart/StoreCartItem.entity.js';
import {
  EventOfferService,
  type EventOfferOrderContext,
} from '../../routes/kpa/services/event-offer.service.js';
import { checkoutService } from '../checkout.service.js';
import { calculateSupplierShippingFee } from '../shipping/supplier-shipping.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { semiFranchiseAccessKeyFor } from '../../common/auth/service-login-eligibility.policy.js';
import { hasServiceSemiFranchiseSupplyAccess } from '../../modules/neture-pharmacy/services/supply-access.js';
import { resolveBuyerOrganization } from '../../utils/buyer-organization.resolver.js';
import { B2BConfirmError } from './b2b-checkout-confirm.core.js';

/**
 * cart serviceKey(플랫폼 키) → event-offer(OPL) service_key.
 * WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2: KCos 확장.
 *   KCos event-offer 는 동일한 EventOfferService 를 각 service_key 로 재사용하므로
 *   매핑만 추가하면 reserve/createOrder/store-link(STORE_SERVICE_KEY_MAP) 가 그대로 동작한다.
 */
const CART_TO_EVENT_OFFER_SERVICE_KEY: Record<string, string> = {
  [SERVICE_KEYS.KPA_SOCIETY]: SERVICE_KEYS.KPA_GROUPBUY, // 'kpa-society' → 'kpa-groupbuy'
  [SERVICE_KEYS.K_COSMETICS]: SERVICE_KEYS.K_COSMETICS_EVENT_OFFER, // 'k-cosmetics' → 'k-cosmetics-event-offer'
};

export interface CheckoutConfirmScope {
  buyerId: string;
  serviceKey: string;
}

export interface CheckoutConfirmInput {
  itemIds?: string[];
  note?: string;
  /** 구매 매장(조직) 선택값(hint). 권위는 서버 검증이다 — B2B confirm 과 같은 계약(결함 O1). */
  organizationId?: string;
  /**
   * 화면이 고른 매장(`X-Store-Organization-Id`, CHECK-O4O-URL-FIRST-CENSUS-V1 §21-14). 후보 안에 있을 때만 쓰고
   * 밖이면 없는 것과 같다(`resolveStoreOrganization` 의 preferred 와 같은 계약).
   */
  preferredOrganizationId?: string | null;
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

export class CartCheckoutError extends Error {
  constructor(
    public code: 'UNSUPPORTED_CART_SERVICE' | 'VALIDATION_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'CartCheckoutError';
  }
}

interface ResolvedItem {
  item: StoreCartItem;
  ctx: EventOfferOrderContext;
}

interface ListingAgg {
  ctx: EventOfferOrderContext;
  quantity: number;
  cartItemIds: string[];
}

export class EventOfferCartCheckoutService {
  private cartRepo: Repository<StoreCartItem>;
  private eventOfferService: EventOfferService;

  constructor(private dataSource: DataSource) {
    this.cartRepo = dataSource.getRepository(StoreCartItem);
    this.eventOfferService = new EventOfferService(dataSource);
  }

  async confirm(
    scope: CheckoutConfirmScope,
    input: CheckoutConfirmInput = {},
  ): Promise<CheckoutConfirmResult> {
    const eventServiceKey = CART_TO_EVENT_OFFER_SERVICE_KEY[scope.serviceKey];
    if (!eventServiceKey) {
      throw new CartCheckoutError(
        'UNSUPPORTED_CART_SERVICE',
        `주문 확정을 지원하지 않는 서비스입니다: ${scope.serviceKey}`,
      );
    }

    // 1. cart item 조회 (선택 itemIds 필터)
    let items = await this.cartRepo.find({
      where: { buyerId: scope.buyerId, serviceKey: scope.serviceKey },
      order: { createdAt: 'ASC' },
    });
    if (input.itemIds?.length) {
      const want = new Set(input.itemIds);
      items = items.filter((i) => want.has(i.id));
    }

    const failedItems: FailedCartItem[] = [];

    // 2. V1 지원 대상(event_offer)만 분리
    const eligible: StoreCartItem[] = [];
    for (const it of items) {
      if (it.sourceType !== 'event_offer') {
        failedItems.push({
          itemId: it.id,
          reason: 'UNSUPPORTED_CART_ITEM_SOURCE',
          message: `V1은 이벤트오퍼 항목만 주문 확정할 수 있습니다 (${it.sourceType}).`,
        });
        continue;
      }
      if (!it.eventOfferId) {
        failedItems.push({
          itemId: it.id,
          reason: 'MISSING_EVENT_OFFER_ID',
          message: 'eventOfferId 가 없어 주문 확정할 수 없습니다.',
        });
        continue;
      }
      eligible.push(it);
    }

    // 2-1. CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 D1 — 세미프랜차이즈 서비스(kpa-society → pharmacy)의
    //   이벤트 공급은 **구매 약국 조직**의 그 세미프랜차이즈 가입이 active 일 때만 주문한다.
    //   구매 조직은 B2B confirm 과 같은 계약으로 서버가 확정한다(선택값은 hint · 다중 약국에서 선택이 없으면 400 ·
    //   타인 조직은 403). 사용자가 가진 다른 약국의 가입으로 대신 인정하지 않고, 임의의 약국을 고르지 않는다.
    //   ctx.organizationId 는 이벤트 운영 조직이라 구매 약국 판정에 쓰지 않는다.
    const semiFranchiseKey = semiFranchiseAccessKeyFor(scope.serviceKey);
    if (
      semiFranchiseKey &&
      eligible.length > 0 &&
      !(await hasServiceSemiFranchiseSupplyAccess(
        this.dataSource,
        scope.serviceKey,
        await this.resolvePurchasingOrganization(scope, input, eligible),
      ))
    ) {
      for (const it of eligible.splice(0)) {
        failedItems.push({
          itemId: it.id,
          reason: 'SEMI_FRANCHISE_MEMBERSHIP_REQUIRED',
          message: `${semiFranchiseKey} 세미프랜차이즈 가입 승인 후 주문할 수 있는 이벤트 상품입니다.`,
        });
      }
    }

    // 3. 각 item 컨텍스트 로드 (실패 → failedItems)
    const resolved: ResolvedItem[] = [];
    for (const it of eligible) {
      try {
        const ctx = await this.eventOfferService.loadEventOfferContext(
          it.eventOfferId as string,
          eventServiceKey,
        );
        resolved.push({ item: it, ctx });
      } catch (e: any) {
        failedItems.push({
          itemId: it.id,
          reason: e?.code || 'CONTEXT_LOAD_FAILED',
          message: e?.message || '이벤트오퍼 정보를 불러오지 못했습니다.',
        });
      }
    }

    // 4. (supplierId, sellerOrganizationId) 기준 그룹핑
    const groups = new Map<string, ResolvedItem[]>();
    for (const r of resolved) {
      const key = `${r.ctx.supplierId}__${r.ctx.organizationId}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(r);
      else groups.set(key, [r]);
    }

    const createdOrders: CreatedOrderSummary[] = [];
    const removedCartItemIds: string[] = [];

    // 5. 그룹별 reserve(원자) → 병합 createOrder → cart 정리 / 실패 보상
    for (const group of groups.values()) {
      // 동일 listingId 수량 합산 (중복 add 과다차감 방지)
      const byListing = new Map<string, ListingAgg>();
      for (const r of group) {
        const cur = byListing.get(r.ctx.listingId);
        if (cur) {
          cur.quantity += r.item.quantity;
          cur.cartItemIds.push(r.item.id);
        } else {
          byListing.set(r.ctx.listingId, {
            ctx: r.ctx,
            quantity: r.item.quantity,
            cartItemIds: [r.item.id],
          });
        }
      }

      // 5a. reserve (그룹 1트랜잭션)
      const reservations: { listingId: string; decrementedQty: number }[] = [];
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (const [listingId, agg] of byListing) {
          const { decrementedQty } = await this.eventOfferService.reserveEventOfferListing(qr, {
            listingId,
            serviceKey: eventServiceKey,
            userId: scope.buyerId,
            quantity: agg.quantity,
          });
          reservations.push({ listingId, decrementedQty });
        }
        await qr.commitTransaction();
      } catch (e: any) {
        if (qr.isTransactionActive) await qr.rollbackTransaction();
        for (const r of group) {
          failedItems.push({
            itemId: r.item.id,
            reason: e?.code || 'RESERVATION_FAILED',
            message: e?.message || '재고 검증/차감에 실패했습니다.',
          });
        }
        continue;
      } finally {
        await qr.release();
      }

      // 5b. 병합 createOrder (line item 단위 source 보존)
      const first = group[0].ctx;
      const lineItems = Array.from(byListing.values()).map((agg) => ({
        productId: agg.ctx.offerId,
        productName: agg.ctx.productName,
        quantity: agg.quantity,
        unitPrice: agg.ctx.unitPrice,
        subtotal: agg.quantity * agg.ctx.unitPrice,
        metadata: {
          sourceType: 'event_offer',
          eventOfferId: agg.ctx.listingId,
          organizationProductListingId: agg.ctx.listingId,
          // per_store_limit 누적 집계(STORE_ORDERED_QTY_SQL)가 읽는 키. 없으면 장바구니 주문이 한도에서 빠진다.
          productListingId: agg.ctx.listingId,
          cartItemIds: agg.cartItemIds,
          pricingSource: 'event_offer',
          confirmedUnitPrice: agg.ctx.unitPrice,
        },
      }));

      // WO-O4O-CHECKOUT-CREATEORDER-SHIPPING-RESPONSIBILITY-CLEANUP-V1:
      // 배송비는 orchestrator(=cart preview 와 동일 기준)에서 계산해 snapshot 으로 전달한다.
      // createOrder 는 이 값을 그대로 저장(배송비 재결정 안 함). preview 와 동일 fn·정책·subtotal → 정렬 보장.
      const groupSubtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
      const shippingFeeSnapshot = calculateSupplierShippingFee(
        groupSubtotal,
        first.shippingPolicy,
      ).shippingFee;

      try {
        const savedOrder = await checkoutService.createOrder({
          buyerId: scope.buyerId,
          sellerId: first.organizationId,
          supplierId: first.supplierId,
          sellerOrganizationId: first.organizationId,
          items: lineItems,
          shippingPolicy: first.shippingPolicy,
          shippingFeeSnapshot,
          metadata: {
            source: 'store_cart_checkout',
            serviceKey: eventServiceKey,
            sourceTypes: ['event_offer'],
            cartItemIds: group.map((r) => r.item.id),
            eventOfferIds: Array.from(byListing.keys()),
            ...(input.note ? { note: input.note } : {}),
          },
        });

        // 5c. 매장 자동 진열 (best-effort, listing 단위)
        for (const [listingId, agg] of byListing) {
          await this.eventOfferService.tryLinkStoreProduct({
            userId: scope.buyerId,
            eventServiceKey,
            eventListingId: listingId,
            masterId: agg.ctx.masterId,
            offerId: agg.ctx.offerId,
          });
        }

        // 5d. 확정된 cart item 제거 (buyer+service 범위 한정)
        const cartIds = group.map((r) => r.item.id);
        await this.cartRepo.delete({
          id: In(cartIds),
          buyerId: scope.buyerId,
          serviceKey: scope.serviceKey,
        });
        removedCartItemIds.push(...cartIds);

        createdOrders.push({
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          supplierId: first.supplierId,
          sellerOrganizationId: first.organizationId,
          subtotal: savedOrder.subtotal,
          shippingFee: savedOrder.shippingFee,
          totalAmount: savedOrder.totalAmount,
          itemCount: lineItems.length,
          cartItemIds: cartIds,
        });
      } catch (orderErr: any) {
        // 주문 생성 실패 → 그룹 차감 전체 보상, cart 유지
        for (const r of reservations) {
          await this.eventOfferService.incrementListingQuantity(r.listingId, r.decrementedQty);
        }
        for (const r of group) {
          failedItems.push({
            itemId: r.item.id,
            reason: 'ORDER_CREATE_FAILED',
            message: orderErr?.message || '주문 생성에 실패했습니다.',
          });
        }
      }
    }

    return {
      serviceKey: scope.serviceKey,
      createdOrders,
      failedItems,
      removedCartItemIds,
    };
  }

  /**
   * 구매 약국 조직 확정 — `resolveBuyerOrganization`(B2B confirm 결함 O1 과 같은 판정)을 재사용한다.
   * 순서: ① 요청 `organizationId`(명시 선택 — 타인 조직 403) ② 화면 선택 매장 헤더(후보 안일 때만)
   * ③ 장바구니 항목에 담긴 조직(한 곳일 때만) ④ 후보가 하나면 서버 확정 · 여럿이면 400. 모두 클라이언트 유래라 서버가 검증한다.
   */
  private async resolvePurchasingOrganization(
    scope: CheckoutConfirmScope,
    input: CheckoutConfirmInput,
    items: StoreCartItem[],
  ): Promise<string> {
    const explicit = input.organizationId?.trim() || null;
    if (!explicit && input.preferredOrganizationId) {
      const preferred = await resolveBuyerOrganization(
        this.dataSource,
        scope.buyerId,
        scope.serviceKey,
        input.preferredOrganizationId,
      );
      if (preferred.status === 'resolved') return preferred.organizationId;
    }
    const cartOrgs = [...new Set(items.map((it) => it.organizationId).filter((o): o is string => !!o))];
    const requested = explicit || (cartOrgs.length === 1 ? cartOrgs[0] : null);
    if (!requested && cartOrgs.length > 1) {
      throw new B2BConfirmError('AMBIGUOUS_STORE_ORGANIZATION', '주문할 매장(조직)을 선택해 주세요.', 400);
    }
    const resolution = await resolveBuyerOrganization(this.dataSource, scope.buyerId, scope.serviceKey, requested);
    switch (resolution.status) {
      case 'resolved':
        return resolution.organizationId;
      case 'none':
        throw new B2BConfirmError('STORE_ORGANIZATION_NOT_FOUND', '주문할 수 있는 매장(조직)이 없습니다.', 403);
      case 'ambiguous':
        throw new B2BConfirmError('AMBIGUOUS_STORE_ORGANIZATION', '주문할 매장(조직)을 선택해 주세요.', 400);
      case 'forbidden':
      default:
        throw new B2BConfirmError('FOREIGN_STORE_ORGANIZATION', '선택한 매장에 대한 권한이 없습니다.', 403);
    }
  }
}
