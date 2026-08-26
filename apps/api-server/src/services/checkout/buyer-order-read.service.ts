/**
 * Buyer Order Read Service — 매장(구매자) B2B 주문 조회 Core
 *
 * WO-O4O-CROSSSERVICE-B2B-BUYER-ORDER-READ-CONTRACT-AND-COMMONIZATION-V1 (DF-1 · DF-4)
 *
 * ## 배경
 *
 * KPA / GlycoPharm / K-Cosmetics 세 서비스가 **같은 의미의** 매장 buyer 주문 조회를
 * 각자 구현하고 있었다(DF-4: controller 3벌). 목록·상세의 ownership 필터와 serviceKey
 * 격리 조건은 동일한데 구현체가 달라(TypeORM QueryBuilder 2벌 + raw SQL 1벌)
 * 금액 타입·필드 이름·필터 지원이 서비스마다 갈라졌다(DF-1).
 *
 * 본 서비스는 그 **조회 의미 하나**를 소유한다. 취소 경로가 이미
 * `store-order-cancel.service.ts` 로 공통화된 것과 같은 자리·같은 형태다.
 *
 * ## 계약 (`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1` §3)
 *
 *   · actor      = 매장 buyer — 인증 JWT 의 `user.id` (body 의 buyerId 신뢰 금지)
 *   · 저장소     = `checkout_orders` (canonical 주문 원장)
 *   · 서비스 범위 = `getBuyerOrderServiceKeys(platformKey)` 결과 집합 (SSOT)
 *   · ownership  = `"buyerId" = $buyerId` — 그 집합 밖 / 타인 주문은 **조회되지 않는다**
 *   · 조회 연산  = 목록(list) + 상세(detail) 2개뿐. 쓰기 없음.
 *
 * 없는 주문과 남의 주문은 **구분하지 않는다** — 둘 다 404 `ORDER_NOT_FOUND` 다.
 * order id 를 안다는 사실만으로 타 매장 주문의 존재 여부를 추론할 수 없어야 한다.
 *
 * ## Boundary Guard (CLAUDE.md §7)
 *
 *   · raw SQL 은 **parameter binding 만** 사용한다. 호출부가 SQL 조각을 넘기지 못하도록
 *     필터는 타입이 고정된 객체로만 받는다(문자열 fragment 주입 경로 없음).
 *   · UUID 단독 조회 금지 — 상세도 `id ∧ buyerId ∧ serviceKey` 복합 조건이다.
 *   · serviceKey 는 호출부(경로 파라미터로 결정된 서비스)가 넘긴 집합만 인정한다.
 *
 * ## 비범위
 *
 * 주문 생성 · 결제 · 취소 · 공급자 처리 · 배송 상태는 여기서 다루지 않는다(읽기 전용).
 */

import type { DataSource } from 'typeorm';

/** `checkout_orders` 는 `decimal` 컬럼을 문자열로 돌려준다 — 응답 계약은 number 다. */
function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * K-Cosmetics 만 사용하는 부가 필터.
 *
 * 세 서비스 공통 의미는 아니지만 서비스 고유 데이터라 삭제하지 않는다(WO §7).
 * Core 가 SQL 을 소유하고 호출부는 값만 넘긴다.
 */
export interface BuyerOrderListFilters {
  /** `checkout_orders.status` 원값 */
  status?: string;
  /** `metadata->>'channel'` — 'local' | 'travel' */
  channel?: string;
  /** `metadata->'travel'->>'guideId'` */
  travelGuideId?: string;
  /** `metadata->'travel'->>'tourSessionId'` */
  travelTourSessionId?: string;
  /** `metadata->'travel'->'taxRefund'->>'eligible'` (문자열 비교) */
  travelTaxRefundEligible?: string;
  /** `metadata->'travel'->'taxRefund'->>'status'` */
  travelTaxRefundStatus?: string;
}

export interface ListBuyerOrdersInput {
  /** 인증 사용자 id — 매장 buyer 정본 */
  buyerId: string;
  /** 이 서비스의 구매자 주문으로 인정하는 `metadata.serviceKey` 집합 */
  serviceKeys: string[];
  page?: number | string;
  limit?: number | string;
  filters?: BuyerOrderListFilters;
}

/** 목록 1행 — 세 서비스 공통 필드. 서비스 고유 표기는 `metadata` 에서 파생한다. */
export interface BuyerOrderSummaryRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
  /** 주문 metadata 원본 — wrapper 가 organization / pharmacy / store 표기를 만든다. */
  metadata: Record<string, any> | null;
}

export interface BuyerOrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListBuyerOrdersResult {
  orders: BuyerOrderSummaryRow[];
  pagination: BuyerOrderPagination;
}

export interface GetBuyerOrderDetailInput {
  orderId: string;
  buyerId: string;
  serviceKeys: string[];
}

/** 상세 1행 — 세 서비스 공통 필드 + 원본 metadata / items. */
export interface BuyerOrderDetailRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  /** `checkout_orders` 에 currency 컬럼이 없다 — 단일 통화(KRW) 고정. */
  currency: 'KRW';
  shippingAddress: Record<string, any> | null;
  items: Array<Record<string, any>>;
  metadata: Record<string, any> | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BuyerOrderDetailSuccess {
  ok: true;
  order: BuyerOrderDetailRow;
}

export interface BuyerOrderReadFailure {
  ok: false;
  httpStatus: number;
  code: 'ORDER_NOT_FOUND';
  message: string;
}

export type GetBuyerOrderDetailResult = BuyerOrderDetailSuccess | BuyerOrderReadFailure;

/**
 * 실패 판별용 type predicate.
 *
 * api-server tsconfig 는 `strictNullChecks: false` 라 판별 union 의 자동 narrowing
 * (`if (!result.ok)`)이 동작하지 않는다 — `store-order-cancel.service.ts` 와 동일한 이유다.
 */
export function isBuyerOrderReadFailure(
  result: GetBuyerOrderDetailResult,
): result is BuyerOrderReadFailure {
  return result.ok === false;
}

/** 페이지네이션 정규화 — 세 서비스가 같은 상한(limit ≤ 100)을 쓴다. */
export function normalizeBuyerOrderPaging(
  page?: number | string,
  limit?: number | string,
): { page: number; limit: number; offset: number } {
  const p = Math.max(1, Math.floor(Number(page)) || 1);
  const rawLimit = Math.floor(Number(limit)) || 20;
  const l = Math.min(Math.max(1, rawLimit), 100);
  return { page: p, limit: l, offset: (p - 1) * l };
}

const ORDER_NOT_FOUND: BuyerOrderReadFailure = {
  ok: false,
  httpStatus: 404,
  code: 'ORDER_NOT_FOUND',
  message: '주문을 찾을 수 없습니다.',
};

/** 상세 조회 전 형식 검사 — 잘못된 id 로 uuid 캐스트가 터지지 않게 한다. */
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * 필터 → `WHERE` 절. SQL 문자열은 전부 이 함수 안의 리터럴이고,
 * 호출부에서 오는 값은 예외 없이 placeholder 로만 들어간다.
 */
function buildFilterClauses(
  filters: BuyerOrderListFilters | undefined,
  params: any[],
): string[] {
  const clauses: string[] = [];
  if (!filters) return clauses;

  const push = (sql: (placeholder: string) => string, value: unknown) => {
    params.push(value);
    clauses.push(sql('$' + params.length));
  };

  if (filters.status) push((p) => `co.status = ${p}`, filters.status);
  if (filters.channel) push((p) => `co.metadata->>'channel' = ${p}`, filters.channel);
  if (filters.travelGuideId) {
    push((p) => `co.metadata->'travel'->>'guideId' = ${p}`, filters.travelGuideId);
  }
  if (filters.travelTourSessionId) {
    push((p) => `co.metadata->'travel'->>'tourSessionId' = ${p}`, filters.travelTourSessionId);
  }
  if (filters.travelTaxRefundEligible !== undefined) {
    push(
      (p) => `co.metadata->'travel'->'taxRefund'->>'eligible' = ${p}`,
      String(filters.travelTaxRefundEligible),
    );
  }
  if (filters.travelTaxRefundStatus) {
    push(
      (p) => `co.metadata->'travel'->'taxRefund'->>'status' = ${p}`,
      filters.travelTaxRefundStatus,
    );
  }
  return clauses;
}

/**
 * 매장 buyer 주문 목록.
 *
 * `serviceKeys` 가 비면 어떤 주문도 이 서비스의 것이 아니므로 빈 목록을 돌려준다
 * (전체 조회로 넓어지지 않는다).
 */
export async function listBuyerOrders(
  dataSource: DataSource,
  input: ListBuyerOrdersInput,
): Promise<ListBuyerOrdersResult> {
  const { page, limit, offset } = normalizeBuyerOrderPaging(input.page, input.limit);

  if (!input.buyerId || input.serviceKeys.length === 0) {
    return { orders: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  const params: any[] = [input.buyerId, input.serviceKeys];
  const whereClauses = [
    'co."buyerId" = $1::uuid',
    "co.metadata->>'serviceKey' = ANY($2::text[])",
    ...buildFilterClauses(input.filters, params),
  ];
  const whereSql = whereClauses.join(' AND ');

  const countRows: Array<{ count: number }> = await dataSource.query(
    `SELECT COUNT(*)::int AS count FROM checkout_orders co WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRows[0]?.count || 0);

  const rows: Array<Record<string, any>> = await dataSource.query(
    `SELECT co.id::text AS id,
            co."orderNumber",
            co.status::text AS status,
            co."paymentStatus"::text AS "paymentStatus",
            co."totalAmount",
            co.metadata,
            jsonb_array_length(COALESCE(co.items, '[]'::jsonb)) AS "itemCount",
            co."createdAt"
       FROM checkout_orders co
      WHERE ${whereSql}
      ORDER BY co."createdAt" DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return {
    orders: rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      paymentStatus: row.paymentStatus,
      totalAmount: num(row.totalAmount),
      itemCount: num(row.itemCount),
      createdAt: row.createdAt,
      metadata: (row.metadata ?? null) as Record<string, any> | null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * 매장 buyer 주문 상세.
 *
 * 없는 주문 · 타인 주문 · 타 serviceKey 주문은 모두 404 로 수렴한다(존재 노출 금지).
 */
export async function getBuyerOrderDetail(
  dataSource: DataSource,
  input: GetBuyerOrderDetailInput,
): Promise<GetBuyerOrderDetailResult> {
  const { orderId, buyerId, serviceKeys } = input;

  if (!orderId || !buyerId || serviceKeys.length === 0) {
    return ORDER_NOT_FOUND;
  }
  if (!UUID_RE.test(orderId)) {
    return ORDER_NOT_FOUND;
  }

  const rows: Array<Record<string, any>> = await dataSource.query(
    `SELECT co.id::text AS id,
            co."orderNumber",
            co.status::text AS status,
            co."paymentStatus"::text AS "paymentStatus",
            co.subtotal, co."shippingFee", co.discount, co."totalAmount",
            co."shippingAddress", co.items, co.metadata,
            co."paidAt", co."createdAt", co."updatedAt"
       FROM checkout_orders co
      WHERE co.id = $1::uuid
        AND co."buyerId" = $2::uuid
        AND co.metadata->>'serviceKey' = ANY($3::text[])
      LIMIT 1`,
    [orderId, buyerId, serviceKeys],
  );

  const row = rows[0];
  if (!row) return ORDER_NOT_FOUND;

  return {
    ok: true,
    order: {
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      paymentStatus: row.paymentStatus,
      subtotal: num(row.subtotal),
      shippingFee: num(row.shippingFee),
      discount: num(row.discount),
      totalAmount: num(row.totalAmount),
      currency: 'KRW',
      shippingAddress: (row.shippingAddress ?? null) as Record<string, any> | null,
      items: Array.isArray(row.items) ? row.items : [],
      metadata: (row.metadata ?? null) as Record<string, any> | null,
      paidAt: row.paidAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}
