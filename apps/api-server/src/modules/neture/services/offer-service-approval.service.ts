/**
 * OfferServiceApprovalService — WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
 *
 * 서비스 레벨 상품 승인 관리.
 * offer_service_approvals 테이블 전용 (기존 product_approvals와 독립).
 *
 * WO-NETURE-APPROVAL-SYSTEM-NORMALIZATION-V1:
 * offer_service_approvals = SSOT. supplier_product_offers.approval_status는 파생 필드.
 * syncOfferFromServiceApprovals()가 모든 승인 상태 변경의 단일 경로.
 */

import type { DataSource, QueryRunner } from 'typeorm';
import { autoExpandPublicProduct } from '../../../utils/auto-listing.utils.js';
import logger from '../../../utils/logger.js';

/** DataSource 또는 QueryRunner 양쪽에서 query() 실행 가능 */
type QueryExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

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
           supplier_org.name AS "supplierName",
           pm.regulatory_type AS "regulatoryType",
           pm.mfds_permit_number AS "mfdsPermitNumber",
           pm.is_mfds_verified AS "isMfdsVerified",
           spo.approval_status AS "offerApprovalStatus",
           spo.distribution_type AS "distributionType",
           (
             CASE WHEN spo.price_general IS NOT NULL AND spo.price_general > 0 THEN 20 ELSE 0 END
             + CASE WHEN EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id) THEN 20 ELSE 0 END
             + CASE WHEN spo.consumer_short_description IS NOT NULL AND spo.consumer_short_description != '' THEN 20 ELSE 0 END
             + CASE WHEN spo.consumer_detail_description IS NOT NULL AND spo.consumer_detail_description != '' THEN 20 ELSE 0 END
             + CASE WHEN spo.distribution_type IS NOT NULL THEN 20 ELSE 0 END
           ) AS "completenessScore"
         FROM offer_service_approvals osa
         JOIN supplier_product_offers spo ON spo.id = osa.offer_id
         JOIN product_masters pm ON pm.id = spo.master_id
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
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

  // ==================== WO-NETURE-APPROVAL-SYSTEM-NORMALIZATION-V1 ====================

  /**
   * 파생 상태 동기화 — offer_service_approvals 기준으로 offer 상태 결정
   *
   * 파생 규칙 (WO-NETURE-APPROVAL-SYSTEM-FINALIZATION-V1):
   *   ANY approved → APPROVED (하나라도 승인되면 제품 활성화)
   *   ALL rejected → REJECTED
   *   some pending, none approved → PENDING
   *
   * 상태 전이 부작용:
   *   → APPROVED: is_active=true + PUBLIC이면 autoExpandPublicProduct()
   *   → REJECTED: product_approvals revoke + listings 비활성화
   */
  async syncOfferFromServiceApprovals(
    offerId: string,
    decidedBy: string,
    executor: QueryExecutor,
  ): Promise<{ previousStatus: string; derivedStatus: string; changed: boolean; autoListedCount: number }> {
    // 1. 현재 service approval 상태 조회
    const approvals: Array<{ approval_status: string }> = await executor.query(
      `SELECT approval_status FROM offer_service_approvals WHERE offer_id = $1`,
      [offerId],
    );

    if (!approvals.length) {
      return { previousStatus: 'PENDING', derivedStatus: 'PENDING', changed: false, autoListedCount: 0 };
    }

    // 2. 파생 규칙 적용 (WO-NETURE-APPROVAL-SYSTEM-FINALIZATION-V1)
    //   ANY approved → APPROVED (하나라도 승인되면 제품 활성화)
    //   ALL rejected → REJECTED
    //   some pending, none approved → PENDING
    const anyApproved = approvals.some(a => a.approval_status === 'approved');
    const hasPending = approvals.some(a => a.approval_status === 'pending');

    let derivedStatus: string;
    if (anyApproved) derivedStatus = 'APPROVED';
    else if (hasPending) derivedStatus = 'PENDING';
    else derivedStatus = 'REJECTED';

    // 3. 현재 offer 상태 조회
    const [offer]: Array<{ approval_status: string; is_active: boolean; distribution_type: string; master_id: string }> =
      await executor.query(
        `SELECT approval_status, is_active, distribution_type, master_id FROM supplier_product_offers WHERE id = $1`,
        [offerId],
      );
    if (!offer) {
      return { previousStatus: 'PENDING', derivedStatus, changed: false, autoListedCount: 0 };
    }

    const previousStatus = offer.approval_status;
    const changed = previousStatus !== derivedStatus;
    let autoListedCount = 0;

    if (!changed) {
      return { previousStatus, derivedStatus, changed: false, autoListedCount: 0 };
    }

    // 4. offer 파생 상태 업데이트
    if (derivedStatus === 'APPROVED') {
      // → APPROVED: is_active=true + auto-expand
      await executor.query(
        `UPDATE supplier_product_offers SET approval_status = 'APPROVED', is_active = true, updated_at = NOW() WHERE id = $1`,
        [offerId],
      );

      if (offer.distribution_type === 'PUBLIC') {
        autoListedCount = await autoExpandPublicProduct(executor, offerId, offer.master_id);
      }

      logger.info(`[ServiceApproval] Offer ${offerId} → APPROVED (derived) by ${decidedBy}, autoListed=${autoListedCount}`);
    } else if (derivedStatus === 'REJECTED') {
      // → REJECTED: offer 상태 + cascade (product_approvals revoke + listings 비활성화)
      await executor.query(
        `UPDATE supplier_product_offers SET approval_status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
        [offerId],
      );

      await executor.query(
        `UPDATE product_approvals
         SET approval_status = 'revoked', decided_by = $2::uuid, decided_at = NOW(),
             reason = 'Offer rejected (derived)', updated_at = NOW()
         WHERE offer_id = $1 AND approval_status = 'approved'`,
        [offerId, decidedBy],
      );

      await executor.query(
        `UPDATE organization_product_listings SET is_active = false, updated_at = NOW() WHERE offer_id = $1`,
        [offerId],
      );

      logger.info(`[ServiceApproval] Offer ${offerId} → REJECTED (derived) by ${decidedBy}, cascade applied`);
    } else {
      // → PENDING
      await executor.query(
        `UPDATE supplier_product_offers SET approval_status = 'PENDING', updated_at = NOW() WHERE id = $1`,
        [offerId],
      );
      logger.info(`[ServiceApproval] Offer ${offerId} → PENDING (derived) by ${decidedBy}`);
    }

    return { previousStatus, derivedStatus, changed, autoListedCount };
  }

  /**
   * Operator: 승인
   * WO-NETURE-APPROVAL-SYSTEM-NORMALIZATION-V1: 트랜잭션 + sync 추가
   */
  async approve(approvalId: string, decidedBy: string): Promise<{ success: boolean; error?: string; syncResult?: any }> {
    const rows = await this.dataSource.query(
      `SELECT id, offer_id, approval_status FROM offer_service_approvals WHERE id = $1`,
      [approvalId],
    );
    if (!rows.length) return { success: false, error: 'APPROVAL_NOT_FOUND' };
    if (rows[0].approval_status !== 'pending') return { success: false, error: 'NOT_PENDING' };

    const offerId = rows[0].offer_id;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE offer_service_approvals
         SET approval_status = 'approved', decided_by = $2, decided_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [approvalId, decidedBy],
      );

      const syncResult = await this.syncOfferFromServiceApprovals(offerId, decidedBy, queryRunner);
      await queryRunner.commitTransaction();

      logger.info(`[ServiceApproval] Approved ${approvalId} by ${decidedBy}, sync: ${syncResult.previousStatus}→${syncResult.derivedStatus}`);
      return { success: true, syncResult };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Operator: 거절
   * WO-NETURE-APPROVAL-SYSTEM-NORMALIZATION-V1: 트랜잭션 + sync 추가
   */
  async reject(approvalId: string, decidedBy: string, reason?: string): Promise<{ success: boolean; error?: string; syncResult?: any }> {
    const rows = await this.dataSource.query(
      `SELECT id, offer_id, approval_status FROM offer_service_approvals WHERE id = $1`,
      [approvalId],
    );
    if (!rows.length) return { success: false, error: 'APPROVAL_NOT_FOUND' };
    if (rows[0].approval_status !== 'pending') return { success: false, error: 'NOT_PENDING' };

    const offerId = rows[0].offer_id;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE offer_service_approvals
         SET approval_status = 'rejected', decided_by = $2, decided_at = NOW(), reason = $3, updated_at = NOW()
         WHERE id = $1`,
        [approvalId, decidedBy, reason || null],
      );

      const syncResult = await this.syncOfferFromServiceApprovals(offerId, decidedBy, queryRunner);
      await queryRunner.commitTransaction();

      logger.info(`[ServiceApproval] Rejected ${approvalId} by ${decidedBy}, sync: ${syncResult.previousStatus}→${syncResult.derivedStatus}`);
      return { success: true, syncResult };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
