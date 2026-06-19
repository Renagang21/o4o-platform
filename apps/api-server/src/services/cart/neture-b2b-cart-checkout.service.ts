/**
 * NetureB2BCartCheckoutService — Neture B2B Store Cart 주문화 (P2a, payment-first)
 *
 * WO-O4O-NETURE-B2B-CHECKOUT-ORCHESTRATOR-V1
 * 상위 기준: CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1
 *
 * canonical Store Cart 에 담긴 Neture B2B/regular 항목(sourceType ∈ {b2b, regular})을
 * 공급자별 checkout_orders 로 생성한다.
 *
 * 절대 기준 (payment-first):
 *   - 생성 주문은 paymentStatus='pending' (createOrder 기본값). 결제 완료 전 공급자 미노출.
 *   - collectionStatus 사용 안 함 (후불/인보이스/수금확인형 전제 폐기 — 위 CHECK 참조).
 *   - fulfillment bridge / 공급자 노출 / 결제 흐름은 본 WO 범위 밖(후속 P2b/P2c).
 *   - priceSnapshot 은 표시용. 주문 금액은 SupplierProductOffer 서버 가격으로 재계산.
 *
 * 원자성: 공급자(supplierId) 그룹 단위. 그룹 내 일부 item enrich 실패 시 그룹 전체 실패
 *   (공급자별 금액/배송비 일관성). 그룹 간 best-effort — 실패 그룹 item 은 cart 유지 + failedItems.
 *
 * P2a 한정: serviceKey='neture', orderType=STORE_RESTOCK 만. DIRECT_TO_CUSTOMER(PII/consent)는
 *   별도 후속(cart item 에 order_type 개념 없음 → 전부 STORE_RESTOCK 으로 취급).
 */
import { randomUUID } from 'crypto';
import { DataSource, Repository, In } from 'typeorm';
import { StoreCartItem } from '../../entities/cart/StoreCartItem.entity.js';
import { checkoutService } from '../checkout.service.js';
import {
  calculateSupplierShippingFee,
  type SupplierShippingPolicy,
} from '../shipping/supplier-shipping.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { CartCheckoutError } from './event-offer-cart-checkout.service.js';

const B2B_SOURCE_TYPES = new Set<string>(['b2b', 'regular']);

export interface B2BCheckoutScope {
  buyerId: string;
  serviceKey: string;
}

export interface B2BCheckoutInput {
  itemIds?: string[];
  note?: string;
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

/** SupplierProductOffer enrich 행 (서버 재검증·재계산용) */
interface OfferRow {
  id: string;
  price_general: number;
  // WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1: scope.serviceKey 기준 서비스별 공급가(없으면 null → price_general)
  service_unit_price: number | null;
  is_active: boolean;
  approval_status: string;
  distribution_type: string;
  allowed_seller_ids: string[] | null;
  track_inventory: boolean;
  stock_quantity: number;
  reserved_quantity: number;
  supplier_id: string;
  product_name: string;
  supplier_status: string;
  base_shipping_fee: number | null;
  free_shipping_threshold: number | null;
}

interface ValidItem {
  item: StoreCartItem;
  offer: OfferRow;
  unitPrice: number;
  subtotal: number;
}

export class NetureB2BCartCheckoutService {
  private cartRepo: Repository<StoreCartItem>;

  constructor(private dataSource: DataSource) {
    this.cartRepo = dataSource.getRepository(StoreCartItem);
  }

  async confirm(scope: B2BCheckoutScope, input: B2BCheckoutInput = {}): Promise<B2BCheckoutResult> {
    // P2a 범위: Neture B2B 전용
    if (scope.serviceKey !== SERVICE_KEYS.NETURE) {
      throw new CartCheckoutError(
        'UNSUPPORTED_CART_SERVICE',
        `B2B 주문 확정을 지원하지 않는 서비스입니다: ${scope.serviceKey}`,
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

    const failedItems: B2BFailedCartItem[] = [];

    // 2. 대상(b2b/regular + SPO/supplier 보유)만 분리
    const candidates: StoreCartItem[] = [];
    for (const it of items) {
      if (!B2B_SOURCE_TYPES.has(it.sourceType)) {
        failedItems.push({
          itemId: it.id,
          productName: it.productName,
          reason: `지원하지 않는 항목 유형입니다 (${it.sourceType}). B2B 주문은 b2b/regular 만 가능합니다.`,
          code: 'UNSUPPORTED_CART_ITEM_SOURCE',
        });
        continue;
      }
      if (!it.supplierProductOfferId) {
        failedItems.push({
          itemId: it.id,
          productName: it.productName,
          reason: 'supplierProductOfferId 가 없어 주문할 수 없습니다.',
          code: 'MISSING_OFFER',
        });
        continue;
      }
      if (!it.supplierId) {
        failedItems.push({
          itemId: it.id,
          productName: it.productName,
          reason: 'supplierId 가 없어 주문할 수 없습니다.',
          code: 'MISSING_SUPPLIER',
        });
        continue;
      }
      candidates.push(it);
    }

    // WO-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1: 다중 공급자 1회 결제 단위.
    // 이 confirm 으로 생성되는 모든 checkout_order 를 하나의 paymentGroupId 로 묶는다.
    const paymentGroupId = `pg_${randomUUID()}`;

    if (candidates.length === 0) {
      return {
        serviceKey: scope.serviceKey,
        paymentGroupId,
        groupTotalAmount: 0,
        orderCount: 0,
        createdOrders: [],
        failedItems,
        removedCartItemIds: [],
      };
    }

    // 3. SupplierProductOffer enrich (서버 가격/상태/공급자 정책 재조회)
    const offerIds = [...new Set(candidates.map((c) => c.supplierProductOfferId as string))];
    const offerRows: OfferRow[] = await this.dataSource.query(
      `SELECT spo.id::text AS id, spo.price_general, spo.is_active,
              spo.approval_status, spo.distribution_type, spo.allowed_seller_ids,
              spo.track_inventory, spo.stock_quantity, spo.reserved_quantity,
              spo.supplier_id::text AS supplier_id,
              pm.name AS product_name,
              ns.status AS supplier_status,
              ns.base_shipping_fee, ns.free_shipping_threshold,
              -- WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1: scope.serviceKey 기준 서비스별 공급가
              (SELECT osp.unit_price FROM offer_service_prices osp
                 WHERE osp.offer_id = spo.id AND osp.service_key = $2) AS service_unit_price
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE spo.id::text = ANY($1)`,
      [offerIds, scope.serviceKey],
    );
    const offerMap = new Map<string, OfferRow>(offerRows.map((o) => [o.id, o]));

    // 4. gate 검증 + 그룹 분류. 실패 item 은 그 supplierId 를 "오염"시킨다(그룹 전체 실패).
    const valids: ValidItem[] = [];
    const poisonedSuppliers = new Set<string>();
    for (const it of candidates) {
      const offer = offerMap.get(it.supplierProductOfferId as string);
      const fail = (code: string, reason: string) => {
        failedItems.push({ itemId: it.id, productName: it.productName, reason, code });
        // 그룹 일관성: 실패 item 이 속한 (cart 또는 offer) supplier 그룹 전체 무효화
        if (offer?.supplier_id) poisonedSuppliers.add(offer.supplier_id);
        if (it.supplierId) poisonedSuppliers.add(it.supplierId);
      };

      if (!offer) { fail('OFFER_NOT_FOUND', '공급자 상품을 찾을 수 없습니다.'); continue; }
      if (offer.supplier_id !== it.supplierId) { fail('SUPPLIER_MISMATCH', '공급자 정보가 일치하지 않습니다.'); continue; }
      if (!offer.is_active) { fail('PRODUCT_INACTIVE', `비활성 상품입니다: ${offer.product_name}`); continue; }
      if (offer.approval_status !== 'APPROVED') { fail('PRODUCT_NOT_APPROVED', `미승인 상품입니다: ${offer.product_name}`); continue; }
      if (offer.supplier_status !== 'ACTIVE') { fail('SUPPLIER_INACTIVE', `비활성 공급자입니다: ${offer.product_name}`); continue; }
      if (offer.distribution_type === 'PRIVATE') {
        if (!offer.allowed_seller_ids || !offer.allowed_seller_ids.includes(scope.buyerId)) {
          fail('DISTRIBUTION_DENIED', `유통 접근 권한이 없습니다: ${offer.product_name}`); continue;
        }
      }
      if (offer.distribution_type === 'SERVICE' && !it.organizationId) {
        fail('DISTRIBUTION_DENIED', `SERVICE 상품은 매장(조직) 컨텍스트가 필요합니다: ${offer.product_name}`); continue;
      }
      if (!Number.isInteger(it.quantity) || it.quantity <= 0 || it.quantity > 1000) {
        fail('INVALID_QUANTITY', `수량이 올바르지 않습니다: ${offer.product_name}`); continue;
      }
      // WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1:
      //   서비스별 공급가(scope.serviceKey) 우선, 없으면 price_general fallback. (event_price 는 listing 주문 경로 소관)
      const unitPrice = offer.service_unit_price != null ? Number(offer.service_unit_price) : Number(offer.price_general);
      if (!(unitPrice > 0)) { fail('INVALID_PRICE', `가격이 올바르지 않습니다: ${offer.product_name}`); continue; }
      if (offer.track_inventory) {
        const available = Number(offer.stock_quantity) - Number(offer.reserved_quantity);
        if (available < it.quantity) {
          fail('INSUFFICIENT_STOCK', `재고가 부족합니다: ${offer.product_name} (가용 ${available}, 요청 ${it.quantity})`); continue;
        }
      }
      valids.push({ item: it, offer, unitPrice, subtotal: unitPrice * it.quantity });
    }

    // 5. supplierId 그룹핑 (offer.supplier_id 기준 — 권위)
    const groups = new Map<string, ValidItem[]>();
    for (const v of valids) {
      const sid = v.offer.supplier_id;
      const bucket = groups.get(sid);
      if (bucket) bucket.push(v);
      else groups.set(sid, [v]);
    }

    const createdOrders: B2BCreatedOrderSummary[] = [];
    const removedCartItemIds: string[] = [];

    // 6. 그룹별 checkout_order 생성 (payment-first: paymentStatus='pending' 기본값)
    for (const [supplierId, group] of groups) {
      // 그룹 일관성: 같은 supplier 에 enrich 실패 item 이 있었으면 그룹 전체 보류
      if (poisonedSuppliers.has(supplierId)) {
        for (const v of group) {
          failedItems.push({
            itemId: v.item.id,
            productName: v.item.productName,
            reason: '동일 공급자 항목 중 일부가 검증 실패하여 그룹 전체 주문을 보류했습니다.',
            code: 'GROUP_PARTIAL_FAILURE',
          });
        }
        continue;
      }

      const organizationId =
        group.map((v) => v.item.organizationId).find((o): o is string => !!o) ?? null;
      const policy: SupplierShippingPolicy = {
        baseShippingFee: group[0].offer.base_shipping_fee != null ? Number(group[0].offer.base_shipping_fee) : null,
        freeShippingThreshold:
          group[0].offer.free_shipping_threshold != null ? Number(group[0].offer.free_shipping_threshold) : null,
      };

      const lineItems = group.map((v) => ({
        productId: v.offer.id,
        productName: v.offer.product_name,
        quantity: v.item.quantity,
        unitPrice: v.unitPrice,
        subtotal: v.subtotal,
        metadata: {
          sourceType: v.item.sourceType,
          supplierProductOfferId: v.offer.id,
          cartItemId: v.item.id,
          pricingSource: 'regular',
          confirmedUnitPrice: v.unitPrice,
        },
      }));

      const groupSubtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
      const shippingFeeSnapshot = calculateSupplierShippingFee(groupSubtotal, policy).shippingFee;
      const cartIds = group.map((v) => v.item.id);

      try {
        const savedOrder = await checkoutService.createOrder({
          buyerId: scope.buyerId,
          sellerId: organizationId ?? scope.buyerId,
          supplierId,
          sellerOrganizationId: organizationId ?? undefined,
          items: lineItems,
          shippingPolicy: policy,
          shippingFeeSnapshot,
          metadata: {
            // payment-first: 결제 완료(paymentStatus='paid') 전 공급자 미노출.
            // collectionStatus 미사용(후불/인보이스 전제 폐기).
            source: 'neture_b2b_checkout',
            serviceKey: SERVICE_KEYS.NETURE,
            sourceTypes: [...new Set(group.map((v) => v.item.sourceType))],
            orderType: 'STORE_RESTOCK',
            cartItemIds: cartIds,
            supplierProductOfferIds: group.map((v) => v.offer.id),
            pricingRevalidationRequired: true,
            fulfillmentVisibility: 'hidden_until_paid',
            // 다중 공급자 1회 결제 group (WO-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1)
            paymentGroupId,
            paymentGroupSource: 'multi_supplier_cart',
            ...(input.note ? { note: input.note } : {}),
          },
        });

        // 성공 그룹 cart item 제거 (buyer+service 범위 한정)
        await this.cartRepo.delete({
          id: In(cartIds),
          buyerId: scope.buyerId,
          serviceKey: scope.serviceKey,
        });
        removedCartItemIds.push(...cartIds);

        createdOrders.push({
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          supplierId,
          sellerOrganizationId: organizationId,
          subtotal: savedOrder.subtotal,
          shippingFee: savedOrder.shippingFee,
          totalAmount: savedOrder.totalAmount,
          itemCount: lineItems.length,
          cartItemIds: cartIds,
          paymentStatus: savedOrder.paymentStatus,
          paymentGroupId,
        });
      } catch (orderErr: any) {
        for (const v of group) {
          failedItems.push({
            itemId: v.item.id,
            productName: v.item.productName,
            reason: orderErr?.message || '주문 생성에 실패했습니다.',
            code: 'ORDER_CREATE_FAILED',
          });
        }
      }
    }

    const groupTotalAmount = createdOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      serviceKey: scope.serviceKey,
      paymentGroupId,
      groupTotalAmount,
      orderCount: createdOrders.length,
      createdOrders,
      failedItems,
      removedCartItemIds,
    };
  }
}
