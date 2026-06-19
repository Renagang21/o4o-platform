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
import { autoExpandPublicProduct, autoExpandServiceProduct } from '../../../utils/auto-listing.utils.js';
import logger from '../../../utils/logger.js';

/** DataSource 또는 QueryRunner 양쪽에서 query() 실행 가능 */
type QueryExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

export class OfferServiceApprovalService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 상품 생성 시 pending 승인 자동 생성 (idempotent)
   *
   * WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1:
   * 실제 INSERT된 service_key 목록을 반환 (ON CONFLICT로 skip된 것 제외).
   * submitForApproval이 이 값으로 "정말 새로 요청된 행"과 "이미 존재해서 skip된 행"을 구분한다.
   *
   * WO-O4O-NETURE-PRODUCT-APPROVAL-RESUBMIT-AFTER-REJECT-FIX-V1:
   * 기존 (offer_id, service_key) UNIQUE 제약 + ON CONFLICT DO NOTHING 구조에서는
   * 반려(rejected)된 행이 남아 있어 공급자가 제품을 보완한 뒤 재요청해도 신규 pending이
   * 생성되지 않고 silent skip 되었다(ALREADY_REQUESTED_OR_DECIDED).
   * → 충돌 행이 'rejected' 인 경우에만 pending 으로 되돌린다(reason/decided_* 초기화).
   *   pending/approved 행은 WHERE 가드로 그대로 두어 중복 요청/승인 취소를 막는다.
   *   판매 가능 상태는 운영자 approved 이후에만 가능하므로 listings 재활성화는 하지 않는다.
   *   xmax = 0 → 신규 INSERT, 그 외 → rejected 에서 reset 된 재요청(resubmit) 행.
   */
  async createPendingApprovals(
    offerId: string,
    serviceKeys: string[],
    executor: QueryExecutor = this.dataSource,
  ): Promise<{ insertedServiceKeys: string[]; resubmittedServiceKeys: string[] }> {
    if (!serviceKeys.length) return { insertedServiceKeys: [], resubmittedServiceKeys: [] };

    const values = serviceKeys
      .map((_, i) => `($1, $${i + 2}, 'pending', NOW(), NOW())`)
      .join(', ');

    // WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1:
    //   재심사 대상에 'cancelled'(공급자 철회) 추가 — 철회한 서비스를 재추가하면 pending 재심사.
    //   자동 approved 복구 금지(반드시 pending). pending/approved 행은 WHERE 가드로 보존.
    const rows: Array<{ service_key: string; inserted: boolean }> = await executor.query(
      `INSERT INTO offer_service_approvals (offer_id, service_key, approval_status, created_at, updated_at)
       VALUES ${values}
       ON CONFLICT (offer_id, service_key) DO UPDATE SET
         approval_status = 'pending',
         reason = NULL,
         decided_by = NULL,
         decided_at = NULL,
         updated_at = NOW()
       WHERE offer_service_approvals.approval_status IN ('rejected', 'cancelled')
       RETURNING service_key, (xmax = 0) AS inserted`,
      [offerId, ...serviceKeys],
    );

    return {
      insertedServiceKeys: rows.filter((r) => r.inserted).map((r) => r.service_key),
      resubmittedServiceKeys: rows.filter((r) => !r.inserted).map((r) => r.service_key),
    };
  }

  /**
   * WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1:
   * SERVICE 대상 제거(공급자 철회) — approval row를 'cancelled' 로 전환(삭제 금지) +
   * 해당 serviceKey 의 listing 비활성(삭제 금지). catalog 게이트는 approved 만 통과하므로 cancelled 는 자연 노출 제외.
   * decided_by 는 운영자 FK 의미이므로 변경하지 않는다(공급자 actor 필드 부재) — reason/decided_at 만 기록.
   */
  async cancelServiceApprovals(
    offerId: string,
    serviceKeys: string[],
    executor: QueryExecutor,
    reason = '공급자가 해당 서비스 공급을 철회했습니다.',
  ): Promise<{ cancelledServiceKeys: string[]; deactivatedListings: number }> {
    if (!serviceKeys.length) return { cancelledServiceKeys: [], deactivatedListings: 0 };

    const cancelled: Array<{ service_key: string }> = await executor.query(
      `UPDATE offer_service_approvals
       SET approval_status = 'cancelled', reason = $3, decided_at = NOW(), updated_at = NOW()
       WHERE offer_id = $1 AND service_key = ANY($2::text[])
         AND approval_status IN ('pending', 'approved', 'rejected')
       RETURNING service_key`,
      [offerId, serviceKeys, reason],
    );

    // 해당 serviceKey listing 비활성(삭제 금지) — 노출/판매 채널 중단
    const listingResult = await executor.query(
      `UPDATE organization_product_listings
       SET is_active = false, updated_at = NOW()
       WHERE offer_id = $1 AND service_key = ANY($2::text[]) AND is_active = true`,
      [offerId, serviceKeys],
    );
    const deactivatedListings = Array.isArray(listingResult)
      ? listingResult.length
      : (listingResult as { rowCount?: number })?.rowCount ?? 0;

    logger.info(`[ServiceApproval] cancelServiceApprovals offer ${offerId}: cancelled=[${cancelled.map(r => r.service_key).join(',')}], listingsDeactivated=${deactivatedListings}`);
    return { cancelledServiceKeys: cancelled.map((r) => r.service_key), deactivatedListings };
  }

  /**
   * Operator: 승인 목록 (페이지네이션 + 필터 + 검색 + 기간)
   * WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
   */
  async listApprovals(options: {
    status?: string;
    serviceKey?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    minScore?: number;
    maxScore?: number;
    hasIssues?: string;
    priority?: string; // WO-O4O-NETURE-APPROVAL-UI-INSIGHT-INTEGRATION-V1
  }): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const { status, serviceKey, search, dateFrom, dateTo, page = 1, limit = 50 } = options;
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
    if (search) {
      const like = `%${search}%`;
      conditions.push(`(pm.name ILIKE $${idx} OR pm.regulatory_name ILIKE $${idx} OR pm.barcode ILIKE $${idx} OR supplier_org.name ILIKE $${idx})`);
      params.push(like);
      idx++;
    }
    if (dateFrom) {
      conditions.push(`osa.created_at >= $${idx}`);
      params.push(dateFrom);
      idx++;
    }
    if (dateTo) {
      conditions.push(`osa.created_at < ($${idx}::date + INTERVAL '1 day')`);
      params.push(dateTo);
      idx++;
    }

    // WO-O4O-NETURE-OPERATOR-APPROVAL-UX-ADVANCED-V1: quality filters
    const completenessExpr = `(
      CASE WHEN spo.price_general IS NOT NULL AND spo.price_general > 0 THEN 20 ELSE 0 END
      + CASE WHEN EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id) THEN 20 ELSE 0 END
      + CASE WHEN spo.consumer_short_description IS NOT NULL AND spo.consumer_short_description != '' THEN 20 ELSE 0 END
      + CASE WHEN spo.consumer_detail_description IS NOT NULL AND spo.consumer_detail_description != '' THEN 20 ELSE 0 END
      + CASE WHEN spo.distribution_type IS NOT NULL THEN 20 ELSE 0 END
    )`;
    if (options.minScore != null && !isNaN(Number(options.minScore))) {
      conditions.push(`${completenessExpr} >= $${idx}`);
      params.push(Number(options.minScore));
      idx++;
    }
    if (options.maxScore != null && !isNaN(Number(options.maxScore))) {
      conditions.push(`${completenessExpr} <= $${idx}`);
      params.push(Number(options.maxScore));
      idx++;
    }
    if (options.hasIssues === 'true') {
      conditions.push(`${completenessExpr} < 100`);
    }

    // WO-O4O-NETURE-APPROVAL-UI-INSIGHT-INTEGRATION-V1: priority filter
    const staleExpr = `(osa.created_at < NOW() - INTERVAL '2 days' AND osa.approval_status = 'pending')`;
    const lowQualityExpr = `(COALESCE(supplier_stats.approval_rate, 100) < 50 AND COALESCE(supplier_stats.total_count, 0) >= 5)`;
    if (options.priority === 'HIGH') {
      conditions.push(`${staleExpr} AND ${lowQualityExpr}`);
    } else if (options.priority === 'MEDIUM') {
      conditions.push(`${staleExpr}`);
      conditions.push(`NOT ${lowQualityExpr}`);
    } else if (options.priority === 'LOW') {
      conditions.push(`NOT ${staleExpr}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    // WO-O4O-NETURE-APPROVAL-UI-INSIGHT-INTEGRATION-V1: supplier stats subquery for priority
    const supplierStatsJoin = `LEFT JOIN (
      SELECT
        spo2.supplier_id,
        COUNT(*)::int AS total_count,
        ROUND(
          COUNT(*) FILTER (WHERE osa2.approval_status = 'approved')::numeric
          / NULLIF(COUNT(*), 0) * 100, 1
        ) AS approval_rate
      FROM offer_service_approvals osa2
      JOIN supplier_product_offers spo2 ON spo2.id = osa2.offer_id
      GROUP BY spo2.supplier_id
    ) supplier_stats ON supplier_stats.supplier_id = spo.supplier_id`;

    // COUNT needs same JOINs because search references pm/supplier_org + supplier_stats for priority filter
    const countSql = `SELECT COUNT(*)::int AS total
      FROM offer_service_approvals osa
      JOIN supplier_product_offers spo ON spo.id = osa.offer_id
      JOIN product_masters pm ON pm.id = spo.master_id
      JOIN neture_suppliers ns ON ns.id = spo.supplier_id
      LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
      ${supplierStatsJoin}
      ${where}`;

    const [countResult, rows] = await Promise.all([
      this.dataSource.query(countSql, params),
      this.dataSource.query(
        `SELECT
           osa.id, osa.offer_id AS "offerId", osa.service_key AS "serviceKey",
           osa.approval_status AS "approvalStatus",
           osa.decided_by AS "decidedBy", osa.decided_at AS "decidedAt",
           osa.reason, osa.created_at AS "createdAt",
           COALESCE(pm.name, pm.regulatory_name, '') AS "productName",
           pm.barcode,
           supplier_org.name AS "supplierName",
           pm.regulatory_type AS "regulatoryType",
           pm.mfds_permit_number AS "mfdsPermitNumber",
           pm.is_mfds_verified AS "isMfdsVerified",
           spo.approval_status AS "offerApprovalStatus",
           spo.distribution_type AS "distributionType",
           spo.is_public AS "isPublic",
           spo.service_keys AS "serviceKeys",
           spo.allowed_seller_ids AS "allowedSellerIds",
           (
             CASE WHEN spo.price_general IS NOT NULL AND spo.price_general > 0 THEN 10 ELSE 0 END
             + CASE WHEN EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id) THEN 10 ELSE 0 END
             + CASE WHEN spo.consumer_short_description IS NOT NULL AND spo.consumer_short_description != '' THEN 10 ELSE 0 END
             + CASE WHEN spo.consumer_detail_description IS NOT NULL AND spo.consumer_detail_description != '' THEN 10 ELSE 0 END
             + CASE WHEN spo.distribution_type IS NOT NULL THEN 10 ELSE 0 END
             + CASE WHEN pm.category_id IS NOT NULL THEN 10 ELSE 0 END
             + CASE WHEN pm.brand_id IS NOT NULL THEN 10 ELSE 0 END
             + CASE WHEN pm.tags IS NOT NULL AND jsonb_array_length(pm.tags) > 0 THEN 10 ELSE 0 END
             + CASE WHEN spo.business_short_description IS NOT NULL AND spo.business_short_description != '' THEN 10 ELSE 0 END
             + CASE WHEN spo.business_detail_description IS NOT NULL AND spo.business_detail_description != '' THEN 10 ELSE 0 END
           ) AS "completenessScore",
           (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = pm.id AND pi.is_primary = true LIMIT 1) AS "imageUrl",
           pm.brand_name AS "brandName",
           spo.price_general AS "priceGeneral",
           (spo.consumer_short_description IS NOT NULL AND spo.consumer_short_description != '') AS "hasShortDescription",
           (spo.consumer_detail_description IS NOT NULL AND spo.consumer_detail_description != '') AS "hasDetailDescription",
           (SELECT COUNT(*)::int FROM product_images pi2 WHERE pi2.master_id = pm.id) AS "imageCount",
           (osa.created_at < NOW() - INTERVAL '2 days' AND osa.approval_status = 'pending') AS "isStale",
           (COALESCE(supplier_stats.approval_rate, 100) < 50 AND COALESCE(supplier_stats.total_count, 0) >= 5) AS "isLowQualitySupplier",
           CASE
             WHEN (osa.created_at < NOW() - INTERVAL '2 days' AND osa.approval_status = 'pending')
               AND (COALESCE(supplier_stats.approval_rate, 100) < 50 AND COALESCE(supplier_stats.total_count, 0) >= 5)
               THEN 'HIGH'
             WHEN (osa.created_at < NOW() - INTERVAL '2 days' AND osa.approval_status = 'pending')
               THEN 'MEDIUM'
             ELSE 'LOW'
           END AS "priority"
         FROM offer_service_approvals osa
         JOIN supplier_product_offers spo ON spo.id = osa.offer_id
         JOIN product_masters pm ON pm.id = spo.master_id
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
         ${supplierStatsJoin}
         ${where}
         ORDER BY
           CASE
             WHEN (osa.created_at < NOW() - INTERVAL '2 days' AND osa.approval_status = 'pending')
               AND (COALESCE(supplier_stats.approval_rate, 100) < 50 AND COALESCE(supplier_stats.total_count, 0) >= 5)
               THEN 1
             WHEN (osa.created_at < NOW() - INTERVAL '2 days' AND osa.approval_status = 'pending')
               THEN 2
             ELSE 3
           END ASC,
           osa.created_at ASC
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
   * Operator: 상태별 카운트 + 오늘 신규 pending
   * WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
   */
  async getStats(): Promise<{ pending: number; approved: number; rejected: number; total: number; todayPending: number }> {
    const [rows, todayRow] = await Promise.all([
      this.dataSource.query(
        `SELECT approval_status AS status, COUNT(*)::int AS cnt
         FROM offer_service_approvals
         GROUP BY approval_status`,
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt
         FROM offer_service_approvals
         WHERE approval_status = 'pending' AND created_at >= CURRENT_DATE`,
      ),
    ]);

    const stats = { pending: 0, approved: 0, rejected: 0, total: 0, todayPending: todayRow[0]?.cnt || 0 };
    for (const r of rows) {
      const key = r.status as keyof typeof stats;
      if (key in stats && key !== 'todayPending') (stats as any)[key] = r.cnt;
      stats.total += r.cnt;
    }
    return stats;
  }

  // ==================== WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1 ====================

  /**
   * Operator: 일괄 승인
   */
  async batchApprove(ids: string[], decidedBy: string, reason?: string): Promise<{ approved: number; failed: number; errors: string[] }> {
    let approved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const result = await this.approve(id, decidedBy, reason);
      if (result.success) {
        approved++;
      } else {
        failed++;
        errors.push(`${id}: ${result.error}`);
      }
    }

    logger.info(`[ServiceApproval] batchApprove: ${approved} approved, ${failed} failed by ${decidedBy}`);
    return { approved, failed, errors };
  }

  /**
   * Operator: 일괄 거절
   */
  async batchReject(ids: string[], decidedBy: string, reason?: string): Promise<{ rejected: number; failed: number; errors: string[] }> {
    let rejected = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const result = await this.reject(id, decidedBy, reason);
      if (result.success) {
        rejected++;
      } else {
        failed++;
        errors.push(`${id}: ${result.error}`);
      }
    }

    logger.info(`[ServiceApproval] batchReject: ${rejected} rejected, ${failed} failed by ${decidedBy}`);
    return { rejected, failed, errors };
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
    const approvals: Array<{ approval_status: string; service_key: string }> = await executor.query(
      `SELECT approval_status, service_key FROM offer_service_approvals WHERE offer_id = $1`,
      [offerId],
    );

    if (!approvals.length) {
      return { previousStatus: 'PENDING', derivedStatus: 'PENDING', changed: false, autoListedCount: 0 };
    }

    // 2. 파생 규칙 적용 (WO-NETURE-APPROVAL-SYSTEM-FINALIZATION-V1)
    //   ANY approved → APPROVED (하나라도 승인되면 제품 활성화)
    //   ALL rejected → REJECTED
    //   some pending, none approved → PENDING
    // WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1:
    //   'cancelled'(공급자 철회) 행은 파생에서 제외. 모든 행이 cancelled 면 상태를 변경하지 않는다
    //   (REJECTED 오판 + 전체 listing 비활성 cascade 방지). 노출은 catalog 게이트(approved만)에서 자연 제외.
    const active = approvals.filter(a => a.approval_status !== 'cancelled');
    const anyApproved = active.some(a => a.approval_status === 'approved');
    const hasPending = active.some(a => a.approval_status === 'pending');

    // 3. 현재 offer 상태 조회
    const [offer]: Array<{ approval_status: string; is_active: boolean; distribution_type: string; master_id: string }> =
      await executor.query(
        `SELECT approval_status, is_active, distribution_type, master_id FROM supplier_product_offers WHERE id = $1`,
        [offerId],
      );
    if (!offer) {
      return { previousStatus: 'PENDING', derivedStatus: 'PENDING', changed: false, autoListedCount: 0 };
    }

    let derivedStatus: string;
    if (anyApproved) derivedStatus = 'APPROVED';
    else if (hasPending) derivedStatus = 'PENDING';
    else if (active.length === 0) derivedStatus = offer.approval_status; // 전부 cancelled → 변경 없음
    else derivedStatus = 'REJECTED';

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
      } else if (offer.distribution_type === 'SERVICE') {
        // WO-NETURE-SERVICE-DISTRIBUTION-AUTO-EXPAND-V1
        const approvedKeys = approvals
          .filter(a => a.approval_status === 'approved')
          .map(a => a.service_key);
        autoListedCount = await autoExpandServiceProduct(executor, offerId, offer.master_id, approvedKeys);
      }

      // WO-KPA-SOCIETY-SECOND-REVIEW-BRIDGE-FOUNDATION-V1
      // kpa-society가 승인된 경우 → product_approvals PENDING row 생성 (KPA 2차 심사 큐)
      const kpaApproved = approvals.some(a => a.service_key === 'kpa-society' && a.approval_status === 'approved');
      if (kpaApproved) {
        await executor.query(
          `INSERT INTO product_approvals (offer_id, organization_id, service_key, approval_type, approval_status, requested_by, metadata)
           VALUES ($1, 'a0000000-0a00-4000-a000-000000000001', 'kpa-society', 'service', 'pending', $2, '{"source":"neture_bridge"}'::jsonb)
           ON CONFLICT (offer_id, organization_id, approval_type) DO NOTHING`,
          [offerId, decidedBy],
        );
        logger.info(`[ServiceApproval] Offer ${offerId} → KPA 2차 심사 큐 생성 (bridge)`);
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
  async approve(approvalId: string, decidedBy: string, reason?: string): Promise<{ success: boolean; error?: string; syncResult?: any }> {
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
         SET approval_status = 'approved', decided_by = $2, decided_at = NOW(), reason = $3, updated_at = NOW()
         WHERE id = $1`,
        [approvalId, decidedBy, reason || null],
      );

      const syncResult = await this.syncOfferFromServiceApprovals(offerId, decidedBy, queryRunner);
      await queryRunner.commitTransaction();

      logger.info(`[ServiceApproval] Approved ${approvalId} by ${decidedBy}, sync: ${syncResult.previousStatus}→${syncResult.derivedStatus}`);

      // WO-NETURE-APPROVAL-ACTION-UX-V1: fire-and-forget notification
      this.notifySupplier(offerId, 'approved', reason).catch(() => {});

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

      // WO-NETURE-APPROVAL-ACTION-UX-V1: fire-and-forget notification
      this.notifySupplier(offerId, 'rejected', reason).catch(() => {});

      return { success: true, syncResult };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * WO-NETURE-APPROVAL-ACTION-UX-V1: 공급자에게 승인/거절 알림 (fire-and-forget)
   */
  private async notifySupplier(offerId: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
    try {
      // offer → supplier → user
      const rows = await this.dataSource.query(
        `SELECT ns.user_id, COALESCE(pm.name, pm.regulatory_name, '') AS product_name
         FROM supplier_product_offers spo
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         JOIN product_masters pm ON pm.id = spo.master_id
         WHERE spo.id = $1`,
        [offerId],
      );
      if (!rows.length || !rows[0].user_id) return;

      const { user_id: userId, product_name: productName } = rows[0];
      const isApproved = status === 'approved';

      // WO-O4O-NETURE-PRODUCT-APPROVAL-REJECTION-COPY-AND-RESUBMIT-UX-V1:
      // 반려는 "끝"이 아니라 보완 후 재요청 가능함을 알림 문구에 명시한다(상태 체계 불변).
      const title = isApproved ? '상품 승인 완료' : '상품 승인 반려';
      let message: string;
      if (isApproved) {
        message = reason
          ? `[${productName}] 승인되었습니다. 사유: ${reason}`
          : `[${productName}] 승인되었습니다.`;
      } else {
        message = reason
          ? `[${productName}] 승인 요청이 반려되었습니다. 사유: ${reason} 제품 정보를 수정한 뒤 다시 승인 요청할 수 있습니다.`
          : `[${productName}] 승인 요청이 반려되었습니다. 사유를 확인하고 제품 정보를 보완한 뒤 다시 승인 요청할 수 있습니다.`;
      }

      // targetUrl: schema 변경 없이 metadata에 포함(공급자 제품 목록). 라우트 설계 영향 없음.
      const targetUrl = '/supplier/products';

      await this.dataSource.query(
        `INSERT INTO notifications (id, "userId", channel, type, title, message, metadata, "isRead", "createdAt")
         VALUES (gen_random_uuid(), $1, 'in_app', 'custom', $2, $3, $4, false, NOW())`,
        [userId, title, message, JSON.stringify({ offerId, status, productName, targetUrl })],
      );
    } catch (err) {
      logger.warn('[ServiceApproval] Failed to send notification', err);
    }
  }
}
