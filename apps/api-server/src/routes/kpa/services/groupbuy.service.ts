/**
 * KPA Groupbuy Service
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts
 * WO-EVENT-OFFER-FIX-V1: checkout_orders 테이블 사용, ecommerce_orders 제거
 * WO-O4O-EVENT-OFFER-CORE-REFORM-V1:
 *   - resolveEventStatus() 추가
 *   - 매장 경영자 조회: is_active → status + 날짜 + 수량 복합 조건
 *   - participate: total_quantity 검증 추가
 *
 * Responsibilities:
 * - Groupbuy listing queries (public, with optional auth)
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

export class GroupbuyService {
  private listingRepo: Repository<OrganizationProductListing>;

  constructor(private dataSource: DataSource) {
    this.listingRepo = dataSource.getRepository(OrganizationProductListing);
  }

  /**
   * GET / — Public groupbuy listing (paginated)
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1: status + 날짜 + 수량 조건으로 변경
   */
  async listGroupbuys(page: number, limit: number): Promise<{ data: OrganizationProductListing[]; total: number }> {
    const safePage = page || 1;
    const safeLimit = Math.min(limit || 12, 50);
    const offset = (safePage - 1) * safeLimit;

    const [countResult, data] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM organization_product_listings opl
         WHERE opl.service_key = $1
           AND ${ACTIVE_OFFER_CLAUSE}`,
        [SERVICE_KEYS.KPA_GROUPBUY],
      ),
      this.dataSource.query(
        `SELECT opl.*
         FROM organization_product_listings opl
         WHERE opl.service_key = $1
           AND ${ACTIVE_OFFER_CLAUSE}
         ORDER BY opl.created_at ASC
         LIMIT $2 OFFSET $3`,
        [SERVICE_KEYS.KPA_GROUPBUY, safeLimit, offset],
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
      [SERVICE_KEYS.KPA_GROUPBUY],
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
      [SERVICE_KEYS.KPA_GROUPBUY, safeLimit, offset],
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
      })),
      total,
    };
  }

  /**
   * GET /stats — Operator stats (orders, quantity, revenue, stores, listings)
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1: registeredProducts → status='approved' 기준
   */
  async getGroupbuyStats(): Promise<{
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
        WHERE metadata->>'serviceKey' = 'kpa-groupbuy'
          AND status = 'paid'
      `),
      this.dataSource.query(`
        SELECT COUNT(DISTINCT "buyerId")::int AS "participatingStores"
        FROM checkout_orders
        WHERE metadata->>'serviceKey' = 'kpa-groupbuy'
          AND status = 'paid'
      `),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt
         FROM organization_product_listings opl
         WHERE opl.service_key = $1 AND ${ACTIVE_OFFER_CLAUSE}`,
        [SERVICE_KEYS.KPA_GROUPBUY],
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
   * GET /my-participations — Authenticated user's groupbuy orders
   */
  async getMyParticipations(userId: string): Promise<{ data: any[]; total: number }> {
    const orderRepo = this.dataSource.getRepository(CheckoutOrder);
    const [orders, total] = await orderRepo
      .createQueryBuilder('o')
      .where('o.buyerId = :buyerId', { buyerId: userId })
      .andWhere("o.metadata->>'serviceKey' = :sk", { sk: 'kpa-groupbuy' })
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
   * GET /:id — Groupbuy detail (public)
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1: status + 날짜 조건으로 변경
   */
  async getGroupbuyDetail(id: string): Promise<Record<string, any> | null> {
    const rows = await this.dataSource.query(
      `SELECT opl.*
       FROM organization_product_listings opl
       WHERE opl.id = $1
         AND opl.service_key = $2
         AND ${ACTIVE_OFFER_CLAUSE}
       LIMIT 1`,
      [id, SERVICE_KEYS.KPA_GROUPBUY],
    );
    return rows[0] ?? null;
  }

  /**
   * POST /:id/participate — Create groupbuy order via checkoutService
   *
   * WO-EVENT-OFFER-FIX-V1: checkout_orders 사용, metadata.serviceKey 전파
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1: total_quantity 검증 추가
   */
  async participate(
    listingId: string,
    userId: string,
    data: { quantity?: number },
  ): Promise<{ orderId: string; orderNumber: string; status: string; totalAmount: number }> {
    // 1. listing 조회 (status + 날짜 조건 적용)
    const listingRows = await this.dataSource.query(
      `SELECT opl.*
       FROM organization_product_listings opl
       WHERE opl.id = $1
         AND opl.service_key = $2
         AND ${ACTIVE_OFFER_CLAUSE}
       LIMIT 1`,
      [listingId, SERVICE_KEYS.KPA_GROUPBUY],
    );
    if (!listingRows.length) {
      throw new GroupbuyError(404, 'Product not found');
    }
    const listing = listingRows[0];

    // 2. 총 수량 소진 검증 (1차: total_quantity만 적용)
    if (listing.total_quantity !== null && listing.total_quantity <= 0) {
      throw new GroupbuyError(400, '판매 종료된 이벤트입니다.', 'SOLD_OUT');
    }

    const quantity = Math.max(1, parseInt(String(data?.quantity)) || 1);

    // 3. Supplier product 활성/승인 검증 + 가격 조회
    const productRows = await this.dataSource.query(
      `SELECT spo.id AS spo_id, spo.supplier_id, spo.price_general, spo.is_active,
              spo.approval_status, s.status AS supplier_status,
              pm.name
       FROM supplier_product_offers spo
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       JOIN product_masters pm ON pm.id = spo.master_id
       WHERE spo.id = $1`,
      [listing.offer_id],
    );
    if (!productRows.length) {
      throw new GroupbuyError(404, 'Supplier product not found');
    }
    const product = productRows[0];
    if (!product.is_active) throw new GroupbuyError(400, 'Product is not active', 'PRODUCT_INACTIVE');
    if (product.approval_status !== 'APPROVED') throw new GroupbuyError(400, 'Product is not approved', 'PRODUCT_NOT_APPROVED');
    if (product.supplier_status !== 'ACTIVE') throw new GroupbuyError(400, 'Supplier is not active', 'SUPPLIER_INACTIVE');

    const unitPrice = Number(product.price_general ?? 0);
    if (unitPrice <= 0) throw new GroupbuyError(400, 'Invalid product price', 'INVALID_PRICE');

    const subtotal = quantity * unitPrice;

    // 4. 주문 생성 (checkoutService 경유 — CLAUDE.md 규칙)
    const savedOrder = await checkoutService.createOrder({
      buyerId: userId,
      sellerId: listing.organization_id,
      supplierId: product.supplier_id,
      items: [{
        productId: listing.offer_id,
        productName: product.name || '',
        quantity,
        unitPrice,
        subtotal,
      }],
      metadata: {
        serviceKey: listing.service_key,
        productListingId: listing.id,
        productName: product.name || '',
        productId: listing.offer_id,
      },
    });

    return {
      orderId: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      status: savedOrder.status,
      totalAmount: savedOrder.totalAmount,
    };
  }
}

/**
 * Typed error for groupbuy operations
 */
export class GroupbuyError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'GroupbuyError';
  }
}
