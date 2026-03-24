/**
 * OfferServiceApprovalService — WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
 *
 * 서비스 레벨 상품 승인 관리.
 * offer_service_approvals 테이블 전용 (기존 product_approvals와 독립).
 */

import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';

export class OfferServiceApprovalService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 상품 생성 시 pending 승인 자동 생성 (idempotent)
   */
  async createPendingApprovals(offerId: string, serviceKeys: string[]): Promise<void> {
    if (!serviceKeys.length) return;

    const values = serviceKeys
      .map((_, i) => `($1, $${i + 2}, 'pending', NOW(), NOW())`)
      .join(', ');

    await this.dataSource.query(
      `INSERT INTO offer_service_approvals (offer_id, service_key, approval_status, created_at, updated_at)
       VALUES ${values}
       ON CONFLICT (offer_id, service_key) DO NOTHING`,
      [offerId, ...serviceKeys],
    );
  }

  /**
   * Operator: 승인 목록 (페이지네이션 + 필터)
   */
  async listApprovals(options: {
    status?: string;
    serviceKey?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const { status, serviceKey, page = 1, limit = 50 } = options;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (status && status !== 'all') {
      conditions.push(`osa.approval_status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (serviceKey) {
      conditions.push(`osa.service_key = $${idx}`);
      params.push(serviceKey);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [countResult, rows] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM offer_service_approvals osa ${where}`,
        params,
      ),
      this.dataSource.query(
        `SELECT
           osa.id, osa.offer_id AS "offerId", osa.service_key AS "serviceKey",
           osa.approval_status AS "approvalStatus",
           osa.decided_by AS "decidedBy", osa.decided_at AS "decidedAt",
           osa.reason, osa.created_at AS "createdAt",
           COALESCE(pm.marketing_name, pm.regulatory_name, '') AS "productName",
           pm.barcode,
           ns.name AS "supplierName"
         FROM offer_service_approvals osa
         JOIN supplier_product_offers spo ON spo.id = osa.offer_id
         JOIN product_masters pm ON pm.id = spo.master_id
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         ${where}
         ORDER BY osa.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
    ]);

    const total = countResult[0]?.total || 0;

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Operator: 상태별 카운트
   */
  async getStats(): Promise<{ pending: number; approved: number; rejected: number; total: number }> {
    const rows = await this.dataSource.query(
      `SELECT approval_status AS status, COUNT(*)::int AS cnt
       FROM offer_service_approvals
       GROUP BY approval_status`,
    );

    const stats = { pending: 0, approved: 0, rejected: 0, total: 0 };
    for (const r of rows) {
      const key = r.status as keyof typeof stats;
      if (key in stats) stats[key] = r.cnt;
      stats.total += r.cnt;
    }
    return stats;
  }

  /**
   * Operator: 승인
   */
  async approve(approvalId: string, decidedBy: string): Promise<{ success: boolean; error?: string }> {
    const rows = await this.dataSource.query(
      `SELECT id, approval_status FROM offer_service_approvals WHERE id = $1`,
      [approvalId],
    );
    if (!rows.length) return { success: false, error: 'APPROVAL_NOT_FOUND' };
    if (rows[0].approval_status !== 'pending') return { success: false, error: 'NOT_PENDING' };

    await this.dataSource.query(
      `UPDATE offer_service_approvals
       SET approval_status = 'approved', decided_by = $2, decided_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [approvalId, decidedBy],
    );
    logger.info(`[ServiceApproval] Approved ${approvalId} by ${decidedBy}`);
    return { success: true };
  }

  /**
   * Operator: 거절
   */
  async reject(approvalId: string, decidedBy: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const rows = await this.dataSource.query(
      `SELECT id, approval_status FROM offer_service_approvals WHERE id = $1`,
      [approvalId],
    );
    if (!rows.length) return { success: false, error: 'APPROVAL_NOT_FOUND' };
    if (rows[0].approval_status !== 'pending') return { success: false, error: 'NOT_PENDING' };

    await this.dataSource.query(
      `UPDATE offer_service_approvals
       SET approval_status = 'rejected', decided_by = $2, decided_at = NOW(), reason = $3, updated_at = NOW()
       WHERE id = $1`,
      [approvalId, decidedBy, reason || null],
    );
    logger.info(`[ServiceApproval] Rejected ${approvalId} by ${decidedBy}`);
    return { success: true };
  }
}
