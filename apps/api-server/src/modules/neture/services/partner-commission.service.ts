/**
 * Partner Commission Service
 *
 * WO-O4O-PARTNER-COMMISSION-TRIGGER-V1
 * WO-O4O-COMMISSION-ENGINE-UNIFICATION-V1 — CommissionEngine 통합
 *
 * neture.routes.ts 인라인 커미션 로직을 Service Layer로 추출.
 * + 배송 완료 시 contract-based 커미션 자동 생성 트리거 추가.
 * Partner Commission 계산은 CommissionEngine에 위임.
 */

import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';

// Commission helper (inlined from @o4o/financial-core)
const calculatePartnerCommission = (totalPrice: number, commissionRate: number) =>
  Math.round(totalPrice * commissionRate / 100);

const VALID_STATUSES = ['pending', 'approved', 'paid', 'cancelled'] as const;

interface CommissionFilters {
  page: number;
  limit: number;
  status?: string;
}

export class PartnerCommissionService {
  constructor(private dataSource: DataSource) {}

  // ─────────────────────────────────────────────
  // NEW: Auto-trigger on delivery
  // ─────────────────────────────────────────────

  /**
   * 배송 완료된 단일 주문에 대해 contract-based 파트너 커미션 자동 생성.
   * 기존 admin batch calculate SQL과 동일 로직, 단일 주문용.
   * Returns: 생성된 커미션 수
   */
  async createContractCommissionsForOrder(orderId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT
         nspc.partner_id,
         spo.supplier_id,
         o.id AS order_id,
         o.order_number,
         nspc.id AS contract_id,
         nspc.commission_rate,
         SUM(oi.total_price)::int AS order_amount
       FROM neture_orders o
       JOIN neture_order_items oi ON oi.order_id = o.id
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       JOIN neture_partner_recruitments npr ON npr.product_id = spo.master_id
       JOIN neture_seller_partner_contracts nspc ON nspc.recruitment_id = npr.id
         AND nspc.contract_status = 'active'
       WHERE o.id = $1
         AND NOT EXISTS (
           SELECT 1 FROM partner_commissions pc
           WHERE pc.partner_id = nspc.partner_id AND pc.order_id = o.id AND pc.status != 'cancelled'
         )
       GROUP BY nspc.partner_id, spo.supplier_id, o.id, o.order_number, nspc.id, nspc.commission_rate`,
      [orderId],
    );

    if (rows.length === 0) {
      return 0;
    }

    let created = 0;
    for (const row of rows) {
      const commissionAmount = calculatePartnerCommission(
        Number(row.order_amount), Number(row.commission_rate),
      );
      try {
        await this.dataSource.query(
          `INSERT INTO partner_commissions
             (partner_id, supplier_id, order_id, order_number, contract_id,
              commission_rate, order_amount, commission_amount, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
          [row.partner_id, row.supplier_id, row.order_id, row.order_number,
           row.contract_id, row.commission_rate, row.order_amount, commissionAmount],
        );
        created++;
      } catch (insertErr: any) {
        if (insertErr.code === '23505') {
          logger.warn(`[Partner Commission] Duplicate commission for partner=${row.partner_id} order=${row.order_id}, skipping`);
        } else {
          throw insertErr;
        }
      }
    }

    if (created > 0) {
      logger.info(`[Partner Commission] Auto-created ${created} contract commission(s) for order ${orderId}`);
    }

    return created;
  }

  // ─────────────────────────────────────────────
  // Partner endpoints
  // ─────────────────────────────────────────────

  /**
   * 파트너 커미션 KPI (대시보드용)
   */
  async getPartnerKpi(partnerId: string) {
    const result = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(commission_amount) FILTER (WHERE status IN ('pending', 'approved')), 0)::int AS pending_amount,
         COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid'), 0)::int AS paid_amount,
         COALESCE(SUM(commission_amount) FILTER (WHERE status IN ('pending', 'approved', 'paid')), 0)::int AS total_amount,
         COUNT(*) FILTER (WHERE status IN ('pending', 'approved'))::int AS pending_count,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count
       FROM partner_commissions
       WHERE partner_id = $1 AND status != 'cancelled'`,
      [partnerId],
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
   * 파트너 커미션 목록 (페이지네이션 + 상태 필터)
   */
  async getPartnerCommissions(partnerId: string, filters: CommissionFilters) {
    const { page, limit, status } = filters;
    const offset = (page - 1) * limit;

    const baseParams: any[] = [partnerId];
    let statusClause = '';
    if (status && VALID_STATUSES.includes(status as any)) {
      statusClause = 'AND pc.status = $2';
      baseParams.push(status);
    }

    const [commissions, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT pc.id, pc.partner_id, pc.supplier_id, COALESCE(o.name, ns.name) AS supplier_name,
                pc.order_id, pc.order_number, pc.contract_id,
                pc.commission_rate, pc.order_amount, pc.commission_amount,
                pc.status, pc.period_start, pc.period_end,
                pc.approved_at, pc.paid_at, pc.notes,
                pc.created_at, pc.updated_at
         FROM partner_commissions pc
         LEFT JOIN neture_suppliers ns ON ns.id = pc.supplier_id
         LEFT JOIN organizations o ON o.id = ns.organization_id
         WHERE pc.partner_id = $1 ${statusClause}
         ORDER BY pc.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        baseParams,
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM partner_commissions pc
         WHERE pc.partner_id = $1 ${statusClause}`,
        baseParams,
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);
    return {
      success: true,
      data: commissions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 파트너 커미션 상세 (연결 주문 항목 포함)
   */
  async getPartnerCommissionDetail(commissionId: string, partnerId: string) {
    const rows = await this.dataSource.query(
      `SELECT pc.*, COALESCE(o.name, ns.name) AS supplier_name
       FROM partner_commissions pc
       LEFT JOIN neture_suppliers ns ON ns.id = pc.supplier_id
       LEFT JOIN organizations o ON o.id = ns.organization_id
       WHERE pc.id = $1 AND pc.partner_id = $2 LIMIT 1`,
      [commissionId, partnerId],
    );
    if (rows.length === 0) {
      return null;
    }

    const items = await this.dataSource.query(
      `SELECT oi.product_name, oi.quantity, oi.unit_price, oi.total_price
       FROM neture_order_items oi
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [rows[0].order_id],
    );

    return { success: true, data: { ...rows[0], items } };
  }

  // ─────────────────────────────────────────────
  // Admin endpoints
  // ─────────────────────────────────────────────

  /**
   * 커미션 일괄 계산 — 계약 기반으로 delivered 주문에서 파트너 커미션 생성
   */
  async calculateBatchCommissions(periodStart: string, periodEnd: string) {
    const rows = await this.dataSource.query(
      `SELECT
         nspc.partner_id,
         spo.supplier_id,
         o.id AS order_id,
         o.order_number,
         nspc.id AS contract_id,
         nspc.commission_rate,
         SUM(oi.total_price)::int AS order_amount
       FROM neture_orders o
       JOIN neture_order_items oi ON oi.order_id = o.id
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       JOIN neture_partner_recruitments npr ON npr.product_id = spo.master_id
       JOIN neture_seller_partner_contracts nspc ON nspc.recruitment_id = npr.id
         AND nspc.contract_status = 'active'
       WHERE o.status = 'delivered'
         AND o.updated_at >= $1::date
         AND o.updated_at < ($2::date + INTERVAL '1 day')
         AND NOT EXISTS (
           SELECT 1 FROM partner_commissions pc
           WHERE pc.partner_id = nspc.partner_id AND pc.order_id = o.id AND pc.status != 'cancelled'
         )
       GROUP BY nspc.partner_id, spo.supplier_id, o.id, o.order_number, nspc.id, nspc.commission_rate`,
      [periodStart, periodEnd],
    );

    if (rows.length === 0) {
      return {
        success: true,
        data: { created: 0, message: 'No eligible orders found for commission calculation' },
      };
    }

    let created = 0;
    for (const row of rows) {
      const commissionAmount = calculatePartnerCommission(
        Number(row.order_amount), Number(row.commission_rate),
      );
      try {
        await this.dataSource.query(
          `INSERT INTO partner_commissions
             (partner_id, supplier_id, order_id, order_number, contract_id,
              commission_rate, order_amount, commission_amount, status,
              period_start, period_end)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)`,
          [row.partner_id, row.supplier_id, row.order_id, row.order_number,
           row.contract_id, row.commission_rate, row.order_amount, commissionAmount,
           periodStart, periodEnd],
        );
        created++;
      } catch (insertErr: any) {
        if (insertErr.code === '23505') {
          logger.warn(`[Neture Commission] Duplicate commission for partner=${row.partner_id} order=${row.order_id}, skipping`);
        } else {
          throw insertErr;
        }
      }
    }

    logger.info(`[Neture Commission] Created ${created} commission records for period ${periodStart} ~ ${periodEnd}`);

    return {
      success: true,
      data: { created, period: { start: periodStart, end: periodEnd } },
    };
  }

  /**
   * 운영자 커미션 목록 (페이지네이션 + 상태 필터 + 파트너명)
   */
  async getAdminCommissions(filters: CommissionFilters) {
    const { page, limit, status } = filters;
    const offset = (page - 1) * limit;

    const baseParams: any[] = [];
    let statusClause = '';
    let paramIdx = 1;
    if (status && VALID_STATUSES.includes(status as any)) {
      statusClause = `WHERE pc.status = $${paramIdx}`;
      baseParams.push(status);
      paramIdx++;
    }

    const [commissions, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT pc.id, pc.partner_id, np.name AS partner_name,
                pc.supplier_id, ns.name AS supplier_name,
                pc.order_id, pc.order_number, pc.contract_id,
                pc.commission_rate, pc.order_amount, pc.commission_amount,
                pc.status, pc.period_start, pc.period_end,
                pc.approved_at, pc.paid_at, pc.notes,
                pc.created_at, pc.updated_at
         FROM partner_commissions pc
         LEFT JOIN neture_partners np ON np.id = pc.partner_id
         LEFT JOIN neture_suppliers ns ON ns.id = pc.supplier_id
         ${statusClause}
         ORDER BY pc.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        baseParams,
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM partner_commissions pc
         ${statusClause}`,
        baseParams,
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);
    return {
      success: true,
      data: commissions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 운영자 커미션 KPI (pending/approved/paid)
   */
  async getAdminKpi() {
    const result = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
         COALESCE(SUM(commission_amount) FILTER (WHERE status = 'pending'), 0)::int AS pending_amount,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
         COALESCE(SUM(commission_amount) FILTER (WHERE status = 'approved'), 0)::int AS approved_amount,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
         COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid'), 0)::int AS paid_amount
       FROM partner_commissions
       WHERE status != 'cancelled'`,
    );

    return {
      success: true,
      data: {
        pending_count: Number(result[0]?.pending_count || 0),
        pending_amount: Number(result[0]?.pending_amount || 0),
        approved_count: Number(result[0]?.approved_count || 0),
        approved_amount: Number(result[0]?.approved_amount || 0),
        paid_count: Number(result[0]?.paid_count || 0),
        paid_amount: Number(result[0]?.paid_amount || 0),
      },
    };
  }

  /**
   * 운영자 커미션 상세 (파트너명 + 주문 항목)
   */
  async getAdminCommissionDetail(commissionId: string) {
    const rows = await this.dataSource.query(
      `SELECT pc.*, np.name AS partner_name, ns.name AS supplier_name
       FROM partner_commissions pc
       LEFT JOIN neture_partners np ON np.id = pc.partner_id
       LEFT JOIN neture_suppliers ns ON ns.id = pc.supplier_id
       WHERE pc.id = $1 LIMIT 1`,
      [commissionId],
    );
    if (rows.length === 0) {
      return null;
    }

    const items = await this.dataSource.query(
      `SELECT oi.product_name, oi.quantity, oi.unit_price, oi.total_price
       FROM neture_order_items oi
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [rows[0].order_id],
    );

    return { success: true, data: { ...rows[0], items } };
  }

  /**
   * 커미션 승인 (pending → approved)
   */
  async approveCommission(commissionId: string, notes?: string) {
    const setClauses = ["status = 'approved'", 'approved_at = NOW()', 'updated_at = NOW()'];
    const params: any[] = [];
    let paramIdx = 1;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(commissionId);
    const result = await this.dataSource.query(
      `UPDATE partner_commissions SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status = 'pending'
       RETURNING *`,
      params,
    );

    if (!result || result.length === 0) {
      return null;
    }

    logger.info(`[Neture Commission] Commission ${commissionId} approved`);
    return { success: true, data: result[0] };
  }

  /**
   * 커미션 지급 처리 (approved → paid)
   */
  async payCommission(commissionId: string, notes?: string) {
    const setClauses = ["status = 'paid'", 'paid_at = NOW()', 'updated_at = NOW()'];
    const params: any[] = [];
    let paramIdx = 1;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(commissionId);
    const result = await this.dataSource.query(
      `UPDATE partner_commissions SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status = 'approved'
       RETURNING *`,
      params,
    );

    if (!result || result.length === 0) {
      return null;
    }

    logger.info(`[Neture Commission] Commission ${commissionId} paid`);
    return { success: true, data: result[0] };
  }

  /**
   * 커미션 취소 (pending/approved → cancelled)
   */
  async cancelCommission(commissionId: string, notes?: string) {
    const setClauses = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = ['cancelled'];
    let paramIdx = 2;

    if (notes !== undefined) {
      setClauses.push(`notes = $${paramIdx}`);
      params.push(notes);
      paramIdx++;
    }

    params.push(commissionId);
    const result = await this.dataSource.query(
      `UPDATE partner_commissions SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND status IN ('pending', 'approved')
       RETURNING *`,
      params,
    );

    if (!result || result.length === 0) {
      return null;
    }

    logger.info(`[Neture Commission] Commission ${commissionId} cancelled`);
    return { success: true, data: result[0] };
  }
}
