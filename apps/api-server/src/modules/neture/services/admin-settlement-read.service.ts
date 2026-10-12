import type { DataSource } from 'typeorm';
import { VALID_STATUSES, type SettlementFilters } from './settlement-query-types.js';

/** Existing settlement responsibility; public callers use NetureSettlementService. */
export class AdminSettlementReadService {
  constructor(private dataSource: DataSource) {}

  /**
   * 운영자 정산 목록 (페이지네이션 + 상태 필터 + 공급자명)
   */
  async getAdminSettlements(filters: SettlementFilters) {
    const { page, limit, status } = filters;
    const offset = (page - 1) * limit;

    const baseParams: any[] = [];
    let statusClause = '';
    let paramIdx = 1;
    if (status && VALID_STATUSES.includes(status as any)) {
      statusClause = `WHERE s.status = $${paramIdx}`;
      baseParams.push(status);
      paramIdx++;
    }

    const [settlements, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT s.id, s.supplier_id, supplier_org.name AS supplier_name,
                s.period_start, s.period_end,
                s.total_sales, s.platform_fee, s.supplier_amount,
                s.platform_fee_rate, s.order_count, s.status,
                s.approved_at, s.paid_at, s.notes, s.created_at, s.updated_at
         FROM neture_settlements s
         LEFT JOIN neture_suppliers ns ON ns.id = s.supplier_id
         LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
         ${statusClause}
         ORDER BY s.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        baseParams,
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM neture_settlements s
         ${statusClause}`,
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
   * 운영자 정산 KPI (calculated/approved/paid 건수 + 금액)
   */
  async getAdminKpi() {
    const result = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'calculated')::int AS calculated_count,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status = 'calculated'), 0)::int AS calculated_amount,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status = 'approved'), 0)::int AS approved_amount,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
         COALESCE(SUM(supplier_amount) FILTER (WHERE status = 'paid'), 0)::int AS paid_amount
       FROM neture_settlements
       WHERE status != 'cancelled'`,
    );

    return {
      success: true,
      data: {
        calculated_count: Number(result[0]?.calculated_count || 0),
        calculated_amount: Number(result[0]?.calculated_amount || 0),
        approved_count: Number(result[0]?.approved_count || 0),
        approved_amount: Number(result[0]?.approved_amount || 0),
        paid_count: Number(result[0]?.paid_count || 0),
        paid_amount: Number(result[0]?.paid_amount || 0),
      },
    };
  }

  /**
   * 운영자 정산 상세 (공급자명 + 연결 주문)
   */
  async getAdminSettlementDetail(settlementId: string) {
    const rows = await this.dataSource.query(
      `SELECT s.*, supplier_org.name AS supplier_name
       FROM neture_settlements s
       LEFT JOIN neture_suppliers ns ON ns.id = s.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
       WHERE s.id = $1 LIMIT 1`,
      [settlementId],
    );
    if (rows.length === 0) {
      return null;
    }

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

    return { success: true, data: { ...rows[0], orders } };
  }
}
