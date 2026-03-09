/**
 * Neture Settlement Service
 *
 * WO-O4O-SETTLEMENT-SERVICE-EXTRACTION-V1
 *
 * neture.routes.ts 인라인 정산 로직을 Service Layer로 추출.
 * SQL 및 계산 방식은 기존과 100% 동일.
 */

import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';

/** Default platform fee rate for supplier settlements (10%) */
const NETURE_PLATFORM_FEE_RATE = 0.10;

const VALID_STATUSES = ['pending', 'calculated', 'approved', 'paid', 'cancelled'] as const;

interface SettlementFilters {
  page: number;
  limit: number;
  status?: string;
}

export class NetureSettlementService {
  constructor(private dataSource: DataSource) {}

  // ─────────────────────────────────────────────
  // Supplier endpoints
  // ─────────────────────────────────────────────

  /**
   * 공급자 정산 목록 (페이지네이션 + 상태 필터)
   */
  async getSupplierSettlements(supplierId: string, filters: SettlementFilters) {
    const { page, limit, status } = filters;
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
         LIMIT ${limit} OFFSET ${offset}`,
        baseParams,
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

  // ─────────────────────────────────────────────
  // Admin endpoints
  // ─────────────────────────────────────────────

  /**
   * 정산 일괄 계산 (delivered 주문 기반)
   */
  async calculateSettlements(periodStart: string, periodEnd: string) {
    // Find delivered orders not in any settlement, grouped by supplier
    const supplierAggregates = await this.dataSource.query(
      `SELECT
         spo.supplier_id,
         ARRAY_AGG(DISTINCT o.id) AS order_ids,
         COUNT(DISTINCT o.id)::int AS order_count,
         SUM(oi.total_price)::int AS total_sales
       FROM neture_orders o
       JOIN neture_order_items oi ON oi.order_id = o.id
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE o.status = 'delivered'
         AND o.updated_at >= $1::date
         AND o.updated_at < ($2::date + INTERVAL '1 day')
         AND NOT EXISTS (
           SELECT 1 FROM neture_settlement_orders nso
           WHERE nso.order_id = o.id
         )
       GROUP BY spo.supplier_id
       HAVING SUM(oi.total_price) > 0`,
      [periodStart, periodEnd],
    );

    if (supplierAggregates.length === 0) {
      return {
        success: true,
        data: { created: 0, settlements: [] },
        message: 'No unsettled delivered orders found in the given period.',
      };
    }

    const created: any[] = [];
    const feeRate = NETURE_PLATFORM_FEE_RATE;

    for (const agg of supplierAggregates) {
      const totalSales = Number(agg.total_sales);
      const platformFee = Math.round(totalSales * feeRate);
      const supplierAmount = totalSales - platformFee;
      const orderIds: string[] = agg.order_ids;

      const [settlement] = await this.dataSource.query(
        `INSERT INTO neture_settlements
           (supplier_id, period_start, period_end, total_sales, platform_fee,
            supplier_amount, platform_fee_rate, order_count, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'calculated')
         RETURNING *`,
        [agg.supplier_id, periodStart, periodEnd, totalSales,
         platformFee, supplierAmount, feeRate, agg.order_count],
      );

      // Per-order supplier sales for the junction table
      const orderSales = await this.dataSource.query(
        `SELECT o.id AS order_id, SUM(oi.total_price)::int AS supplier_sales_amount
         FROM neture_orders o
         JOIN neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE o.id = ANY($1::uuid[]) AND spo.supplier_id = $2
         GROUP BY o.id`,
        [orderIds, agg.supplier_id],
      );

      for (const os of orderSales) {
        await this.dataSource.query(
          `INSERT INTO neture_settlement_orders (settlement_id, order_id, supplier_sales_amount)
           VALUES ($1, $2, $3)`,
          [settlement.id, os.order_id, os.supplier_sales_amount],
        );
      }

      created.push(settlement);
    }

    logger.info(`[Neture Settlement] Created ${created.length} settlements for period ${periodStart} ~ ${periodEnd}`);

    return {
      success: true,
      data: { created: created.length, settlements: created },
    };
  }

  /**
   * 정산 취소 (calculated/approved → cancelled)
   */
  async cancelSettlement(settlementId: string, notes?: string) {
    const setClauses = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = ['cancelled'];
    let paramIdx = 2;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(settlementId);
    const result = await this.dataSource.query(
      `UPDATE neture_settlements SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status IN ('calculated', 'approved')
       RETURNING *`,
      params,
    );

    if (!result || result.length === 0) {
      return null;
    }

    // Delete junction rows to allow re-settlement
    await this.dataSource.query(
      `DELETE FROM neture_settlement_orders WHERE settlement_id = $1`,
      [settlementId],
    );

    return { success: true, data: result[0] };
  }

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
        `SELECT s.id, s.supplier_id, ns.name AS supplier_name,
                s.period_start, s.period_end,
                s.total_sales, s.platform_fee, s.supplier_amount,
                s.platform_fee_rate, s.order_count, s.status,
                s.approved_at, s.paid_at, s.notes, s.created_at, s.updated_at
         FROM neture_settlements s
         LEFT JOIN neture_suppliers ns ON ns.id = s.supplier_id
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
      `SELECT s.*, ns.name AS supplier_name
       FROM neture_settlements s
       LEFT JOIN neture_suppliers ns ON ns.id = s.supplier_id
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

  /**
   * 운영자 정산 승인 (calculated → approved)
   */
  async approveSettlement(settlementId: string, notes?: string) {
    const setClauses = ["status = 'approved'", 'approved_at = NOW()', 'updated_at = NOW()'];
    const params: any[] = [];
    let paramIdx = 1;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(settlementId);
    const result = await this.dataSource.query(
      `UPDATE neture_settlements SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status = 'calculated'
       RETURNING *`,
      params,
    );

    if (!result || result.length === 0) {
      return null;
    }

    logger.info(`[Neture Settlement] Settlement ${settlementId} approved`);
    return { success: true, data: result[0] };
  }

  /**
   * 운영자 정산 지급 처리 (approved → paid)
   */
  async paySettlement(settlementId: string, notes?: string) {
    const setClauses = ["status = 'paid'", 'paid_at = NOW()', 'updated_at = NOW()'];
    const params: any[] = [];
    let paramIdx = 1;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(settlementId);
    const result = await this.dataSource.query(
      `UPDATE neture_settlements SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status = 'approved'
       RETURNING *`,
      params,
    );

    if (!result || result.length === 0) {
      return null;
    }

    logger.info(`[Neture Settlement] Settlement ${settlementId} paid`);
    return { success: true, data: result[0] };
  }
}
