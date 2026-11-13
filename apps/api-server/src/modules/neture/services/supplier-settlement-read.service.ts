import type { DataSource } from 'typeorm';
import { VALID_STATUSES, type SettlementFilters } from './settlement-query-types.js';

/** Existing settlement responsibility; public callers use NetureSettlementService. */
export class SupplierSettlementReadService {
  constructor(private readonly dataSource: DataSource) {}

  // ─────────────────────────────────────────────
  // Supplier endpoints
  // ─────────────────────────────────────────────

  /**
   * 공급자 정산 목록 (페이지네이션 + 상태 필터)
   */
  async getSupplierSettlements(supplierId: string, filters: SettlementFilters) {
    const { page: rawPage, limit: rawLimit, status } = filters;
    // LIMIT/OFFSET 도 binding 한다(Raw SQL 문자열 삽입 금지). page=1e400(Infinity)·소수는 SQL 오류(500)가 되므로 정수로 맞춘다.
    const page = toPositiveInt(rawPage, 1, 1_000_000);
    const limit = toPositiveInt(rawLimit, 20, 100);
    const offset = (page - 1) * limit;

    const baseParams: any[] = [supplierId];
    let statusClause = '';
    if (status && VALID_STATUSES.includes(status as any)) {
      statusClause = 'AND s.status = $2';
      baseParams.push(status);
    }

    const [settlements, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT s.id, s.supplier_id, s.period_start, s.period_end,
                s.total_sales, s.platform_fee, s.supplier_amount,
                s.platform_fee_rate, s.order_count, s.status,
                s.paid_at, s.notes, s.created_at, s.updated_at
         FROM neture_settlements s
         WHERE s.supplier_id = $1 ${statusClause}
         ORDER BY s.period_end DESC, s.created_at DESC
         LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}`,
        [...baseParams, limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM neture_settlements s
         WHERE s.supplier_id = $1 ${statusClause}`,
        baseParams,
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);
    return {
      success: true,
      data: settlements,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 공급자 정산 KPI (대시보드용)
   */
  async getSupplierKpi(supplierId: string) {
    const result = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(supplier_amount) FILTER (WHERE status IN ('calculated', 'approved')), 0)::int AS pending_amount,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status = 'paid'), 0)::int AS paid_amount,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status IN ('calculated', 'approved', 'paid')), 0)::int AS total_amount,
         COUNT(*) FILTER (WHERE status IN ('calculated', 'approved'))::int AS pending_count,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count
       FROM neture_settlements
       WHERE supplier_id = $1 AND status != 'cancelled'`,
      [supplierId],
    );

    return {
      success: true,
      data: {
        pending_amount: Number(result[0]?.pending_amount || 0),
        paid_amount: Number(result[0]?.paid_amount || 0),
        total_amount: Number(result[0]?.total_amount || 0),
        pending_count: Number(result[0]?.pending_count || 0),
        paid_count: Number(result[0]?.paid_count || 0),
      },
    };
  }

  /**
   * 공급자 정산 상세 (연결된 주문 포함)
   */
  async getSupplierSettlementDetail(settlementId: string, supplierId: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM neture_settlements WHERE id = $1 AND supplier_id = $2 LIMIT 1`,
      [settlementId, supplierId],
    );
    if (rows.length === 0) {
      return null;
    }
    const settlement = rows[0];

    const orders = await this.dataSource.query(
      `SELECT so.order_id, so.supplier_sales_amount,
              o.order_number, o.status AS order_status,
              o.orderer_name, o.created_at AS order_date
       FROM neture_settlement_orders so
       JOIN neture_orders o ON o.id = so.order_id
       WHERE so.settlement_id = $1
       ORDER BY o.created_at DESC`,
      [settlementId],
    );

    return { success: true, data: { ...settlement, orders } };
  }
}

/** 1 이상 정수로 맞춘다 — 유한하지 않거나 1 미만이면 fallback, max 초과는 max */
function toPositiveInt(value: number, fallback: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}
