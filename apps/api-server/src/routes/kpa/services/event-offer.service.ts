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

import type { DataSource, Repository, QueryRunner } from 'typeorm';
import { OrganizationProductListing } from '../../../modules/store-core/entities/organization-product-listing.entity.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { CheckoutOrder } from '../../../entities/checkout/CheckoutOrder.entity.js';
import { checkoutService } from '../../../services/checkout.service.js';
import { resolveStoreAccess } from '../../../utils/store-owner.utils.js';
// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
import {
  resolveOrganizationForEventOffer,
} from '../helpers/event-offer-organization.helper.js';
import {
  TARGET_TO_EVENT_OFFER_KEY,
  type TargetServiceKey,
  isSupportedTargetServiceKey,
} from '../../../constants/event-offer-service-mapping.js';

// ─── WO-O4O-EVENT-OFFER-STORE-PRODUCT-LINK-V1 ───────────────────────────────
// Event Offer service_key → Store(매장 진열) service_key 매핑.
// 매핑된 항목만 참여 후 매장 진열 등록 후처리를 실행한다.
// 새 서비스 도입 시 이 맵에 항목 추가만으로 확장 가능.
const STORE_SERVICE_KEY_MAP: Record<string, string> = {
  [SERVICE_KEYS.KPA_GROUPBUY]: SERVICE_KEYS.KPA,
  // WO-O4O-EVENT-OFFER-KCOS-ADOPTION-V1: K-Cosmetics 적용
  [SERVICE_KEYS.K_COSMETICS_EVENT_OFFER]: SERVICE_KEYS.K_COSMETICS,
  // WO-O4O-GLYCOPHARM-EVENT-OFFERS-BACKEND-CANONICAL-ALIGNMENT-V1
  [SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER]: SERVICE_KEYS.GLYCOPHARM,
  // [SERVICE_KEYS.EVENT_OFFER_NETURE]: ?,  // Neture는 적용 제외 (지원 허브)
};

// ─── 상태 계산 ───────────────────────────────────────────────────────────────

/**
 * WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 'upcoming' / 'sold_out' / 'rejected' 추가.
 * - DB 저장값: pending | approved | rejected | canceled
 * - 런타임 계산값(approved 분기): upcoming(시작 전) | active(진행중) | sold_out(매진) | ended(종료)
 */
export type EventStatusKey =
  | 'pending'
  | 'rejected'
  | 'canceled'
  | 'upcoming'
  | 'active'
  | 'sold_out'
  | 'ended';

export function resolveEventStatus(opl: {
  status: string;
  start_at: Date | string | null;
  end_at: Date | string | null;
  total_quantity?: number | null;
}): EventStatusKey {
  if (opl.status === 'canceled') return 'canceled';
  if (opl.status === 'rejected') return 'rejected';
  if (opl.status === 'pending') return 'pending';

  // status === 'approved' 이후
  const now = new Date();

  if (opl.start_at) {
    const startAt = opl.start_at instanceof Date ? opl.start_at : new Date(opl.start_at);
    if (now < startAt) return 'upcoming';
  }
  if (opl.end_at) {
    const endAt = opl.end_at instanceof Date ? opl.end_at : new Date(opl.end_at);
    if (now > endAt) return 'ended';
  }
  if (opl.total_quantity != null && Number(opl.total_quantity) <= 0) return 'sold_out';
  return 'active';
}

// ─── Active 조건 SQL 절 ───────────────────────────────────────────────────────

/**
 * 매장 경영자에게 노출할 "주문 가능(active)" 이벤트 필터 (테이블 alias: opl)
 * status='approved' + 날짜 조건 + 수량 조건
 */
const ACTIVE_OFFER_CLAUSE = `
  opl.status = 'approved'
  AND (opl.start_at IS NULL OR NOW() >= opl.start_at)
  AND (opl.end_at   IS NULL OR NOW() <= opl.end_at)
  AND (opl.total_quantity IS NULL OR opl.total_quantity > 0)
`.trim();

/**
 * WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
 * "곧 시작(upcoming)" 노출 조건: approved + start_at 미도래 + (end_at 미경과)
 * — 시작 전이지만 매장 경영자에게 미리 보여주기 위한 조건. 주문은 불가.
 */
const UPCOMING_OFFER_CLAUSE = `
  opl.status = 'approved'
  AND opl.start_at IS NOT NULL
  AND NOW() < opl.start_at
  AND (opl.end_at IS NULL OR NOW() <= opl.end_at)
`.trim();

/**
 * 매장(buyer)별 특정 listing 누적 주문 수량 집계 SQL.
 *
 * WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1:
 *   - 상태 제외 정정: 'canceled'/'failed'(오타·결제상태) → CheckoutOrderStatus 의 'cancelled'/'refunded'.
 *   - line-item 기준 집계: 공급자 병합 주문은 주문레벨 metadata.productListingId 가 없으므로
 *     item metadata(elem->'metadata'->>'productListingId') 로 카운트. metadata 가 없는 레거시 주문만
 *     주문레벨 metadata.productListingId 로 fallback(이중계수 방지).
 *   - jsonb_typeof='array' 가드: items 가 배열 아닌 레거시 row 에서 jsonb_array_elements 오류 방지.
 * $1 = buyerId, $2 = listingId
 */
const STORE_ORDERED_QTY_SQL = `
  SELECT COALESCE(SUM((elem->>'quantity')::int), 0)::int AS total_ordered
  FROM checkout_orders co
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(co.items) = 'array' THEN co.items ELSE '[]'::jsonb END
  ) AS elem
  WHERE co."buyerId" = $1
    AND co.status NOT IN ('cancelled', 'refunded')
    AND (
      elem->'metadata'->>'productListingId' = $2
      OR (
        co.metadata->>'productListingId' = $2
        AND NOT (co.items @> '[{"metadata":{}}]'::jsonb)
      )
    )
`.trim();

// ─── Order context (helper 반환형) ────────────────────────────────────────────

/**
 * lock 전 결정되는 이벤트오퍼 주문 컨텍스트 (단가/공급자/판매 org/배송정책).
 * WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1: participate + cart checkout-confirm 공용.
 */
export interface EventOfferOrderContext {
  listingId: string;
  serviceKey: string;
  /** opl.organization_id — sellerId / sellerOrganizationId */
  organizationId: string;
  masterId: string;
  /** opl.offer_id — SupplierProductOffer.id (= createOrder productId) */
  offerId: string;
  supplierId: string;
  productName: string;
  unitPrice: number;
  shippingPolicy: { baseShippingFee: number | null; freeShippingThreshold: number | null };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class EventOfferService {
  private listingRepo: Repository<OrganizationProductListing>;

  constructor(private dataSource: DataSource) {
    this.listingRepo = dataSource.getRepository(OrganizationProductListing);
  }

  /**
   * 매장(buyer)별 특정 listing 누적 주문 수량. dataSource 또는 활성 queryRunner 로 실행 가능.
   * WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1: per_store_limit 게이트/가용표시 공용.
   */
  private async countStoreOrderedQuantity(
    exec: { query: (sql: string, params: unknown[]) => Promise<any[]> },
    buyerId: string,
    listingId: string,
  ): Promise<number> {
    const [row] = await exec.query(STORE_ORDERED_QTY_SQL, [buyerId, listingId]);
    return Number(row?.total_ordered ?? 0);
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
    status?: 'upcoming' | 'active' | 'ended' | 'all',
    serviceKey: string = SERVICE_KEYS.KPA_GROUPBUY,
  ): Promise<{
    data: Array<{
      id: string;
      offerId: string;
      price: number | null;
      /** WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 이벤트 전용 가격 */
      eventPrice: number | null;
      /** 일반 공급가 (supplier_product_offers.price_general 스냅샷) */
      generalPrice: number | null;
      isActive: boolean;
      status: EventStatusKey;
      startAt: string | null;
      endAt: string | null;
      createdAt: string;
      updatedAt: string;
      supplierId: string;
      /** 주문 시 적용 단가 = event_price ?? price_general */
      unitPrice: number | null;
      productName: string;
      supplierName: string;
      // WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2: 수량 정보
      totalQuantity: number | null;
      perOrderLimit: number | null;
      perStoreLimit: number | null;
      // WO-O4O-GROUPBUY-LISTING-VIEWMODEL-PHASE1-V1: Store Listing source 식별자
      sourceType: string | null;
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
    } else if (effectiveStatus === 'upcoming') {
      // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 시작 전 노출
      filterClause = UPCOMING_OFFER_CLAUSE;
    } else if (effectiveStatus === 'ended') {
      // 취소되었거나 날짜 만료된 항목 + sold_out (수량 0)
      filterClause = `(
        opl.status = 'canceled'
        OR (opl.status = 'approved' AND opl.end_at IS NOT NULL AND NOW() > opl.end_at)
        OR (opl.status = 'approved' AND opl.total_quantity IS NOT NULL AND opl.total_quantity <= 0)
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
         opl.event_price::numeric AS "eventPrice",
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
         spo.price_general::numeric AS "generalPrice",
         -- WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1: event_price > 서비스별가 > price_general > legacy opl.price
         COALESCE(opl.event_price, osp.unit_price, spo.price_general, opl.price)::numeric AS "unitPrice",
         COALESCE(pm.name, '(상품명 없음)')  AS "productName",
         COALESCE(org.name, '(공급사 없음)') AS "supplierName",
         opl.source_type AS "sourceType"
       FROM organization_product_listings opl
       LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
       LEFT JOIN offer_service_prices osp     ON osp.offer_id = spo.id AND osp.service_key = opl.service_key
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
        eventPrice: r.eventPrice !== null ? Number(r.eventPrice) : null,
        generalPrice: r.generalPrice !== null ? Number(r.generalPrice) : null,
        isActive: r.isActive,
        status: resolveEventStatus({
          status: r.dbStatus,
          start_at: r.startAt,
          end_at: r.endAt,
          total_quantity: r.totalQuantity,
        }),
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
        // WO-O4O-GROUPBUY-LISTING-VIEWMODEL-PHASE1-V1
        sourceType: r.sourceType ?? null,
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
      alreadyOrdered = await this.countStoreOrderedQuantity(this.dataSource, userId, listingId);
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
      `SELECT
         opl.id,
         opl.offer_id        AS "offerId",
         opl.price::numeric,
         opl.event_price::numeric AS "eventPrice",
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
         spo.price_general::numeric AS "generalPrice",
         -- WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1: event_price > 서비스별가 > price_general > legacy opl.price
         COALESCE(opl.event_price, osp.unit_price, spo.price_general, opl.price)::numeric AS "unitPrice",
         COALESCE(pm.name, '(상품명 없음)')  AS "productName",
         COALESCE(org.name, '(공급사 없음)') AS "supplierName",
         ns.base_shipping_fee        AS "baseShippingFee",
         ns.free_shipping_threshold  AS "freeShippingThreshold",
         opl.source_type AS "sourceType"
       FROM organization_product_listings opl
       LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
       LEFT JOIN offer_service_prices osp     ON osp.offer_id = spo.id AND osp.service_key = opl.service_key
       LEFT JOIN neture_suppliers ns          ON ns.id  = spo.supplier_id
       LEFT JOIN organizations org            ON org.id = ns.organization_id
       LEFT JOIN product_masters pm           ON pm.id  = opl.master_id
       WHERE opl.id = $1
         AND opl.service_key = $2
         AND ${ACTIVE_OFFER_CLAUSE}
       LIMIT 1`,
      [id, serviceKey],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      offerId: r.offerId,
      price: r.price !== null ? Number(r.price) : null,
      eventPrice: r.eventPrice !== null ? Number(r.eventPrice) : null,
      generalPrice: r.generalPrice !== null ? Number(r.generalPrice) : null,
      isActive: r.isActive,
      status: resolveEventStatus({
        status: r.dbStatus,
        start_at: r.startAt,
        end_at: r.endAt,
        total_quantity: r.totalQuantity,
      }),
      startAt: r.startAt ? new Date(r.startAt).toISOString() : null,
      endAt: r.endAt ? new Date(r.endAt).toISOString() : null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || ''),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt || ''),
      supplierId: r.supplierId,
      unitPrice: r.unitPrice !== null ? Number(r.unitPrice) : null,
      productName: r.productName,
      supplierName: r.supplierName,
      totalQuantity: r.totalQuantity !== null ? Number(r.totalQuantity) : null,
      perOrderLimit: r.perOrderLimit !== null ? Number(r.perOrderLimit) : null,
      perStoreLimit: r.perStoreLimit !== null ? Number(r.perStoreLimit) : null,
      // WO-O4O-GROUPBUY-LISTING-VIEWMODEL-PHASE1-V1
      sourceType: r.sourceType ?? null,
      // WO-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-V1 (additive, read-only)
      // 공급자 배송 정책 — 무료배송 안내 표시용. 계산 로직 변경 없음.
      shippingPolicy: {
        baseShippingFee: r.baseShippingFee != null ? Number(r.baseShippingFee) : null,
        freeShippingThreshold: r.freeShippingThreshold != null ? Number(r.freeShippingThreshold) : null,
      },
    };
  }

  /**
   * POST /:id/participate — Create event offer order via checkoutService
   *
   * @deprecated WO-O4O-EVENT-OFFER-PARTICIPATE-LEGACY-DEMOTION-V1
   *   Buyer 주문의 canonical entry 는 Store Cart checkout-confirm 으로 이전됨:
   *   StoreCartItem(sourceType='event_offer') → POST /store/cart/:serviceKey/checkout-confirm
   *   → (supplier, sellerOrg) 그룹별 checkoutService.createOrder.
   *   이 method 는 단건 직접 주문 legacy/호환 경로다 (KPA/Glyco/KCos buyer UI 직접 호출 0건).
   *   검증/차감 로직은 loadEventOfferContext + reserveEventOfferListing helper 로 분리되어
   *   checkout-confirm 오케스트레이터가 재사용한다. 동작·에러코드는 보존한다. route 미삭제.
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

    // ── Step 1-2: lock 전 listing/supplier 검증 + 단가 결정 ──────────────
    const ctx = await this.loadEventOfferContext(listingId, serviceKey);

    // ── Step 3: 수량 제한 검증 + total_quantity 원자적 차감 (단일 listing 트랜잭션) ──
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    let decrementedQty = 0;
    try {
      decrementedQty = (
        await this.reserveEventOfferListing(qr, { listingId, serviceKey, userId, quantity })
      ).decrementedQty;
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
        sellerId: ctx.organizationId,
        supplierId: ctx.supplierId,
        items: [{
          productId: ctx.offerId,
          productName: ctx.productName,
          quantity,
          unitPrice: ctx.unitPrice,
          subtotal: quantity * ctx.unitPrice,
        }],
        shippingPolicy: ctx.shippingPolicy,
        metadata: {
          serviceKey: ctx.serviceKey,
          productListingId: ctx.listingId,
          productName: ctx.productName,
          productId: ctx.offerId,
        },
      });

      // ── Step 6: 매장 진열 자동 등록 (best-effort) — WO-O4O-EVENT-OFFER-STORE-PRODUCT-LINK-V1
      await this.tryLinkStoreProduct({
        userId,
        eventServiceKey: serviceKey,
        eventListingId: ctx.listingId,
        masterId: ctx.masterId,
        offerId: ctx.offerId,
      });

      return {
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        status: savedOrder.status,
        totalAmount: savedOrder.totalAmount,
      };
    } catch (orderErr) {
      // ── Step 5: 주문 실패 시 차감량 보상 (compensation) ────────────────
      if (decrementedQty > 0) await this.incrementListingQuantity(listingId, decrementedQty);
      throw orderErr;
    }
  }

  /**
   * lock 전 listing/supplier 검증 + 주문 단가/배송정책 결정 (재고 잠금·차감 없음).
   * WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1: participate 와 cart checkout-confirm 공용.
   * supplier 정보는 별도 row 라 lock 범위 밖에서 조회해도 안전(원래 participate 주석 유지).
   */
  async loadEventOfferContext(
    listingId: string,
    serviceKey: string,
  ): Promise<EventOfferOrderContext> {
    const preLockRows = await this.dataSource.query(
      `SELECT opl.id, opl.offer_id, opl.master_id, opl.organization_id, opl.service_key,
              opl.status, opl.start_at, opl.end_at, opl.event_price
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

    const productRows = await this.dataSource.query(
      `SELECT spo.id AS spo_id, spo.supplier_id, spo.price_general, spo.is_active,
              spo.approval_status, s.status AS supplier_status, pm.name,
              s.base_shipping_fee, s.free_shipping_threshold
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

    // 단가 = event_price (있으면) ?? price_general (레거시 fallback). 일반 공급가는 불변 — 스냅샷에만 반영.
    const eventPrice = preListing.event_price != null ? Number(preListing.event_price) : null;
    const unitPrice = eventPrice ?? Number(product.price_general ?? 0);
    if (unitPrice <= 0) throw new EventOfferError(400, 'Invalid product price', 'INVALID_PRICE');

    return {
      listingId: preListing.id,
      serviceKey: preListing.service_key,
      organizationId: preListing.organization_id,
      masterId: preListing.master_id,
      offerId: preListing.offer_id,
      supplierId: product.supplier_id,
      productName: product.name || '',
      unitPrice,
      shippingPolicy: {
        baseShippingFee: product.base_shipping_fee != null ? Number(product.base_shipping_fee) : null,
        freeShippingThreshold: product.free_shipping_threshold != null ? Number(product.free_shipping_threshold) : null,
      },
    };
  }

  /**
   * 활성 queryRunner 트랜잭션 안에서 listing 재고를 잠그고(FOR UPDATE) 한도 검증 후 차감한다.
   * WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1: participate(단일) 와 cart checkout-confirm(공급자 그룹) 공용.
   * 검증 실패 시 EventOfferError 를 throw 한다(트랜잭션 정리는 호출자 책임).
   * 반환 decrementedQty: 차감한 수량(보상용). total_quantity 가 null(무제한)이면 0.
   */
  async reserveEventOfferListing(
    qr: QueryRunner,
    params: { listingId: string; serviceKey: string; userId: string; quantity: number },
  ): Promise<{ decrementedQty: number }> {
    const { listingId, serviceKey, userId, quantity } = params;

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
      throw new EventOfferError(404, '이벤트를 찾을 수 없거나 진행 중이 아닙니다.');
    }

    // (A) per_order_limit
    if (listing.per_order_limit !== null && quantity > Number(listing.per_order_limit)) {
      throw new EventOfferError(
        400,
        `1회 최대 ${listing.per_order_limit}개까지 주문 가능합니다.`,
        'PER_ORDER_LIMIT_EXCEEDED',
      );
    }

    // (B) total_quantity 잔여
    if (listing.total_quantity !== null) {
      const remaining = Number(listing.total_quantity);
      if (remaining <= 0) {
        throw new EventOfferError(400, '판매 종료된 이벤트입니다.', 'SOLD_OUT');
      }
      if (remaining < quantity) {
        throw new EventOfferError(
          400,
          `잔여 수량이 ${remaining}개입니다. 수량을 줄여 다시 시도해 주세요.`,
          'INSUFFICIENT_QUANTITY',
        );
      }
    }

    // (C) per_store_limit (누적 — 정정된 line-item 기준 SQL)
    if (listing.per_store_limit !== null) {
      const alreadyOrdered = await this.countStoreOrderedQuantity(qr, userId, listingId);
      const perStoreLimit = Number(listing.per_store_limit);
      if (alreadyOrdered + quantity > perStoreLimit) {
        const canOrder = perStoreLimit - alreadyOrdered;
        throw new EventOfferError(
          400,
          canOrder <= 0
            ? '매장 구매 한도를 이미 초과하였습니다.'
            : `매장 구매 한도까지 ${canOrder}개 더 주문 가능합니다.`,
          'PER_STORE_LIMIT_EXCEEDED',
        );
      }
    }

    // (D) 원자적 차감 (수량 있는 경우만)
    if (listing.total_quantity !== null) {
      await qr.query(
        `UPDATE organization_product_listings
         SET total_quantity = total_quantity - $1, updated_at = NOW()
         WHERE id = $2`,
        [quantity, listingId],
      );
      return { decrementedQty: quantity };
    }
    return { decrementedQty: 0 };
  }

  /** 차감 보상(increment back). best-effort — 실패해도 throw 하지 않음. */
  async incrementListingQuantity(listingId: string, qty: number): Promise<void> {
    if (qty <= 0) return;
    try {
      await this.dataSource.query(
        `UPDATE organization_product_listings
         SET total_quantity = total_quantity + $1, updated_at = NOW()
         WHERE id = $2`,
        [qty, listingId],
      );
    } catch (compErr) {
      console.error('[EventOfferService] Compensation increment failed:', compErr);
    }
  }

  // ─── WO-O4O-EVENT-OFFER-STORE-PRODUCT-LINK-V1 ─────────────────────────────
  // Event Offer 참여 후, 참여자의 매장(organization)에 해당 상품을 진열용
  // organization_product_listings row로 자동 등록한다.
  //
  // 정책:
  //   - service_key 매핑이 없으면 skip (Neture 등 미적용 서비스)
  //   - user → organization_id 매핑 실패 시 skip (권한 없는 사용자)
  //   - INSERT는 ON CONFLICT DO NOTHING — 이미 매장에 있는 경우 skip
  //   - 모든 실패는 non-blocking. trace 정보를 console.warn으로 남긴다.
  //
  // TODO: 추후 retry/repair API 도입 시 주문 → 매장 등록 누락 케이스 일괄 보정.
  // TODO: 이미 매장에 있는 listing의 price 필드 갱신 정책 결정 (현재는 skip 유지).

  // WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1: cart checkout-confirm 오케스트레이터도 재사용 (public)
  async tryLinkStoreProduct(params: {
    userId: string;
    eventServiceKey: string;
    eventListingId: string;
    masterId: string;
    offerId: string;
  }): Promise<void> {
    const targetServiceKey = STORE_SERVICE_KEY_MAP[params.eventServiceKey];
    if (!targetServiceKey) {
      // 매핑되지 않은 service_key (예: neture-event-offer) — 매장 등록 미적용
      return;
    }

    // Entity상 master_id는 NOT NULL이지만, 레거시 데이터/예외 케이스 안전장치.
    if (!params.masterId || !params.offerId) {
      console.warn(
        '[EventOfferService] tryLinkStoreProduct: skipped (missing master_id or offer_id on event listing)',
        {
          userId: params.userId,
          eventListingId: params.eventListingId,
          eventServiceKey: params.eventServiceKey,
          hasMasterId: !!params.masterId,
          hasOfferId: !!params.offerId,
        },
      );
      return;
    }

    let organizationId: string | null = null;
    try {
      organizationId = await resolveStoreAccess(this.dataSource, params.userId, []);
    } catch (resolveErr) {
      console.warn(
        '[EventOfferService] tryLinkStoreProduct: resolveStoreAccess failed (non-blocking)',
        {
          userId: params.userId,
          eventListingId: params.eventListingId,
          eventServiceKey: params.eventServiceKey,
          message: (resolveErr as Error)?.message,
        },
      );
      return;
    }

    if (!organizationId) {
      // 사용자가 매장 owner가 아님 — 매장 등록 대상 아님
      console.warn(
        '[EventOfferService] tryLinkStoreProduct: skipped (no store organization for user)',
        {
          userId: params.userId,
          eventListingId: params.eventListingId,
          eventServiceKey: params.eventServiceKey,
        },
      );
      return;
    }

    try {
      await this.ensureStoreProduct({
        organizationId,
        targetServiceKey,
        masterId: params.masterId,
        offerId: params.offerId,
        sourceEventOfferId: params.eventListingId,
      });
    } catch (linkErr) {
      console.warn(
        '[EventOfferService] tryLinkStoreProduct: ensureStoreProduct failed (non-blocking)',
        {
          userId: params.userId,
          organizationId,
          eventListingId: params.eventListingId,
          eventServiceKey: params.eventServiceKey,
          targetServiceKey,
          masterId: params.masterId,
          offerId: params.offerId,
          message: (linkErr as Error)?.message,
        },
      );
    }
  }

  /**
   * organization_product_listings에 매장 진열 row를 INSERT한다.
   * 이미 (organization_id, service_key, offer_id) 조합이 존재하면 ON CONFLICT DO NOTHING.
   *
   * 신규 row 의미:
   *   - is_active = true       — 즉시 매장 진열 활성화
   *   - status = 'pending'     — entity default. 이벤트 SQL(status='approved')에 안 잡힘
   *   - source_type = 'event-offer'
   *   - source_id   = 참여한 event offer listing의 id
   */
  private async ensureStoreProduct(params: {
    organizationId: string;
    targetServiceKey: string;
    masterId: string;
    offerId: string;
    sourceEventOfferId: string;
  }): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO organization_product_listings
         (id, organization_id, service_key, master_id, offer_id,
          is_active, status, source_type, source_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4,
               true, 'pending', 'event-offer', $5, NOW(), NOW())
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [
        params.organizationId,
        params.targetServiceKey,
        params.masterId,
        params.offerId,
        params.sourceEventOfferId,
      ],
    );
  }

  // ─── WO-O4O-EVENT-OFFER-CREATE-SERVICE-CAPSULE-V1 ─────────────────────────
  // Event Offer (organization_product_listing) 생성을 service에 캡슐화.
  // 두 controller(supplier-offers, event-offer-operator)에 흩어진 INSERT 로직을 통합.
  //
  // 책임:
  //   service: offer 검증 / 소유권 검증(supplier) / 중복 체크 / 정책 분기 / INSERT
  //   controller: organizationId 결정(helper 호출) / 응답 포맷 변환
  //
  // 정책:
  //   roleType='supplier'  → status='pending',  is_active=false (운영자 승인 대기)
  //   roleType='operator'  → status='approved', is_active=true  (즉시 노출)
  //
  // 중복 방지: (organization_id, service_key, offer_id)

  async createListing(input: {
    offerId: string;
    serviceKey: string;
    organizationId: string;
    roleType: 'supplier' | 'operator';
    /** roleType='supplier'일 때 offer 소유권 검증용 (해당 offer의 supplier가 이 user에 매핑되는지) */
    ownerUserId?: string;
    /**
     * WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1
     * roleType='operator'일 때 결정자 user_id (decided_by에 기록).
     * roleType='supplier'일 땐 무시.
     */
    operatorUserId?: string;
    /**
     * WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
     * 이벤트 조건. supplier 가 일반 공급가/소비자가와 별도로 지정한다.
     * 일반 공급가는 절대 변경하지 않는다.
     */
    eventConditions?: {
      eventPrice: number;
      startAt: Date;
      endAt: Date;
      totalQuantity?: number | null;
      perOrderLimit?: number | null;
      perStoreLimit?: number | null;
    };
  }): Promise<{
    id: string;
    offerId: string;
    masterId: string;
    title: string;
    supplierName: string;
    status: 'pending' | 'approved';
    isActive: boolean;
    price: number | null;
    /** WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1 */
    eventPrice: number | null;
    startAt: string | null;
    endAt: string | null;
    totalQuantity: number | null;
    perOrderLimit: number | null;
    perStoreLimit: number | null;
    createdAt: string;
  }> {
    // 1. Offer 조회 (master_id, supplier_id, price, name, supplier org_name)
    const offerRows = await this.dataSource.query(
      `SELECT spo.id, spo.master_id, spo.supplier_id, spo.price_general,
              pm.name AS product_name,
              org.name AS org_name
       FROM supplier_product_offers spo
       LEFT JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       LEFT JOIN organizations org   ON org.id = ns.organization_id
       WHERE spo.id = $1
       LIMIT 1`,
      [input.offerId],
    );
    if (!offerRows.length) {
      throw new EventOfferCreateError(404, 'Offer not found', 'OFFER_NOT_FOUND');
    }
    const offer = offerRows[0];

    // 2. roleType='supplier'이면 소유권 검증
    if (input.roleType === 'supplier') {
      if (!input.ownerUserId) {
        throw new EventOfferCreateError(
          403,
          'ownerUserId required for supplier role',
          'OFFER_NOT_OWNED',
        );
      }
      const ownerRows = await this.dataSource.query(
        `SELECT 1 FROM neture_suppliers
         WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [offer.supplier_id, input.ownerUserId],
      );
      if (!ownerRows.length) {
        throw new EventOfferCreateError(403, 'Offer not owned', 'OFFER_NOT_OWNED');
      }
    }

    // 3. 중복 체크 (organization_id, service_key, offer_id)
    const dup = await this.dataSource.query(
      `SELECT id FROM organization_product_listings
       WHERE organization_id = $1 AND service_key = $2 AND offer_id = $3
       LIMIT 1`,
      [input.organizationId, input.serviceKey, input.offerId],
    );
    if (dup.length) {
      throw new EventOfferCreateError(409, 'Already listed', 'ALREADY_LISTED');
    }

    // 4. 정책 분기 (status / is_active)
    const status: 'pending' | 'approved' =
      input.roleType === 'operator' ? 'approved' : 'pending';
    const isActive = input.roleType === 'operator';

    // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: Approval Queue 메타필드
    //   supplier 제안: requested_by = ownerUserId, decided_by/decided_at = NULL
    //   operator 직접 등록: requested_by = NULL, decided_by/decided_at = NOW()
    const requestedBy = input.roleType === 'supplier' ? input.ownerUserId ?? null : null;
    const decidedBy = input.roleType === 'operator' ? input.operatorUserId ?? null : null;
    const decidedAt = input.roleType === 'operator' ? new Date() : null;

    // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
    // 이벤트 조건 입력 검증 — 정책: eventPrice <= price_general, startAt < endAt
    const ec = input.eventConditions;
    if (ec) {
      if (!Number.isFinite(ec.eventPrice) || ec.eventPrice <= 0) {
        throw new EventOfferCreateError(400, 'eventPrice 는 0 보다 큰 숫자여야 합니다.', 'INTERNAL_ERROR');
      }
      // WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1:
      //   검증 기준 = 대상 서비스의 서비스별 공급가(있으면) ?? 기본 공급가(price_general).
      const generalPrice = offer.price_general != null ? Number(offer.price_general) : null;
      const [svcPriceRow] = await this.dataSource.query(
        `SELECT unit_price FROM offer_service_prices WHERE offer_id = $1 AND service_key = $2`,
        [input.offerId, input.serviceKey],
      );
      const basePrice = svcPriceRow?.unit_price != null ? Number(svcPriceRow.unit_price) : generalPrice;
      if (basePrice != null && ec.eventPrice > basePrice) {
        throw new EventOfferCreateError(
          400,
          `이벤트 가격(${ec.eventPrice})은 공급가(${basePrice}) 이하여야 합니다.`,
          'INTERNAL_ERROR',
        );
      }
      const startMs = ec.startAt.getTime();
      const endMs = ec.endAt.getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        throw new EventOfferCreateError(400, '시작/종료 일시 형식이 올바르지 않습니다.', 'INTERNAL_ERROR');
      }
      if (startMs >= endMs) {
        throw new EventOfferCreateError(400, '시작 일시는 종료 일시보다 이전이어야 합니다.', 'INTERNAL_ERROR');
      }
      if (ec.totalQuantity != null && (!Number.isFinite(ec.totalQuantity) || ec.totalQuantity < 0)) {
        throw new EventOfferCreateError(400, 'totalQuantity 는 0 이상이어야 합니다.', 'INTERNAL_ERROR');
      }
      if (ec.perOrderLimit != null && (!Number.isFinite(ec.perOrderLimit) || ec.perOrderLimit < 1)) {
        throw new EventOfferCreateError(400, 'perOrderLimit 은 1 이상이어야 합니다.', 'INTERNAL_ERROR');
      }
      if (ec.perStoreLimit != null && (!Number.isFinite(ec.perStoreLimit) || ec.perStoreLimit < 1)) {
        throw new EventOfferCreateError(400, 'perStoreLimit 은 1 이상이어야 합니다.', 'INTERNAL_ERROR');
      }
    }

    // 5. INSERT
    const listingRepo = this.dataSource.getRepository(OrganizationProductListing);
    const listing = listingRepo.create({
      organization_id: input.organizationId,
      master_id: offer.master_id,
      offer_id: input.offerId,
      service_key: input.serviceKey,
      is_active: isActive,
      status,
      // 일반 공급가 스냅샷 (기존 로직 유지)
      price: offer.price_general != null ? Number(offer.price_general) : null,
      // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 이벤트 전용 가격/기간/수량
      event_price: ec ? ec.eventPrice : null,
      start_at: ec ? ec.startAt : null,
      end_at: ec ? ec.endAt : null,
      total_quantity: ec?.totalQuantity ?? null,
      per_order_limit: ec?.perOrderLimit ?? null,
      per_store_limit: ec?.perStoreLimit ?? null,
      requested_by: requestedBy,
      decided_by: decidedBy,
      decided_at: decidedAt,
      rejected_reason: null,
      // WO-O4O-GROUPBUY-LISTING-VIEWMODEL-PHASE1-V1: Store Listing source 식별자
      source_type: 'event-offer',
    } as Partial<OrganizationProductListing>);

    const saved = await listingRepo.save(listing);
    const createdAt = (saved.created_at instanceof Date
      ? saved.created_at
      : new Date(saved.created_at)
    ).toISOString();

    return {
      id: saved.id,
      offerId: input.offerId,
      masterId: offer.master_id,
      title: offer.product_name || '(상품명 없음)',
      supplierName: offer.org_name || '(공급사 없음)',
      status,
      isActive,
      price: offer.price_general != null ? Number(offer.price_general) : null,
      eventPrice: saved.event_price != null ? Number(saved.event_price) : null,
      startAt: saved.start_at ? (saved.start_at instanceof Date ? saved.start_at.toISOString() : new Date(saved.start_at).toISOString()) : null,
      endAt: saved.end_at ? (saved.end_at instanceof Date ? saved.end_at.toISOString() : new Date(saved.end_at).toISOString()) : null,
      totalQuantity: saved.total_quantity != null ? Number(saved.total_quantity) : null,
      perOrderLimit: saved.per_order_limit != null ? Number(saved.per_order_limit) : null,
      perStoreLimit: saved.per_store_limit != null ? Number(saved.per_store_limit) : null,
      createdAt,
    };
  }

  // ─── WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1 ────────────────────────────────
  // Approval Queue: supplier가 제안한 pending 항목을 operator가 승인/반려.
  //
  // 정책:
  //   approveListing — pending → approved + is_active=true
  //   rejectListing  — pending → rejected + is_active=false + rejected_reason
  //
  // 에러:
  //   404 NOT_FOUND      — OPL 없음
  //   400 INVALID_STATE  — pending이 아닌 경우
  //   400 INVALID_REASON — reject 사유 미입력

  /**
   * pending OPL을 승인한다.
   * 변경: status='approved', is_active=true, decided_by, decided_at=NOW()
   */
  async approveListing(
    oplId: string,
    decidedBy: string,
  ): Promise<{
    id: string;
    status: 'approved';
    isActive: true;
    decidedAt: string;
  }> {
    const repo = this.dataSource.getRepository(OrganizationProductListing);
    const listing = await repo.findOne({ where: { id: oplId } });
    if (!listing) {
      throw new EventOfferCreateError(404, 'Listing not found', 'NOT_FOUND');
    }
    if (listing.status !== 'pending') {
      throw new EventOfferCreateError(
        400,
        `Cannot approve: current status is '${listing.status}'`,
        'INVALID_STATE',
      );
    }

    const now = new Date();
    listing.status = 'approved';
    listing.is_active = true;
    listing.decided_by = decidedBy;
    listing.decided_at = now;
    listing.rejected_reason = null;

    const saved = await repo.save(listing);

    return {
      id: saved.id,
      status: 'approved',
      isActive: true,
      decidedAt: (saved.decided_at instanceof Date
        ? saved.decided_at
        : new Date(saved.decided_at as any)
      ).toISOString(),
    };
  }

  /**
   * pending OPL을 반려한다.
   * 변경: status='rejected', is_active=false, decided_by, decided_at=NOW(), rejected_reason
   */
  async rejectListing(
    oplId: string,
    decidedBy: string,
    reason: string,
  ): Promise<{
    id: string;
    status: 'rejected';
    isActive: false;
    decidedAt: string;
    rejectedReason: string;
  }> {
    const trimmed = (reason ?? '').trim();
    if (!trimmed) {
      throw new EventOfferCreateError(400, 'Reject reason is required', 'INVALID_REASON');
    }

    const repo = this.dataSource.getRepository(OrganizationProductListing);
    const listing = await repo.findOne({ where: { id: oplId } });
    if (!listing) {
      throw new EventOfferCreateError(404, 'Listing not found', 'NOT_FOUND');
    }
    if (listing.status !== 'pending') {
      throw new EventOfferCreateError(
        400,
        `Cannot reject: current status is '${listing.status}'`,
        'INVALID_STATE',
      );
    }

    const now = new Date();
    listing.status = 'rejected';
    listing.is_active = false;
    listing.decided_by = decidedBy;
    listing.decided_at = now;
    listing.rejected_reason = trimmed;

    const saved = await repo.save(listing);

    return {
      id: saved.id,
      status: 'rejected',
      isActive: false,
      decidedAt: (saved.decided_at instanceof Date
        ? saved.decided_at
        : new Date(saved.decided_at as any)
      ).toISOString(),
      rejectedReason: trimmed,
    };
  }

  /**
   * COUNT pending listings — operator dashboard Action Queue 등에서 count 만 필요할 때.
   *
   * WO-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-EVENT-OFFER-ACTION-QUEUE-V1
   *   listPendingListings 가 list + total 을 함께 반환하므로 count-only 호출 시
   *   불필요한 list query 가 실행됨 → count-only 메서드 분리.
   * status='pending' AND service_key 필터.
   */
  async countPendingListings(serviceKey: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM organization_product_listings opl
       WHERE opl.service_key = $1 AND opl.status = 'pending'`,
      [serviceKey],
    );
    return rows[0]?.total ?? 0;
  }

  /**
   * GET pending listings — operator approval queue
   * status='pending' AND service_key 필터.
   */
  async listPendingListings(
    serviceKey: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Array<{
      id: string;
      offerId: string;
      masterId: string;
      organizationId: string;
      productName: string;
      supplierName: string;
      price: number | null;
      /** WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 운영자 승인 화면 가시성 */
      eventPrice: number | null;
      generalPrice: number | null;
      startAt: string | null;
      endAt: string | null;
      totalQuantity: number | null;
      perOrderLimit: number | null;
      perStoreLimit: number | null;
      requestedBy: string | null;
      requestedByEmail: string | null;
      createdAt: string;
    }>;
    total: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (safePage - 1) * safeLimit;

    const [countRows, rows] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM organization_product_listings opl
         WHERE opl.service_key = $1 AND opl.status = 'pending'`,
        [serviceKey],
      ),
      this.dataSource.query(
        `SELECT
           opl.id,
           opl.offer_id        AS "offerId",
           opl.master_id       AS "masterId",
           opl.organization_id AS "organizationId",
           opl.price::numeric  AS "price",
           opl.event_price::numeric AS "eventPrice",
           opl.start_at        AS "startAt",
           opl.end_at          AS "endAt",
           opl.total_quantity  AS "totalQuantity",
           opl.per_order_limit AS "perOrderLimit",
           opl.per_store_limit AS "perStoreLimit",
           opl.requested_by    AS "requestedBy",
           opl.created_at      AS "createdAt",
           u.email             AS "requestedByEmail",
           spo.price_general::numeric AS "generalPrice",
           COALESCE(pm.name, '(상품명 없음)')  AS "productName",
           COALESCE(org.name, '(공급사 없음)') AS "supplierName"
         FROM organization_product_listings opl
         LEFT JOIN supplier_product_offers spo ON spo.id  = opl.offer_id
         LEFT JOIN neture_suppliers ns          ON ns.id  = spo.supplier_id
         LEFT JOIN organizations org            ON org.id = ns.organization_id
         LEFT JOIN product_masters pm           ON pm.id  = opl.master_id
         LEFT JOIN users u                      ON u.id   = opl.requested_by
         WHERE opl.service_key = $1 AND opl.status = 'pending'
         ORDER BY opl.created_at ASC
         LIMIT $2 OFFSET $3`,
        [serviceKey, safeLimit, offset],
      ),
    ]);

    return {
      data: rows.map((r: any) => ({
        id: r.id,
        offerId: r.offerId,
        masterId: r.masterId,
        organizationId: r.organizationId,
        productName: r.productName,
        supplierName: r.supplierName,
        price: r.price !== null ? Number(r.price) : null,
        eventPrice: r.eventPrice !== null ? Number(r.eventPrice) : null,
        generalPrice: r.generalPrice !== null ? Number(r.generalPrice) : null,
        startAt: r.startAt ? new Date(r.startAt).toISOString() : null,
        endAt: r.endAt ? new Date(r.endAt).toISOString() : null,
        totalQuantity: r.totalQuantity !== null ? Number(r.totalQuantity) : null,
        perOrderLimit: r.perOrderLimit !== null ? Number(r.perOrderLimit) : null,
        perStoreLimit: r.perStoreLimit !== null ? Number(r.perStoreLimit) : null,
        requestedBy: r.requestedBy,
        requestedByEmail: r.requestedByEmail,
        createdAt: r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt || ''),
      })),
      total: countRows[0]?.total ?? 0,
    };
  }

  // ─── WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1 ─────────────────────────
  // 단일 SPO를 여러 서비스(KPA / K-Cos)로 동시 제안.
  //
  // 정책:
  //   - 각 target service를 event offer service key로 변환 후 createListing() 호출
  //   - 서비스별 organizationId는 resolveOrganizationForEventOffer로 결정
  //   - 서비스별로 결과를 분리해서 반환 (성공 / 실패 코드)
  //   - createListing() 자체는 단일 service 단위 — 변경 없음 (단일 책임)
  //   - 부분 실패 허용: 한 서비스 실패가 다른 서비스 성공을 막지 않는다
  //
  // 결과 status 분류:
  //   created            — INSERT 성공
  //   already_proposed   — (org, service, offer) 중복
  //   offer_not_found    — SPO 없음
  //   offer_not_owned    — supplier 소유권 없음
  //   org_unavailable    — 해당 service에 매핑 가능한 organization 없음
  //   unsupported        — TARGET_TO_EVENT_OFFER_KEY 미등록 (예: glycopharm 미지원)
  //   internal_error     — 기타

  async createMultiServiceProposal(input: {
    offerId: string;
    targetServiceKeys: string[];
    ownerUserId: string;
    /**
     * WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
     * supplier 가 지정한 이벤트 조건 — 모든 대상 서비스 row 에 동일하게 적용.
     */
    eventConditions?: {
      eventPrice: number;
      startAt: Date;
      endAt: Date;
      totalQuantity?: number | null;
      perOrderLimit?: number | null;
      perStoreLimit?: number | null;
    };
  }): Promise<{
    offerId: string;
    results: Array<{
      targetServiceKey: string;
      eventOfferServiceKey: string | null;
      status:
        | 'created'
        | 'already_proposed'
        | 'offer_not_found'
        | 'offer_not_owned'
        | 'org_unavailable'
        | 'unsupported'
        | 'internal_error';
      listingId: string | null;
      message?: string;
    }>;
  }> {
    const unique = Array.from(new Set(input.targetServiceKeys.filter(Boolean)));
    const results: Array<{
      targetServiceKey: string;
      eventOfferServiceKey: string | null;
      status:
        | 'created'
        | 'already_proposed'
        | 'offer_not_found'
        | 'offer_not_owned'
        | 'org_unavailable'
        | 'unsupported'
        | 'internal_error';
      listingId: string | null;
      message?: string;
    }> = [];

    for (const target of unique) {
      // 1. 매핑 검증
      if (!isSupportedTargetServiceKey(target)) {
        results.push({
          targetServiceKey: target,
          eventOfferServiceKey: null,
          status: 'unsupported',
          listingId: null,
          message: '지원되지 않는 대상 서비스입니다.',
        });
        continue;
      }
      const eventOfferKey = TARGET_TO_EVENT_OFFER_KEY[target as TargetServiceKey];

      // 2. 서비스별 organizationId 결정
      const organizationId = await resolveOrganizationForEventOffer({
        dataSource: this.dataSource,
        userId: input.ownerUserId,
        roleType: 'supplier',
        serviceKey: eventOfferKey,
      });
      if (!organizationId) {
        results.push({
          targetServiceKey: target,
          eventOfferServiceKey: eventOfferKey,
          status: 'org_unavailable',
          listingId: null,
          message: `${target} 조직 정보를 확인할 수 없습니다.`,
        });
        continue;
      }

      // 3. 단일 createListing 호출 (서비스별 독립)
      try {
        const created = await this.createListing({
          offerId: input.offerId,
          serviceKey: eventOfferKey,
          organizationId,
          roleType: 'supplier',
          ownerUserId: input.ownerUserId,
          // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
          eventConditions: input.eventConditions,
        });
        results.push({
          targetServiceKey: target,
          eventOfferServiceKey: eventOfferKey,
          status: 'created',
          listingId: created.id,
        });
      } catch (e: any) {
        if (e instanceof EventOfferCreateError) {
          const codeMap: Record<string, typeof results[number]['status']> = {
            ALREADY_LISTED:  'already_proposed',
            OFFER_NOT_FOUND: 'offer_not_found',
            OFFER_NOT_OWNED: 'offer_not_owned',
            INTERNAL_ERROR:  'internal_error',
          };
          results.push({
            targetServiceKey: target,
            eventOfferServiceKey: eventOfferKey,
            status: codeMap[e.code] ?? 'internal_error',
            listingId: null,
            message: e.message,
          });
        } else {
          results.push({
            targetServiceKey: target,
            eventOfferServiceKey: eventOfferKey,
            status: 'internal_error',
            listingId: null,
            message: e?.message ?? 'unknown error',
          });
        }
      }
    }

    return { offerId: input.offerId, results };
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

/**
 * WO-O4O-EVENT-OFFER-CREATE-SERVICE-CAPSULE-V1
 * Typed error for createListing() — controller가 statusCode + code를 응답에 매핑.
 */
export type EventOfferCreateErrorCode =
  | 'OFFER_NOT_FOUND'
  | 'OFFER_NOT_OWNED'
  | 'ALREADY_LISTED'
  | 'INTERNAL_ERROR'
  // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: approveListing/rejectListing
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'INVALID_REASON';

export class EventOfferCreateError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: EventOfferCreateErrorCode,
  ) {
    super(message);
    this.name = 'EventOfferCreateError';
  }
}
