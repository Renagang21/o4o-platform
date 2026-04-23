/**
 * Operator Product Applications Controller
 *
 * WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1
 * WO-PRODUCT-POLICY-V2-APPLICATION-DEPRECATION-V1: v2 product_approvals 전환
 * WO-NETURE-TIER2-SERVICE-USABILITY-BETA-V1: approve/reject 복원 (v2 service 호출)
 *
 * Operator 전용 — 상품 승인 조회 + 승인/거절 (v2: product_approvals)
 *
 * GET   /                — 전체 승인 목록 (필터: status)
 * GET   /stats           — 상태별 통계
 * PATCH /:id/approve     — SERVICE 승인 처리 (v2 service)
 * PATCH /:id/reject      — SERVICE 거절 처리 (v2 service)
 * POST  /batch-approve   — 일괄 승인 (V3)
 * POST  /batch-reject    — 일괄 거절 (V3)
 *
 * 권한: kpa:admin 또는 kpa:operator
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { ProductApprovalV2Service } from '../../../modules/product-policy-v2/product-approval-v2.service.js';
import type { ActionLogService } from '@o4o/action-log-core';
import logger from '../../../utils/logger.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

export function createOperatorProductApplicationsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware,
  actionLogService?: ActionLogService,
): Router {
  const router = Router();
  const approvalV2Service = new ProductApprovalV2Service(dataSource);

  // All routes require kpa:operator scope
  router.use(requireAuth, requireScope('kpa:operator'));

  // ─── GET / — 전체 승인 목록 (v2: product_approvals) ─────────────────
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const hasStatus = status && ['pending', 'approved', 'rejected'].includes(status);
    const statusFilter = hasStatus ? `WHERE pa.approval_status = $1` : '';
    const baseParams: any[] = hasStatus ? [status] : [];

    const countResult = await dataSource.query(
      `SELECT COUNT(*)::int AS total FROM product_approvals pa ${statusFilter}`,
      baseParams,
    );
    const total = countResult[0]?.total || 0;

    const limitIdx = baseParams.length + 1;
    const offsetIdx = baseParams.length + 2;
    const data = await dataSource.query(
      `SELECT pa.id, pa.organization_id, pa.service_key,
              pa.offer_id,
              pm.name AS product_name,
              pa.metadata AS product_metadata,
              pa.approval_status AS status,
              pa.reason AS reject_reason,
              pa.requested_by,
              pa.created_at AS requested_at,
              pa.decided_by AS reviewed_by,
              pa.decided_at AS reviewed_at,
              pa.created_at, pa.updated_at,
              pa.approval_type,
              supplier_org.name AS supplier_name,
              spo.price_general AS "priceGeneral",
              spo.price_gold AS "priceGold",
              spo.consumer_reference_price AS "consumerReferencePrice"
       FROM product_approvals pa
       LEFT JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       LEFT JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
       ${statusFilter}
       ORDER BY pa.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...baseParams, limit, (page - 1) * limit],
    );

    // 조직명 조인 (organizations 테이블 — lightweight)
    const orgIds = [...new Set(data.map((d: any) => d.organization_id))];
    let orgMap: Record<string, string> = {};
    if (orgIds.length > 0) {
      const orgs = await dataSource.query(
        `SELECT id, name FROM organizations WHERE id = ANY($1::uuid[])`,
        [orgIds],
      );
      for (const o of orgs) {
        orgMap[o.id] = o.name;
      }
    }

    const enriched = data.map((app: any) => ({
      ...app,
      organizationName: orgMap[app.organization_id] || null,
      supplierName: app.supplier_name || null,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }));

  // ─── GET /stats — 상태별 통계 (v2: product_approvals) ────────────────
  router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
    const rows = await dataSource.query(
      `SELECT approval_status AS status, COUNT(*)::int AS count
       FROM product_approvals
       GROUP BY approval_status`,
    );

    const stats: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const row of rows) {
      stats[row.status] = row.count;
    }

    res.json({ success: true, data: stats });
  }));

  // ─── PATCH /:id/approve — SERVICE 승인 처리 (KPA 2차 심사) ──────────────
  // WO-KPA-SOCIETY-SECOND-REVIEW-BRIDGE-FOUNDATION-V1
  // WO-KPA-PRODUCT-APPROVAL-LISTING-UPSERT-FIX-V1:
  //   승인 대상 org의 listing이 없는 경우에도 반드시 생성+활성화 (UPSERT).
  //   auto-expansion이 선행되지 않은 약국(pending enrollment 등)에서도 정상 동작 보장.
  router.patch('/:id/approve', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const approvedBy = (req as any).user?.id || 'unknown';

    const result = await dataSource.transaction(async (manager) => {
      // 1. product_approvals PENDING 확인 (organization_id 포함 조회)
      const [approval] = await manager.query(
        `SELECT id, offer_id, organization_id, service_key, approval_status
         FROM product_approvals WHERE id = $1`,
        [id],
      );
      if (!approval || approval.approval_status !== 'pending') {
        return { success: false, error: 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' };
      }

      // 2. product_approvals 상태 업데이트
      await manager.query(
        `UPDATE product_approvals SET approval_status = 'approved', decided_by = $2::uuid, decided_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND approval_status = 'pending'`,
        [id, approvedBy],
      );

      // 3. 승인 대상 org의 listing UPSERT (없으면 생성, 있으면 활성화)
      //    SAVEPOINT 사용: bridge 승인(대한약사회 등)의 경우 organization FK 제약 위반 가능 → 안전 처리
      const serviceKey = approval.service_key || 'kpa-society';
      let listingUpserted = false;
      await manager.query('SAVEPOINT upsert_listing');
      try {
        await manager.query(
          `INSERT INTO organization_product_listings
             (id, organization_id, service_key, master_id, offer_id, is_active, created_at, updated_at)
           SELECT gen_random_uuid(), $2, $3, spo.master_id, spo.id, true, NOW(), NOW()
           FROM supplier_product_offers spo
           WHERE spo.id = $1
           ON CONFLICT (organization_id, service_key, offer_id)
           DO UPDATE SET is_active = true, updated_at = NOW()`,
          [approval.offer_id, approval.organization_id, serviceKey],
        );
        await manager.query('RELEASE SAVEPOINT upsert_listing');
        listingUpserted = true;
      } catch (upsertErr: any) {
        await manager.query('ROLLBACK TO SAVEPOINT upsert_listing');
        logger.warn(`[OperatorProductApplications] listing upsert failed for org=${approval.organization_id}, offer=${approval.offer_id}: ${upsertErr?.message || upsertErr}`);
      }

      // 4. 해당 offer의 kpa-society listings 전체 활성화 (auto-expansion으로 미리 생성된 다른 org listing 포함)
      const listingResult = await manager.query(
        `UPDATE organization_product_listings SET is_active = true, updated_at = NOW()
         WHERE offer_id = $1 AND service_key = $2`,
        [approval.offer_id, serviceKey],
      );

      return {
        success: true,
        data: {
          approvalId: id,
          offerId: approval.offer_id,
          organizationId: approval.organization_id,
          activatedListings: listingResult[1] || 0,
          listingUpserted,
        },
      };
    });

    if (!result.success) {
      const status = result.error === 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: { code: result.error, message: result.error },
      });
    }

    logger.info(`[OperatorProductApplications] KPA 2차 심사 승인: ${id} by ${approvedBy}, org=${(result.data as any)?.organizationId}, activated=${(result.data as any)?.activatedListings}, upserted=${(result.data as any)?.listingUpserted}`);
    actionLogService?.logSuccess('kpa-society', approvedBy, 'kpa.operator.product_approve', {
      meta: { targetId: id, statusBefore: 'pending', statusAfter: 'approved' },
    }).catch(() => {});
    res.json({ success: true, data: result.data });
  }));

  // ─── PATCH /:id/reject — SERVICE 거절 처리 (v2 service) ───────────────
  router.patch('/:id/reject', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const rejectedBy = (req as any).user?.id || 'unknown';
    const { reason } = req.body || {};

    const result = await approvalV2Service.rejectServiceApproval(id, rejectedBy, reason);
    if (!result.success) {
      const status = result.error === 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: { code: result.error, message: result.error },
      });
    }

    logger.info(`[OperatorProductApplications] SERVICE approval rejected: ${id} by ${rejectedBy}`);
    actionLogService?.logSuccess('kpa-society', rejectedBy, 'kpa.operator.product_reject', {
      meta: { targetId: id, reason, statusBefore: 'pending', statusAfter: 'rejected' },
    }).catch(() => {});
    res.json({ success: true, data: result.data });
  }));

  // ─── V3 Batch Endpoints — WO-O4O-TABLE-STANDARD-V3-EXPANSION ───

  /** POST /batch-approve — 일괄 승인 */
  router.post('/batch-approve', asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const approvedBy = (req as any).user?.id || 'unknown';
    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];

    for (const id of ids) {
      try {
        const result = await dataSource.transaction(async (manager) => {
          const [approval] = await manager.query(
            `SELECT id, offer_id, organization_id, service_key, approval_status
             FROM product_approvals WHERE id = $1`,
            [id],
          );
          if (!approval || approval.approval_status !== 'pending') {
            return { skip: true, error: !approval ? 'Not found' : 'Already processed' };
          }

          await manager.query(
            `UPDATE product_approvals SET approval_status = 'approved', decided_by = $2::uuid, decided_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND approval_status = 'pending'`,
            [id, approvedBy],
          );

          const serviceKey = approval.service_key || 'kpa-society';
          await manager.query('SAVEPOINT upsert_listing');
          try {
            await manager.query(
              `INSERT INTO organization_product_listings
                 (id, organization_id, service_key, master_id, offer_id, is_active, created_at, updated_at)
               SELECT gen_random_uuid(), $2, $3, spo.master_id, spo.id, true, NOW(), NOW()
               FROM supplier_product_offers spo
               WHERE spo.id = $1
               ON CONFLICT (organization_id, service_key, offer_id)
               DO UPDATE SET is_active = true, updated_at = NOW()`,
              [approval.offer_id, approval.organization_id, serviceKey],
            );
            await manager.query('RELEASE SAVEPOINT upsert_listing');
          } catch {
            await manager.query('ROLLBACK TO SAVEPOINT upsert_listing');
          }

          await manager.query(
            `UPDATE organization_product_listings SET is_active = true, updated_at = NOW()
             WHERE offer_id = $1 AND service_key = $2`,
            [approval.offer_id, serviceKey],
          );

          return { skip: false };
        });

        if (result.skip) {
          results.push({ id, status: 'skipped', error: result.error });
        } else {
          actionLogService?.logSuccess('kpa-society', approvedBy, 'kpa.operator.product_batch_approve', {
            meta: { targetId: id, statusBefore: 'pending', statusAfter: 'approved' },
          }).catch(() => {});
          results.push({ id, status: 'success' });
        }
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }

    res.json({ success: true, data: { results } });
  }));

  /** POST /batch-reject — 일괄 거절 */
  router.post('/batch-reject', asyncHandler(async (req: Request, res: Response) => {
    const { ids, reason } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const rejectedBy = (req as any).user?.id || 'unknown';
    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];

    for (const id of ids) {
      try {
        const result = await approvalV2Service.rejectServiceApproval(id, rejectedBy, reason);
        if (!result.success) {
          results.push({ id, status: 'skipped', error: result.error || 'Not found or not pending' });
        } else {
          actionLogService?.logSuccess('kpa-society', rejectedBy, 'kpa.operator.product_batch_reject', {
            meta: { targetId: id, reason, statusBefore: 'pending', statusAfter: 'rejected' },
          }).catch(() => {});
          results.push({ id, status: 'success' });
        }
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }

    res.json({ success: true, data: { results } });
  }));

  return router;
}
