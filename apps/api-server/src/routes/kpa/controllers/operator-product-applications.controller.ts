/**
 * Operator Product Applications Controller
 *
 * WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1
 * WO-PRODUCT-POLICY-V2-APPLICATION-DEPRECATION-V1: v2 product_approvals 전환
 *
 * Operator 전용 — 상품 승인 조회 (v2: product_approvals)
 *
 * GET   /                — 전체 승인 목록 (필터: status)
 * GET   /stats           — 상태별 통계
 * PATCH /:id/approve     — 410 DEPRECATED (v2 API 사용)
 * PATCH /:id/reject      — 410 DEPRECATED (v2 API 사용)
 *
 * 권한: kpa:admin 또는 kpa:operator
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

export function createOperatorProductApplicationsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware,
): Router {
  const router = Router();

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
              pa.product_id,
              nsp.name AS product_name,
              pa.metadata AS product_metadata,
              pa.approval_status AS status,
              pa.reason AS reject_reason,
              pa.requested_by,
              pa.created_at AS requested_at,
              pa.decided_by AS reviewed_by,
              pa.decided_at AS reviewed_at,
              pa.created_at, pa.updated_at,
              pa.approval_type,
              ns.name AS supplier_name
       FROM product_approvals pa
       LEFT JOIN neture_supplier_products nsp ON nsp.id = pa.product_id
       LEFT JOIN neture_suppliers ns ON ns.id = nsp.supplier_id
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

  // ─── PATCH /:id/approve — 410 DEPRECATED ─────────────────────────────
  router.patch('/:id/approve', asyncHandler(async (_req: Request, res: Response) => {
    res.status(410).json({
      success: false,
      error: {
        code: 'ENDPOINT_DEPRECATED',
        message: 'Use v2 approval API: POST /api/v1/product-policy-v2/service-approval/:id/approve',
      },
    });
  }));

  // ─── PATCH /:id/reject — 410 DEPRECATED ──────────────────────────────
  router.patch('/:id/reject', asyncHandler(async (_req: Request, res: Response) => {
    res.status(410).json({
      success: false,
      error: {
        code: 'ENDPOINT_DEPRECATED',
        message: 'Use v2 approval API for rejection',
      },
    });
  }));

  return router;
}
