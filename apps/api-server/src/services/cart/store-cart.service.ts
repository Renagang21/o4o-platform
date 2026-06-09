/**
 * StoreCartService — Canonical Store Cart foundation
 * WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1
 *
 * 매장 경영자가 주문 가능한 모든 상품 유형(운영자 승인 / B2B / 이벤트 오퍼 /
 * 판매자 모집)을 단일 cart item 표준으로 담는 서버 백엔드 장바구니의 저장/조회 계층.
 *
 * 경계: buyerId(구매 주체) + serviceKey. organizationId(매장)는 보존만 한다.
 *
 * V1 범위 (foundation only):
 *   - add / update / remove / list / clear
 *   - supplierId 기준 grouping 조회
 *   - checkout preview (공급자별 draft order 형상 — 실제 주문/결제는 생성하지 않음)
 *
 * V1 비범위 (의도적으로 하지 않음):
 *   - 기존 cart(KPA localStorage / Glyco·Neture) 대체
 *   - event-offer participate 제거 / 수량 차감 이전
 *   - checkoutService.createOrder 호출 (orchestrator 는 형상 skeleton 만 제공)
 *   - 결제 / 정산 변경
 *
 * 신뢰 가격·재고의 최종 검증은 후속 Phase 의 checkout 확정 단계에서 수행한다.
 * priceSnapshot 은 담을 때의 표시용 임시값일 뿐이다.
 */
import { DataSource, Repository } from 'typeorm';
import {
  StoreCartItem,
  type CartSourceType,
  type CartPricingSource,
} from '../../entities/cart/StoreCartItem.entity.js';

const VALID_SOURCE_TYPES: CartSourceType[] = [
  'regular',
  'operator_approved',
  'b2b',
  'event_offer',
  'seller_recruitment',
];

const VALID_PRICING_SOURCES: CartPricingSource[] = ['regular', 'event_offer'];

/** cart 경계 — 모든 조회/변경은 이 둘로 스코프된다 */
export interface CartScope {
  buyerId: string;
  serviceKey: string;
}

/** cart 에 담기 위한 입력 — 상품 참조는 sourceType 에 따라 일부만 채워진다 */
export interface AddCartItemInput {
  organizationId?: string | null;
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

export interface UpdateCartItemInput {
  quantity: number;
}

/** 공급자별 묶음 — 배송비/무료배송/주문 분할의 단위 */
export interface SupplierGroup {
  supplierId: string | null;
  items: StoreCartItem[];
  itemCount: number;
  totalQuantity: number;
  /** priceSnapshot 기준 표시용 소계(원). 신뢰 금액 아님. */
  displaySubtotal: number;
}

/**
 * checkout 오케스트레이션 준비용 draft.
 *
 * checkoutService.CreateOrderDto 와 호환되는 부분 형상이다. 단, 본 서비스는
 * createOrder 를 호출하지 않는다 — 후속 Phase 의 orchestrator 가 이 draft 를 입력으로
 * 받아 공급자별 createOrder() 를 N 회 호출하고, 그때 가격/재고를 재검증한다.
 */
export interface DraftSupplierOrder {
  supplierId: string | null;
  sellerOrganizationId?: string | null;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    /** priceSnapshot — checkout 확정 시 재검증 대상 (신뢰 금액 아님) */
    unitPrice: number;
    subtotal: number;
    sourceType: CartSourceType;
    pricingSource: CartPricingSource;
    eventOfferId?: string | null;
    supplierProductOfferId?: string | null;
  }>;
}

export interface CheckoutPreview {
  scope: CartScope;
  organizationId: string | null;
  suppliers: SupplierGroup[];
  draftOrders: DraftSupplierOrder[];
  /** 전체 표시용 소계(원). 신뢰 금액 아님 — checkout 확정 시 재계산. */
  displayGrandTotal: number;
  /** 가격/재고/배송비는 확정 단계에서 재검증된다는 명시 플래그 */
  pricingRevalidationRequired: true;
}

export class StoreCartService {
  private repo: Repository<StoreCartItem>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(StoreCartItem);
  }

  private assertScope(scope: CartScope): void {
    if (!scope.buyerId) throw new CartError('buyerId required', 'VALIDATION_ERROR');
    if (!scope.serviceKey) throw new CartError('serviceKey required', 'VALIDATION_ERROR');
  }

  /** buyer + service 범위의 전체 cart item (담은 순서) */
  async list(scope: CartScope): Promise<StoreCartItem[]> {
    this.assertScope(scope);
    return this.repo.find({
      where: { buyerId: scope.buyerId, serviceKey: scope.serviceKey },
      order: { createdAt: 'ASC' },
    });
  }

  async add(scope: CartScope, input: AddCartItemInput): Promise<StoreCartItem> {
    this.assertScope(scope);

    const productName = (input.productName || '').trim();
    if (!productName) throw new CartError('productName required', 'VALIDATION_ERROR');

    const sourceType = input.sourceType ?? 'regular';
    if (!VALID_SOURCE_TYPES.includes(sourceType)) {
      throw new CartError(`invalid sourceType: ${sourceType}`, 'VALIDATION_ERROR');
    }

    const pricingSource = input.pricingSource ?? 'regular';
    if (!VALID_PRICING_SOURCES.includes(pricingSource)) {
      throw new CartError(`invalid pricingSource: ${pricingSource}`, 'VALIDATION_ERROR');
    }

    const quantity = input.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new CartError('quantity must be a positive integer', 'VALIDATION_ERROR');
    }

    const priceSnapshot = input.priceSnapshot ?? 0;
    if (!Number.isInteger(priceSnapshot) || priceSnapshot < 0) {
      throw new CartError('priceSnapshot must be a non-negative integer', 'VALIDATION_ERROR');
    }

    const item = this.repo.create({
      buyerId: scope.buyerId,
      serviceKey: scope.serviceKey,
      organizationId: input.organizationId ?? null,
      sourceType,
      supplierId: input.supplierId ?? null,
      supplierProductOfferId: input.supplierProductOfferId ?? null,
      organizationProductListingId: input.organizationProductListingId ?? null,
      eventOfferId: input.eventOfferId ?? null,
      productMasterId: input.productMasterId ?? null,
      productName,
      quantity,
      pricingSource,
      priceSnapshot,
    });

    return this.repo.save(item);
  }

  /** 본인(buyer) + service 범위의 항목만 수정 가능 */
  async update(
    scope: CartScope,
    id: string,
    input: UpdateCartItemInput,
  ): Promise<StoreCartItem> {
    this.assertScope(scope);
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new CartError('quantity must be a positive integer', 'VALIDATION_ERROR');
    }

    const item = await this.repo.findOne({
      where: { id, buyerId: scope.buyerId, serviceKey: scope.serviceKey },
    });
    if (!item) throw new CartError('cart item not found', 'NOT_FOUND');

    item.quantity = input.quantity;
    return this.repo.save(item);
  }

  async remove(scope: CartScope, id: string): Promise<void> {
    this.assertScope(scope);
    const result = await this.repo.delete({
      id,
      buyerId: scope.buyerId,
      serviceKey: scope.serviceKey,
    });
    if (!result.affected) throw new CartError('cart item not found', 'NOT_FOUND');
  }

  async clear(scope: CartScope): Promise<number> {
    this.assertScope(scope);
    const result = await this.repo.delete({
      buyerId: scope.buyerId,
      serviceKey: scope.serviceKey,
    });
    return result.affected ?? 0;
  }

  /** 공급자별 grouping — 배송비/무료배송/주문 분할의 기준 단위 */
  async groupBySupplier(scope: CartScope): Promise<SupplierGroup[]> {
    const items = await this.list(scope);
    const buckets = new Map<string, StoreCartItem[]>();

    for (const item of items) {
      const key = item.supplierId ?? '__no_supplier__';
      const bucket = buckets.get(key);
      if (bucket) bucket.push(item);
      else buckets.set(key, [item]);
    }

    return Array.from(buckets.values()).map((groupItems) => {
      const totalQuantity = groupItems.reduce((sum, i) => sum + i.quantity, 0);
      const displaySubtotal = groupItems.reduce(
        (sum, i) => sum + i.priceSnapshot * i.quantity,
        0,
      );
      return {
        supplierId: groupItems[0].supplierId ?? null,
        items: groupItems,
        itemCount: groupItems.length,
        totalQuantity,
        displaySubtotal,
      };
    });
  }

  /**
   * checkout 준비용 미리보기. 주문/결제를 생성하지 않는다.
   *
   * 공급자별 묶음을 createOrder 호환 draft 형상으로 변환한다. 후속 Phase 의
   * orchestrator 가 이 draftOrders 를 입력으로 받아 공급자마다 checkoutService
   * .createOrder() 를 1 회씩 호출하며, 그 시점에 가격/재고/배송비를 재검증한다.
   */
  async buildCheckoutPreview(scope: CartScope): Promise<CheckoutPreview> {
    const suppliers = await this.groupBySupplier(scope);

    const organizationId =
      suppliers.flatMap((g) => g.items).find((i) => i.organizationId)?.organizationId ?? null;

    const draftOrders: DraftSupplierOrder[] = suppliers.map((group) => ({
      supplierId: group.supplierId,
      sellerOrganizationId: organizationId,
      items: group.items.map((i) => ({
        productId: i.supplierProductOfferId ?? i.productMasterId ?? i.id,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.priceSnapshot,
        subtotal: i.priceSnapshot * i.quantity,
        sourceType: i.sourceType,
        pricingSource: i.pricingSource,
        eventOfferId: i.eventOfferId ?? null,
        supplierProductOfferId: i.supplierProductOfferId ?? null,
      })),
    }));

    const displayGrandTotal = suppliers.reduce((sum, g) => sum + g.displaySubtotal, 0);

    return {
      scope,
      organizationId,
      suppliers,
      draftOrders,
      displayGrandTotal,
      pricingRevalidationRequired: true,
    };
  }
}

export class CartError extends Error {
  constructor(
    message: string,
    public code: 'VALIDATION_ERROR' | 'NOT_FOUND',
  ) {
    super(message);
    this.name = 'CartError';
  }
}
