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
import { SERVICE_KEYS } from '../../constants/service-keys.js';

/** cart serviceKey(플랫폼 키) → event-offer(OPL) service_key */
const CART_TO_EVENT_OFFER_SERVICE_KEY: Record<string, string> = {
  [SERVICE_KEYS.KPA_SOCIETY]: SERVICE_KEYS.KPA_GROUPBUY, // 'kpa-society' → 'kpa-groupbuy'
};

export interface CheckoutConfirmScope {
  buyerId: string;
  serviceKey: string;
}

export interface CheckoutConfirmInput {
  itemIds?: string[];
  note?: string;
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
          cartItemIds: agg.cartItemIds,
          pricingSource: 'event_offer',
          confirmedUnitPrice: agg.ctx.unitPrice,
        },
      }));

      try {
        const savedOrder = await checkoutService.createOrder({
          buyerId: scope.buyerId,
          sellerId: first.organizationId,
          supplierId: first.supplierId,
          sellerOrganizationId: first.organizationId,
          items: lineItems,
          shippingPolicy: first.shippingPolicy,
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
}
