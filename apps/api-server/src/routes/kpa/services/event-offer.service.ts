/**
 * KPA Event Offer Service
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts
 * WO-EVENT-OFFER-FIX-V1: checkout_orders 테이블 사용, ecommerce_orders 제거
 * WO-O4O-EVENT-OFFER-CORE-REFORM-V1:
 *   - resolveEventStatus() 추가
 *   - 매장 경영자 조회: is_active → status + 날짜 + 수량 복합 조건
 *   - participate: total_quantity 검증 추가
 * WO-O4O-EVENT-OFFER-BACKEND-NAMING-ALIGNMENT-V1: GroupbuyService → EventOfferService
 *
 * Responsibilities:
 * - Event offer listing queries (public, with optional auth)
 * - Operator stats aggregation
 * - User participation (order creation via checkoutService)
 */

import type { DataSource, Repository } from 'typeorm';
import { OrganizationProductListing } from '../../../modules/store-core/entities/organization-product-listing.entity.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { CheckoutOrder } from '../../../entities/checkout/CheckoutOrder.entity.js';
import { checkoutService } from '../../../services/checkout.service.js';

// ─── 상태 계산 ───────────────────────────────────────────────────────────────

export type EventStatusKey = 'pending' | 'approved' | 'active' | 'ended' | 'canceled';

/**
 * DB 저장 status + start_at/end_at 기반 런타임 상태 계산.
 * DB 저장값: pending | approved | canceled
 * 런타임 계산값: approved(곧 시작) | active(진행중) | ended(종료)
 */
export function resolveEventStatus(opl: {
  status: string;
  start_at: Date | string | null;
  end_at: Date | string | null;
}): EventStatusKey {
  if (opl.status === 'canceled') return 'canceled';
  if (opl.status === 'pending') return 'pending';

  // start_at / end_at 없으면 DB 값 그대로 반환 (approved = 항상 진행)
  if (!opl.start_at || !opl.end_at) return 'active';

  const now = new Date();
  const startAt = opl.start_at instanceof Date ? opl.start_at : new Date(opl.start_at);
  const endAt = opl.end_at instanceof Date ? opl.end_at : new Date(opl.end_at);

  if (now < startAt) return 'approved';         // 곧 시작
  if (now >= startAt && now <= endAt) return 'active'; // 진행중
  return 'ended';                               // 종료
}

// ─── Active 조건 SQL 절 ───────────────────────────────────────────────────────

/**
 * 매장 경영자에게 노출할 이벤트 필터 조건 (테이블 alias: opl)
 * status='approved' + 날짜 조건 + 수량 조건
 */
const ACTIVE_OFFER_CLAUSE = `
  opl.status = 'approved'
  AND (opl.start_at IS NULL OR NOW() >= opl.start_at)
  AND (opl.end_at   IS NULL OR NOW() <= opl.end_at)
  AND (opl.total_quantity IS NULL OR opl.total_quantity > 0)
`.trim();

// ─── Service ─────────────────────────────────────────────────────────────────

export class EventOfferService {
  private listingRepo: Repository<OrganizationProductListing>;

  constructor(private dataSource: DataSource) {
    this.listingRepo = dataSource.getRepository(OrganizationProductListing);
  }

  /**
   * GET / — Public event offer listing (paginated)
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1: status + 날짜 + 수량 조건으로 변경
   * WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1: serviceKey 파라미터 추가 (기본값: KPA_GROUPBUY)
   */
  async listGroupbuys(
    page: number,
    limit: number,
    serviceKey: string = SERVICE_KEYS.KPA_GROUPBUY,
  ): Promise<{ data: OrganizationProductListing[]; total: number }> {
    const safePage = page || 1;
    const safeLimit = Math.min(limit || 12, 50);
    const offset = (safePage - 1) * safeLimit;

    const [countResult, data] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM organization_product_listings opl
         WHERE opl.service_key = $1
           AND ${ACTIVE_OFFER_CLAUSE}`,
        [serviceKey],
      ),
      this.dataSource.query(
        `SELECT opl.*
         FROM organization_product_listings opl
         WHERE opl.service_key = $1
           AND ${ACTIVE_OFFER_CLAUSE}
         ORDER BY opl.created_at ASC
         LIMIT $2 OFFSET $3`,
        [serviceKey, safeLimit, offset],
      ),
    ]);

    return { data, total: countResult[0]?.total ?? 0 };
  }

  /**
   * GET /enriched — Public enriched listing with product/supplier info
   * WO-EVENT-OFFER-HUB-TABLE-AND-DIRECT-ORDER-REFINE-V1
   * WO-EVENT-OFFER-HUB-TIME-WINDOW-FILTER-HOTFIX-V1: status 필터 + updatedAt 추가
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1: is_active → status + 날짜 + 수량 복합 조건
   */
  async listGroupbuysEnriched(
    page: number,
    limit: number,
    status?: 'active' | 'ended' | 'all',
    serviceKey: string = SERVICE_KEYS.KPA_GROUPBUY,
  ): Promise<{
    data: Array<{
      id: string;
      offerId: string;
      price: number | null;
      isActive: boolean;
      status: EventStatusKey;
      startAt: string | null;
      endAt: string | null;
      createdAt: string;
      updatedAt: string;
      supplierId: string;
      unitPrice: number | null;
      productName: string;
      supplierName: string;
      // WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2: 수량 정보
      totalQuantity: number | null;
      perOrderLimit: number | null;
      perStoreLimit: number | null;
    }>;
    total: number;
  }> {
    const safePage = page || 1;
    const safeLimit = Math.min(limit || 20, 50);
    const offset = (safePage - 1) * safeLimit;
    const effectiveStatus = status || 'active';

    // 상태별 WHERE 조건
    let filterClause: string;
    if (effectiveStatus === 'active') {
      filterClause = ACTIVE_OFFER_CLAUSE;
    } else if (effectiveStatus === 'ended') {
      // 취소되었거나 날짜 만료된 항목
      filterClause = `(
        opl.status = 'canceled'
        OR (opl.status = 'approved' AND opl.end_at IS NOT NULL AND NOW() > opl.end_at)
      )`;
    } else {
      // 'all' — 필터 없음
      filterClause = '1=1';
    }

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM organization_product_listings opl
       WHERE opl.service_key = $1 AND ${filterClause}`,
      [serviceKey],
    );
    const total = countResult[0]?.total ?? 0;

    const rows = await this.dataSource.query(
      `SELECT
         opl.id,
         opl.offer_id        AS "offerId",
         opl.price::numeric,
         opl.is_active       AS "isActive",
         opl.status          AS "dbStatus",
         opl.start_at        AS "startAt",
         opl.end_at          AS "endAt",
         opl.created_at      AS "createdAt",
         opl.updated_at      AS "updatedAt",
         opl.total_quantity  AS "totalQuantity",
         opl.per_order_limit AS "perOrderLimit",
         opl.per_store_limit AS "perStoreLimit",
         spo.supplier_id     AS "supplierId",
         COALESCE(spo.price_general, opl.price)::numeric AS "unitPrice",
         COALESCE(pm.name, '(상품명 없음)')  AS "productName",
         COALESCE(org.name, '(공급사 없음)') AS "supplierName"
       FROM organization_product_listings opl
       LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
       LEFT JOIN neture_suppliers ns          ON ns.id  = spo.supplier_id
       LEFT JOIN organizations org            ON org.id = ns.organization_id
       LEFT JOIN product_masters pm           ON pm.id  = opl.master_id
       WHERE opl.service_key = $1 AND ${filterClause}
       ORDER BY org.name ASC, opl.created_at ASC
       LIMIT $2 OFFSET $3`,
      [serviceKey, safeLimit, offset],
    );

    return {
      data: rows.map((r: any) => ({
        id: r.id,
        offerId: r.offerId,
        price: r.price !== null ? Number(r.price) : null,
        isActive: r.isActive,
        status: resolveEventStatus({ status: r.dbStatus, start_at: r.startAt, end_at: r.endAt }),
        startAt: r.startAt ? new Date(r.startAt).toISOString() : null,
        endAt: r.endAt ? new Date(r.endAt).toISOString() : null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || ''),
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt || ''),
        supplierId: r.supplierId,
        unitPrice: r.unitPrice !== null ? Number(r.unitPrice) : null,
        productName: r.productName,
        supplierName: r.supplierName,
        // WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2: 수량 정보
        totalQuantity: r.totalQuantity !== null ? Number(r.totalQuantity) : null,
        perOrderLimit: r.perOrderLimit !== null ? Number(r.perOrderLimit) : null,
        perStoreLimit: r.perStoreLimit !== null ? Number(r.perStoreLimit) : null,
      })),
      total,
    };
  }

  /**
   * GET /stats — Operator stats (orders, quantity, revenue, stores, listings)
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1: registeredProducts → status='approved' 기준
   */
  async getGroupbuyStats(
    serviceKey: string = SERVICE_KEYS.KPA_GROUPBUY,
  ): Promise<{
    totalOrders: number;
    totalQuantity: number;
    totalRevenue: number;
    participatingStores: number;
    registeredProducts: number;
  }> {
    const [orderStats, storeStats, listingCount] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COUNT(*)::int AS "totalOrders",
          COALESCE(SUM("totalAmount"), 0)::numeric AS "totalRevenue",
          COALESCE(SUM(
            (SELECT COALESCE(SUM((elem->>'quantity')::int), 0)
             FROM jsonb_array_elements(items) AS elem)
          ), 0)::int AS "totalQuantity"
        FROM checkout_orders
        WHERE metadata->>'serviceKey' = $1
          AND status = 'paid'
      `, [serviceKey]),
      this.dataSource.query(`
        SELECT COUNT(DISTINCT "buyerId")::int AS "participatingStores"
        FROM checkout_orders
        WHERE metadata->>'serviceKey' = $1
          AND status = 'paid'
      `, [serviceKey]),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt
         FROM organization_product_listings opl
         WHERE opl.service_key = $1 AND ${ACTIVE_OFFER_CLAUSE}`,
        [serviceKey],
      ),
    ]);

    return {
      totalOrders: orderStats[0]?.totalOrders ?? 0,
      totalQuantity: orderStats[0]?.totalQuantity ?? 0,
      totalRevenue: parseFloat(orderStats[0]?.totalRevenue ?? '0'),
      participatingStores: storeStats[0]?.participatingStores ?? 0,
      registeredProducts: listingCount[0]?.cnt ?? 0,
    };
  }

  /**
   * GET /:id availability — 인증 사용자 기준 가용 수량 계산
   *
   * WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2
   *
   * participate()의 서버 검증(V1)을 조회 응답에 연결하는 메서드.
   * participate() 트랜잭션 로직은 변경하지 않는다.
   *
   * maxOrderable 계산:
   *   candidates = [perOrderLimit, availableForStore, totalQuantity] (null 제외)
   *   maxOrderable = candidates.length > 0 ? Math.min(...candidates) : 999
   */
  async getListingAvailability(
    listingId: string,
    userId: string,
    serviceKey: string,
  ): Promise<{
    totalQuantity: number | null;
    perOrderLimit: number | null;
    perStoreLimit: number | null;
    alreadyOrdered: number;
    availableForStore: number | null;
    maxOrderable: number;
    isSoldOut: boolean;
  }> {
    // 1. listing 수량 정보 조회 (serviceKey 격리)
    const [row] = await this.dataSource.query(
      `SELECT total_quantity, per_order_limit, per_store_limit
       FROM organization_product_listings
       WHERE id = $1 AND service_key = $2
       LIMIT 1`,
      [listingId, serviceKey],
    );

    if (!row) {
      return {
        totalQuantity: null, perOrderLimit: null, perStoreLimit: null,
        alreadyOrdered: 0, availableForStore: null, maxOrderable: 999, isSoldOut: false,
      };
    }

    const totalQuantity = row.total_quantity !== null ? Number(row.total_quantity) : null;
    const perOrderLimit = row.per_order_limit !== null ? Number(row.per_order_limit) : null;
    const perStoreLimit = row.per_store_limit !== null ? Number(row.per_store_limit) : null;

    // 2. 매장 누적 주문량 조회
    let alreadyOrdered = 0;
    if (perStoreLimit !== null) {
      const [storeRow] = await this.dataSource.query(
        `SELECT COALESCE(
           SUM((elem->>'quantity')::int), 0
         )::int AS total_ordered
         FROM checkout_orders co
         CROSS JOIN jsonb_array_elements(co.items) AS elem
         WHERE co."buyerId" = $1
           AND co.metadata->>'productListingId' = $2
           AND co.status NOT IN ('canceled', 'failed')`,
        [userId, listingId],
      );
      alreadyOrdered = Number(storeRow?.total_ordered ?? 0);
    }

    // 3. 매장별 잔여 한도
    const availableForStore = perStoreLimit !== null
      ? Math.max(0, perStoreLimit - alreadyOrdered)
      : null;

    // 4. maxOrderable: null이 아닌 후보값 중 최솟값
    const candidates: number[] = [];
    if (perOrderLimit !== null) candidates.push(perOrderLimit);
    if (availableForStore !== null) candidates.push(availableForStore);
    if (totalQuantity !== null) candidates.push(totalQuantity);
    const maxOrderable = candidates.length > 0 ? Math.min(...candidates) : 999;

    // 5. 품절 판단
    const isSoldOut = (totalQuantity !== null && totalQuantity <= 0)
      || (availableForStore !== null && availableForStore <= 0);

    return {
      totalQuantity,
      perOrderLimit,
      perStoreLimit,
      alreadyOrdered,
      availableForStore,
      maxOrderable,
      isSoldOut,
    };
  }

  /**
   * GET /my-participations — Authenticated user's event offer orders
   * WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1: serviceKey 파라미터 추가
   */
  async getMyParticipations(
    userId: string,
    serviceKey: string = SERVICE_KEYS.KPA_GROUPBUY,
  ): Promise<{ data: any[]; total: number }> {
    const orderRepo = this.dataSource.getRepository(CheckoutOrder);
    const [orders, total] = await orderRepo
      .createQueryBuilder('o')
      .where('o.buyerId = :buyerId', { buyerId: userId })
      .andWhere("o.metadata->>'serviceKey' = :sk", { sk: serviceKey })
      .orderBy('o.createdAt', 'DESC')
      .take(20)
      .getManyAndCount();

    const data = orders.map(o => ({
      id: o.id,
      groupbuyId: (o.metadata as any)?.productListingId || '',
      groupbuy: { title: (o.metadata as any)?.productName || o.orderNumber },
      quantity: (o.items as any[])?.[0]?.quantity || 1,
      totalPrice: o.totalAmount,
      participatedAt: o.createdAt,
      status: o.status,
    }));

    return { data, total };
  }

  /**
   * GET /:id — Event offer detail (public)
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1: status + 날짜 조건으로 변경
   * WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1: serviceKey 파라미터 추가
   */
  async getGroupbuyDetail(
    id: string,
    serviceKey: string = SERVICE_KEYS.KPA_GROUPBUY,
  ): Promise<Record<string, any> | null> {
    const rows = await this.dataSource.query(
      `SELECT opl.*
       FROM organization_product_listings opl
       WHERE opl.id = $1
         AND opl.service_key = $2
         AND ${ACTIVE_OFFER_CLAUSE}
       LIMIT 1`,
      [id, serviceKey],
    );
    return rows[0] ?? null;
  }

  /**
   * POST /:id/participate — Create event offer order via checkoutService
   *
   * WO-EVENT-OFFER-FIX-V1: checkout_orders 사용, metadata.serviceKey 전파
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1: total_quantity 검증
   * WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V1:
   *   - per_order_limit: 1회 주문 수량 상한
   *   - per_store_limit: 매장별 누적 구매 상한
   *   - total_quantity: 원자적 차감 (SELECT FOR UPDATE → UPDATE)
   *   - 주문 실패 시 차감량 보상 (compensation increment)
   */
  async participate(
    listingId: string,
    userId: string,
    data: { quantity?: number },
    serviceKey: string = SERVICE_KEYS.KPA_GROUPBUY,
  ): Promise<{ orderId: string; orderNumber: string; status: string; totalAmount: number }> {
    const quantity = Math.max(1, parseInt(String(data?.quantity)) || 1);

    // ── Step 1: Supplier product 정보 사전 조회 (lock 전) ──────────────────
    // listing은 lock 이후 재조회하므로 여기서는 supplier 정보만 가져옴
    // (supplier 정보는 별도 row라 lock 범위 밖에서 조회해도 안전)
    // → listing 먼저 찾아서 offer_id 확보
    const preLockRows = await this.dataSource.query(
      `SELECT opl.id, opl.offer_id, opl.organization_id, opl.service_key,
              opl.status, opl.start_at, opl.end_at
       FROM organization_product_listings opl
       WHERE opl.id = $1
         AND opl.service_key = $2
         AND opl.status = 'approved'
         AND (opl.start_at IS NULL OR NOW() >= opl.start_at)
         AND (opl.end_at   IS NULL OR NOW() <= opl.end_at)
       LIMIT 1`,
      [listingId, serviceKey],
    );
    if (!preLockRows.length) {
      throw new EventOfferError(404, '이벤트를 찾을 수 없거나 진행 중이 아닙니다.');
    }
    const preListing = preLockRows[0];

    // ── Step 2: Supplier product 검증 ────────────────────────────────────
    const productRows = await this.dataSource.query(
      `SELECT spo.id AS spo_id, spo.supplier_id, spo.price_general, spo.is_active,
              spo.approval_status, s.status AS supplier_status, pm.name
       FROM supplier_product_offers spo
       JOIN neture_suppliers s  ON s.id  = spo.supplier_id
       JOIN product_masters pm  ON pm.id = spo.master_id
       WHERE spo.id = $1`,
      [preListing.offer_id],
    );
    if (!productRows.length) throw new EventOfferError(404, 'Supplier product not found');
    const product = productRows[0];
    if (!product.is_active) throw new EventOfferError(400, 'Product is not active', 'PRODUCT_INACTIVE');
    if (product.approval_status !== 'APPROVED') throw new EventOfferError(400, 'Product is not approved', 'PRODUCT_NOT_APPROVED');
    if (product.supplier_status !== 'ACTIVE') throw new EventOfferError(400, 'Supplier is not active', 'SUPPLIER_INACTIVE');

    const unitPrice = Number(product.price_general ?? 0);
    if (unitPrice <= 0) throw new EventOfferError(400, 'Invalid product price', 'INVALID_PRICE');

    // ── Step 3: 수량 제한 검증 + total_quantity 원자적 차감 ──────────────
    // SELECT FOR UPDATE → 동시 주문 시 race condition 방지
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    let decremented = false;

    try {
      // Row 잠금 + 최신 수량 정보 획득
      const [listing] = await qr.query(
        `SELECT id, offer_id, organization_id, service_key, status,
                start_at, end_at, total_quantity, per_store_limit, per_order_limit
         FROM organization_product_listings
         WHERE id = $1 AND service_key = $2
           AND status = 'approved'
           AND (start_at IS NULL OR NOW() >= start_at)
           AND (end_at   IS NULL OR NOW() <= end_at)
         FOR UPDATE`,
        [listingId, serviceKey],
      );
      if (!listing) {
        await qr.rollbackTransaction();
        throw new EventOfferError(404, '이벤트를 찾을 수 없거나 진행 중이 아닙니다.');
      }

      // (A) per_order_limit: 1회 주문 수량 상한
      if (listing.per_order_limit !== null && quantity > Number(listing.per_order_limit)) {
        await qr.rollbackTransaction();
        throw new EventOfferError(
          400,
          `1회 최대 ${listing.per_order_limit}개까지 주문 가능합니다.`,
          'PER_ORDER_LIMIT_EXCEEDED',
        );
      }

      // (B) total_quantity: 잔여 수량 검증
      if (listing.total_quantity !== null) {
        const remaining = Number(listing.total_quantity);
        if (remaining <= 0) {
          await qr.rollbackTransaction();
          throw new EventOfferError(400, '판매 종료된 이벤트입니다.', 'SOLD_OUT');
        }
        if (remaining < quantity) {
          await qr.rollbackTransaction();
          throw new EventOfferError(
            400,
            `잔여 수량이 ${remaining}개입니다. 수량을 줄여 다시 시도해 주세요.`,
            'INSUFFICIENT_QUANTITY',
          );
        }
      }

      // (C) per_store_limit: 매장별 누적 구매 상한
      if (listing.per_store_limit !== null) {
        const [storeRow] = await qr.query(
          `SELECT COALESCE(
             SUM((elem->>'quantity')::int), 0
           )::int AS total_ordered
           FROM checkout_orders co
           CROSS JOIN jsonb_array_elements(co.items) AS elem
           WHERE co."buyerId" = $1
             AND co.metadata->>'productListingId' = $2
             AND co.status NOT IN ('canceled', 'failed')`,
          [userId, listingId],
        );
        const alreadyOrdered = Number(storeRow?.total_ordered ?? 0);
        const perStoreLimit = Number(listing.per_store_limit);
        if (alreadyOrdered + quantity > perStoreLimit) {
          const canOrder = perStoreLimit - alreadyOrdered;
          await qr.rollbackTransaction();
          throw new EventOfferError(
            400,
            canOrder <= 0
              ? '매장 구매 한도를 이미 초과하였습니다.'
              : `매장 구매 한도까지 ${canOrder}개 더 주문 가능합니다.`,
            'PER_STORE_LIMIT_EXCEEDED',
          );
        }
      }

      // (D) total_quantity 원자적 차감 (수량 있는 경우만)
      if (listing.total_quantity !== null) {
        await qr.query(
          `UPDATE organization_product_listings
           SET total_quantity = total_quantity - $1, updated_at = NOW()
           WHERE id = $2`,
          [quantity, listingId],
        );
        decremented = true;
      }

      await qr.commitTransaction();
    } catch (e) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }

    // ── Step 4: 주문 생성 (checkoutService 경유 — CLAUDE.md 규칙) ────────
    try {
      const savedOrder = await checkoutService.createOrder({
        buyerId: userId,
        sellerId: preListing.organization_id,
        supplierId: product.supplier_id,
        items: [{
          productId: preListing.offer_id,
          productName: product.name || '',
          quantity,
          unitPrice,
          subtotal: quantity * unitPrice,
        }],
        metadata: {
          serviceKey: preListing.service_key,
          productListingId: preListing.id,
          productName: product.name || '',
          productId: preListing.offer_id,
        },
      });

      return {
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        status: savedOrder.status,
        totalAmount: savedOrder.totalAmount,
      };
    } catch (orderErr) {
      // ── Step 5: 주문 실패 시 차감량 보상 (compensation) ────────────────
      if (decremented) {
        try {
          await this.dataSource.query(
            `UPDATE organization_product_listings
             SET total_quantity = total_quantity + $1, updated_at = NOW()
             WHERE id = $2`,
            [quantity, listingId],
          );
        } catch (compErr) {
          console.error('[EventOfferService] Compensation increment failed:', compErr);
        }
      }
      throw orderErr;
    }
  }
}

/**
 * Typed error for event offer operations
 */
export class EventOfferError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'EventOfferError';
  }
}
