/**
 * Operator Order Query Helper (view-only)
 *
 * WO-O4O-OPERATOR-ORDER-VIEW-API-V1
 *
 * 서비스 운영자(operator)용 주문 "조회 전용" 공통 헬퍼.
 * canonical 주문 원장 = `checkout_orders` (IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1).
 *
 * 원칙:
 *  - serviceKey 는 **서버가 고정**한다 (client query parameter 신뢰 금지).
 *  - 상태변경(confirm/ship/cancel/refund/invoice/settlement) 없음 — read-only.
 *  - PII 최소화: shippingAddress / recipientName / phone / email / buyerId / items 상세 미반환.
 *    목록은 itemCount + 대표 메타(channel/storeName)만 노출.
 *  - raw SQL 은 parameter binding($1..) 만 사용 (string interpolation 금지).
 *  - `ecommerce_orders` 미사용. `checkout_orders` 만 조회.
 *  - 테이블 부재/빈 결과(row 0)에서도 안전하게 빈 목록 + 0 stats 반환.
 */

import type { DataSource } from 'typeorm';

export interface OperatorOrderQueryParams {
  page?: number | string;
  limit?: number | string;
  status?: string | null;
  paymentStatus?: string | null;
  /** orderNumber 부분 검색 (PII 검색 아님) */
  search?: string | null;
  /** ISO date (inclusive) — createdAt >= dateFrom */
  dateFrom?: string | null;
  /** ISO date (inclusive) — createdAt <= dateTo */
  dateTo?: string | null;
}

/** 목록 응답 — PII-safe 필드만 */
export interface OperatorOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  channel: string | null;
  storeName: string | null;
  /** PII 마스킹 placeholder — 목록에서 구매자 식별 정보 미노출 (항상 null) */
  buyerLabel: string | null;
  createdAt: string | Date;
}

export interface OperatorOrderStats {
  total: number;
  paid: number;
  pending: number;
  cancelled: number;
  totalAmount: number;
}

export interface OperatorOrderListResult {
  orders: OperatorOrderListItem[];
  stats: OperatorOrderStats;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const EMPTY_STATS: OperatorOrderStats = {
  total: 0,
  paid: 0,
  pending: 0,
  cancelled: 0,
  totalAmount: 0,
};

/**
 * checkout_orders 를 serviceKey 로 고정 조회 (view-only).
 *
 * @param dataSource  api-server DataSource
 * @param serviceKey  서버 고정 serviceKey ('glycopharm' | 'cosmetics' 등). client 값 신뢰 금지.
 *                    복수 허용 (예: KPA = ['kpa-society','kpa']) — 동일 서비스의 legacy/canonical
 *                    serviceKey 가 공존할 때 배열로 전달하면 ANY 로 매칭한다.
 * @param params      pagination / filter
 */
export async function queryOperatorOrders(
  dataSource: DataSource,
  serviceKey: string | string[],
  params: OperatorOrderQueryParams = {},
): Promise<OperatorOrderListResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(Math.max(1, Number(params.limit) || 20), 100);
  const offset = (page - 1) * limit;

  const status = params.status ? String(params.status) : null;
  const paymentStatus = params.paymentStatus ? String(params.paymentStatus) : null;
  const search = params.search ? String(params.search) : null;
  const dateFrom = params.dateFrom ? String(params.dateFrom) : null;
  const dateTo = params.dateTo ? String(params.dateTo) : null;

  // serviceKey 서버 고정 — $1 (단일/복수 모두 ANY 로 매칭). 이하 filter 는 parameter binding 으로만 추가.
  const serviceKeys = Array.isArray(serviceKey) ? serviceKey : [serviceKey];
  const where: string[] = [`co.metadata->>'serviceKey' = ANY($1::text[])`];
  const p: unknown[] = [serviceKeys];

  if (status) {
    p.push(status);
    where.push(`co.status = $${p.length}`);
  }
  if (paymentStatus) {
    p.push(paymentStatus);
    where.push(`co."paymentStatus" = $${p.length}`);
  }
  if (search) {
    p.push(search);
    where.push(`co."orderNumber" ILIKE '%' || $${p.length} || '%'`);
  }
  if (dateFrom) {
    p.push(dateFrom);
    where.push(`co."createdAt" >= $${p.length}`);
  }
  if (dateTo) {
    p.push(dateTo);
    where.push(`co."createdAt" <= $${p.length}`);
  }

  const whereSql = where.join(' AND ');

  const [rawOrders, statsRows] = await Promise.all([
    dataSource
      .query(
        `SELECT co.id,
                co."orderNumber",
                co.status,
                co."paymentStatus",
                co."totalAmount",
                co.metadata->>'channel'    AS channel,
                co.metadata->>'storeName'  AS "storeName",
                jsonb_array_length(COALESCE(co.items, '[]'::jsonb)) AS "itemCount",
                co."createdAt"
         FROM checkout_orders co
         WHERE ${whereSql}
         ORDER BY co."createdAt" DESC
         LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
        [...p, limit, offset],
      )
      .catch(() => [] as Array<Record<string, unknown>>),

    dataSource
      .query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE co.status = 'paid')::int AS paid,
                COUNT(*) FILTER (WHERE co.status IN ('created','pending_payment'))::int AS pending,
                COUNT(*) FILTER (WHERE co.status = 'cancelled')::int AS cancelled,
                COALESCE(SUM(co."totalAmount"), 0)::float AS "totalAmount"
         FROM checkout_orders co
         WHERE ${whereSql}`,
        p,
      )
      .catch(() => [EMPTY_STATS]),
  ]);

  const s = (statsRows[0] as OperatorOrderStats) || EMPTY_STATS;
  const stats: OperatorOrderStats = {
    total: Number(s.total) || 0,
    paid: Number(s.paid) || 0,
    pending: Number(s.pending) || 0,
    cancelled: Number(s.cancelled) || 0,
    totalAmount: Number(s.totalAmount) || 0,
  };

  const orders: OperatorOrderListItem[] = (rawOrders as Array<Record<string, unknown>>).map((o) => ({
    id: String(o.id),
    orderNumber: String(o.orderNumber ?? ''),
    status: String(o.status ?? ''),
    paymentStatus: String(o.paymentStatus ?? ''),
    totalAmount: Number(o.totalAmount) || 0,
    itemCount: Number(o.itemCount) || 0,
    channel: (o.channel as string) ?? null,
    storeName: (o.storeName as string) ?? null,
    buyerLabel: null, // PII 미노출 — 목록에서 구매자 식별 정보 제공하지 않음
    createdAt: (o.createdAt as string | Date),
  }));

  return {
    orders,
    stats,
    pagination: {
      page,
      limit,
      total: stats.total,
      totalPages: Math.ceil(stats.total / limit),
    },
  };
}
