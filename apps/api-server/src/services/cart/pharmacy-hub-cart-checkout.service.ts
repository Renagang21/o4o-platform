/**
 * PharmacyHubCartCheckoutService — Pharmacy-Hub 약국 장바구니 → 공급자별 주문 생성
 *
 * WO-PHARMACY-HUB-B2B-CART-AND-BUYER-ORDER-V1 (Phase 1)
 *
 * canonical Store Cart(`store_cart_items`, serviceKey='pharmacy-hub')에 담긴 항목을
 * **공급자별 `checkout_orders`** 로 생성한다. 주문 생성은 E-commerce Core 단일 진입점인
 * `checkoutService.createOrder()` 만 사용한다 (CLAUDE.md §4).
 *
 * ── 왜 NetureB2BCartCheckoutService 를 재사용하지 않는가 ──────────────────────
 * 구조(공급자별 분리 · 서버 가격 재계산)는 같지만 **게이트 의미가 다르다**:
 *   Neture  : 상품별 승인(approval_status=APPROVED) 요구 · 조직(organizationId) 범위 요구 ·
 *             payment-first · orderType=STORE_RESTOCK · serviceKey 하드 가드('neture')
 *   Pharmacy-Hub: 상품별 운영자 승인 없음(approval_status 는 승인대상 3키 파생값이라 PENDING 이 정상) ·
 *             조직 격리 서비스가 아님 · 제공 축은 `service_keys @> {pharmacy-hub}`
 * 공용 파라미터화는 양쪽 계약을 흐리므로 계약을 분리한다(로직 일부 중복 허용).
 *
 * ── 노출 게이트 (약국 상품 조회와 동일 SSOT) ──────────────────────────────────
 *   'pharmacy-hub' = ANY(spo.service_keys)   ← 공급자 opt-in (제공 축)
 *   spo.is_active = true · spo.deleted_at IS NULL
 *   spo.distribution_type <> 'PRIVATE'       ← PRIVATE 은 매장범위 모델, Pharmacy-Hub 에 축 없음
 *   neture_suppliers.status = 'ACTIVE'
 *   product_masters 유효(status ACTIVE)
 * `PharmacyHubStoreProductController` 의 EXPOSURE_GATE_SQL 과 같은 조건이다 —
 * **조회에 보이면 담을 수 있고, 담을 수 있으면 주문 시점에 같은 기준으로 재검증**된다.
 *
 * ── Phase 1 범위 밖 (하지 않는 것) ────────────────────────────────────────────
 *   공급자에게 주문 노출 · 공급자 상태 변경 · shipment · fulfillment bridge ·
 *   온라인 결제 · 정산 · 쿠폰 · 반품.
 *   `paymentStatus` 를 임의로 바꾸지 않는다 — `createOrder` 기본값(pending)을 그대로 둔다.
 */
import { DataSource, Repository, In } from 'typeorm';
import { StoreCartItem } from '../../entities/cart/StoreCartItem.entity.js';
import { checkoutService } from '../checkout.service.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

/** 주문 대상 cart source type — Pharmacy-Hub 는 공급자 offer 직접 구매만 다룬다. */
const ORDERABLE_SOURCE_TYPES = new Set<string>(['b2b', 'regular']);

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

interface OfferRow {
  id: string;
  supplier_id: string;
  price_general: number;
  service_unit_price: number | null;
  is_active: boolean;
  distribution_type: string;
  track_inventory: boolean;
  stock_quantity: number;
  reserved_quantity: number;
  supplier_status: string;
  master_status: string | null;
  product_name: string;
  master_id: string;
}

interface ValidItem {
  item: StoreCartItem;
  offer: OfferRow;
  unitPrice: number;
  subtotal: number;
}

export interface FailedItem {
  itemId: string;
  productName: string;
  code: string;
  reason: string;
}

export class PharmacyHubCartCheckoutService {
  private repo: Repository<StoreCartItem>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(StoreCartItem);
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
    orders: Array<{ orderId: string; orderNumber: string; supplierId: string; totalAmount: number; itemCount: number }>;
    failedItems: FailedItem[];
  }> {
    if (!scope.buyerId) {
      throw new PharmacyHubCheckoutError('INVALID_SCOPE', '구매자 정보를 확인할 수 없습니다.', 401);
    }

    // 1. 대상 cart item 조회 (buyerId + serviceKey 경계)
    const all = await this.repo.find({
      where: { buyerId: scope.buyerId, serviceKey: SERVICE_KEY },
      order: { createdAt: 'ASC' },
    });

    const selected = input.itemIds?.length
      ? all.filter((it) => input.itemIds!.includes(it.id))
      : all;

    if (selected.length === 0) {
      throw new PharmacyHubCheckoutError('EMPTY_CART', '주문할 상품이 없습니다.', 400);
    }

    const failedItems: FailedItem[] = [];
    const candidates: StoreCartItem[] = [];

    for (const it of selected) {
      if (!ORDERABLE_SOURCE_TYPES.has(it.sourceType)) {
        failedItems.push({ itemId: it.id, productName: it.productName, code: 'UNSUPPORTED_SOURCE_TYPE', reason: '주문할 수 없는 항목입니다.' });
        continue;
      }
      if (!it.supplierProductOfferId) {
        failedItems.push({ itemId: it.id, productName: it.productName, code: 'MISSING_OFFER', reason: '공급자 상품 정보가 없어 주문할 수 없습니다.' });
        continue;
      }
      candidates.push(it);
    }
    if (candidates.length === 0) {
      return { orders: [], failedItems };
    }

    // 2. 서버에서 현재 공급 상태·가격 재조회 (프론트가 보낸 단가는 신뢰하지 않는다)
    const offerIds = [...new Set(candidates.map((c) => c.supplierProductOfferId as string))];
    const offerRows: OfferRow[] = await this.dataSource.query(
      `SELECT spo.id::text                AS id,
              spo.supplier_id::text       AS supplier_id,
              spo.price_general,
              spo.is_active,
              spo.distribution_type,
              spo.track_inventory,
              spo.stock_quantity,
              spo.reserved_quantity,
              spo.master_id::text         AS master_id,
              ns.status                   AS supplier_status,
              COALESCE(pm.status, 'ACTIVE') AS master_status,
              pm.name                     AS product_name,
              (SELECT osp.unit_price FROM offer_service_prices osp
                WHERE osp.offer_id = spo.id AND osp.service_key = $2) AS service_unit_price
         FROM supplier_product_offers spo
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         JOIN product_masters pm  ON pm.id = spo.master_id
        WHERE spo.id::text = ANY($1)
          AND spo.deleted_at IS NULL
          AND $2 = ANY(spo.service_keys)`,
      [offerIds, SERVICE_KEY],
    );
    const offerMap = new Map(offerRows.map((o) => [o.id, o]));

    // 3. 게이트 검증 + 공급자 그룹 분류
    const valids: ValidItem[] = [];
    const poisonedSuppliers = new Set<string>();

    for (const it of candidates) {
      const offer = offerMap.get(it.supplierProductOfferId as string);
      const fail = (code: string, reason: string) => {
        failedItems.push({ itemId: it.id, productName: it.productName, code, reason });
        if (offer?.supplier_id) poisonedSuppliers.add(offer.supplier_id);
        if (it.supplierId) poisonedSuppliers.add(it.supplierId);
      };

      // 제공 축: 쿼리에서 service_keys 를 이미 걸렀으므로 미조회 = 미제공 또는 삭제됨
      if (!offer) { fail('NOT_DELIVERED', '현재 파머시 허브에 제공되지 않는 상품입니다.'); continue; }
      if (!offer.is_active) { fail('PRODUCT_INACTIVE', `비활성 상품입니다: ${offer.product_name}`); continue; }
      if (offer.distribution_type === 'PRIVATE') { fail('DISTRIBUTION_DENIED', `구매할 수 없는 상품입니다: ${offer.product_name}`); continue; }
      if (offer.supplier_status !== 'ACTIVE') { fail('SUPPLIER_INACTIVE', `비활성 공급자입니다: ${offer.product_name}`); continue; }
      if (offer.master_status !== 'ACTIVE') { fail('MASTER_INACTIVE', `이용할 수 없는 상품입니다: ${offer.product_name}`); continue; }
      if (!Number.isInteger(it.quantity) || it.quantity <= 0 || it.quantity > 1000) {
        fail('INVALID_QUANTITY', `수량이 올바르지 않습니다: ${offer.product_name}`); continue;
      }

      // 적용 단가: 서비스별 공급가 우선, 없으면 기본 공급가 (조회 화면과 동일 규칙)
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

    // 4. 공급자별 그룹핑 — 서로 다른 공급자 상품은 절대 한 주문으로 합치지 않는다.
    //    그룹 권위는 offer.supplier_id (cart 의 supplierId 가 아니라 서버 값)
    const groups = new Map<string, ValidItem[]>();
    for (const v of valids) {
      if (poisonedSuppliers.has(v.offer.supplier_id)) continue;
      const bucket = groups.get(v.offer.supplier_id);
      if (bucket) bucket.push(v);
      else groups.set(v.offer.supplier_id, [v]);
    }

    // 오염된 그룹의 유효 항목도 주문하지 않고 사유를 남긴다(그룹 금액 일관성)
    for (const v of valids) {
      if (!poisonedSuppliers.has(v.offer.supplier_id)) continue;
      failedItems.push({
        itemId: v.item.id,
        productName: v.item.productName,
        code: 'SUPPLIER_GROUP_FAILED',
        reason: '같은 공급자의 다른 상품에 문제가 있어 주문하지 않았습니다.',
      });
    }

    // 5. 공급자별 주문 생성
    const orders: Array<{ orderId: string; orderNumber: string; supplierId: string; totalAmount: number; itemCount: number }> = [];

    for (const [supplierId, group] of groups.entries()) {
      const lineItems = group.map((v) => ({
        productId: v.offer.master_id,
        productName: v.offer.product_name,
        quantity: v.item.quantity,
        unitPrice: v.unitPrice,
        subtotal: v.subtotal,
        // 주문 시점 snapshot — 이후 상품/가격이 바뀌어도 주문 내역은 보존된다
        metadata: {
          supplierProductOfferId: v.offer.id,
          masterId: v.offer.master_id,
          supplierId,
          serviceKey: SERVICE_KEY,
          unitPriceSource: v.offer.service_unit_price != null ? 'offer_service_price' : 'price_general',
        },
      }));

      const cartIds = group.map((v) => v.item.id);

      try {
        const savedOrder = await checkoutService.createOrder({
          buyerId: scope.buyerId,
          sellerId: supplierId,
          supplierId,
          items: lineItems,
          // 배송비는 Phase 1 범위 밖 — 0 으로 고정하고 재결정하지 않는다.
          shippingFeeSnapshot: 0,
          metadata: {
            // 서비스 경계 축 — 기존 3개 서비스와 동일 규약 (OrderType=RETAIL + metadata.serviceKey)
            serviceKey: SERVICE_KEY,
            source: 'pharmacy_hub_cart',
            note: input.note,
            supplierId,
            // 공급자 노출·fulfillment 는 Phase 2. 결제/수금 상태를 여기서 조작하지 않는다.
            phase: 'buyer-order-only',
          },
        });

        await this.repo.delete({ id: In(cartIds) });

        orders.push({
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          supplierId,
          totalAmount: Number(savedOrder.totalAmount),
          itemCount: lineItems.length,
        });
      } catch (error) {
        logger.error('[PharmacyHubCartCheckout] order creation failed', {
          supplierId,
          buyerId: scope.buyerId,
          error: error instanceof Error ? error.message : String(error),
        });
        for (const v of group) {
          failedItems.push({
            itemId: v.item.id,
            productName: v.item.productName,
            code: 'ORDER_CREATE_FAILED',
            reason: '주문 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          });
        }
      }
    }

    return { orders, failedItems };
  }
}
