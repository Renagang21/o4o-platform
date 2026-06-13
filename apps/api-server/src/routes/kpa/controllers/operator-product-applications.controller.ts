/**
 * Operator Product Applications Controller
 *
 * WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1
 * WO-PRODUCT-POLICY-V2-APPLICATION-DEPRECATION-V1: v2 product_approvals 전환
 * WO-NETURE-TIER2-SERVICE-USABILITY-BETA-V1: approve/reject 복원 (v2 service 호출)
 * WO-KPA-OPERATOR-PRODUCT-APPLICATION-DELETE-V1: 이력 삭제 기능 추가
 *
 * Operator 전용 — 상품 승인 조회 + 승인/거절 (v2: product_approvals)
 *
 * GET    /                — 전체 승인 목록 (필터: status)
 * GET    /stats           — 상태별 통계
 * PATCH  /:id/approve     — SERVICE 승인 처리 (v2 service)
 * PATCH  /:id/reject      — SERVICE 거절 처리 (v2 service)
 * DELETE /:id             — 이력 삭제 (product_approvals record만, listing 유지)
 * POST   /batch-approve   — 일괄 승인 (V3)
 * POST   /batch-reject    — 일괄 거절 (V3)
 * POST   /batch-delete    — 일괄 삭제 (V3)
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
  // WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1:
  //   direct SQL approve 제거 → ProductApprovalV2Service.approveServiceProduct() 흡수.
  //   activateListing=true → 승인 대상 org 단건 OPL 활성(Option A, per-store). SAVEPOINT FK 가드는 service 내부.
  //   (이전: offer+serviceKey OPL 일괄 활성 = Option B → 단건으로 축소. 각 org 는 각자 approval 승인 시 활성.)
  router.patch('/:id/approve', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const approvedBy = (req as any).user?.id || 'unknown';

    const result = await approvalV2Service.approveServiceProduct(id, approvedBy, { activateListing: true });
    if (!result.success) {
      const status = result.error === 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: { code: result.error, message: result.error },
      });
    }

    const { approval, listing } = result.data!;
    logger.info(`[OperatorProductApplications] KPA 2차 심사 승인: ${id} by ${approvedBy}, org=${approval.organization_id}, listingActive=${listing?.is_active === true}`);
    actionLogService?.logSuccess('kpa-society', approvedBy, 'kpa.operator.product_approve', {
      meta: { targetId: id, statusBefore: 'pending', statusAfter: 'approved' },
    }).catch(() => {});
    res.json({
      success: true,
      data: {
        approvalId: id,
        offerId: approval.offer_id,
        organizationId: approval.organization_id,
        listingActivated: listing?.is_active === true,
      },
    });
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

    // WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1: direct SQL → V2 service (activateListing, Option A 단건).
    for (const id of ids) {
      try {
        const result = await approvalV2Service.approveServiceProduct(id, approvedBy, { activateListing: true });
        if (!result.success) {
          results.push({ id, status: 'skipped', error: result.error || 'Not found or not pending' });
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

  // ─── DELETE /:id — 이력 삭제 ──────────────────────────────────────────────
  // WO-KPA-OPERATOR-PRODUCT-APPLICATION-DELETE-V1
  // product_approvals record만 삭제. organization_product_listings/상품/공급사 데이터 보존.
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedBy = (req as any).user?.id || 'unknown';

    const [existing] = await dataSource.query(
      `SELECT id, approval_status FROM product_approvals WHERE id = $1`,
      [id],
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: '신청 이력을 찾을 수 없습니다.', code: 'NOT_FOUND' });
    }

    await dataSource.query(
      `DELETE FROM product_approvals WHERE id = $1`,
      [id],
    );

    actionLogService?.logSuccess('kpa-society', deletedBy, 'kpa.operator.product_application_delete', {
      meta: { targetId: id, statusDeleted: existing.approval_status },
    }).catch(() => {});

    return res.json({ success: true, data: { id, deleted: true } });
  }));

  // ─── POST /batch-delete — 일괄 삭제 ─────────────────────────────────────
  // WO-KPA-OPERATOR-PRODUCT-APPLICATION-DELETE-V1
  router.post('/batch-delete', asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids array is required' });
    }
    if (ids.length > 50) {
      return res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
    }

    const deletedBy = (req as any).user?.id || 'unknown';
    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];

    for (const id of ids) {
      try {
        const [existing] = await dataSource.query(
          `SELECT id FROM product_approvals WHERE id = $1`,
          [id],
        );
        if (!existing) {
          results.push({ id, status: 'skipped', error: 'Not found' });
          continue;
        }
        await dataSource.query(`DELETE FROM product_approvals WHERE id = $1`, [id]);
        actionLogService?.logSuccess('kpa-society', deletedBy, 'kpa.operator.product_application_batch_delete', {
          meta: { targetId: id },
        }).catch(() => {});
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }

    return res.json({ success: true, data: { results } });
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
