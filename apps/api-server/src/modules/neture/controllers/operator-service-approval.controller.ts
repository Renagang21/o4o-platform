/**
 * Operator Service Approval Controller
 *
 * WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
 * WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
 *
 * 서비스 레벨 상품 승인 관리 — Neture Operator 전용.
 *
 * GET  /service-approvals            — 페이지네이션 목록 (검색 + 기간 필터)
 * GET  /service-approvals/stats      — 상태별 카운트 + todayPending
 * GET  /approval-analytics           — 승인율 + 반려 사유 TOP + 평균 처리 시간
 * PATCH /service-approvals/:id/approve
 * PATCH /service-approvals/:id/reject  — body: { reason? }
 * POST /service-approvals/batch-approve — body: { ids }
 * POST /service-approvals/batch-reject  — body: { ids, reason? }
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { OfferServiceApprovalService } from '../services/offer-service-approval.service.js';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

export function createOperatorServiceApprovalController(dataSource: DataSource): Router {
  const router = Router();
  const approvalService = new OfferServiceApprovalService(dataSource);

  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /service-approvals
   * WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1: search, dateFrom, dateTo 추가
   */
  router.get('/service-approvals', async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, serviceKey, search, dateFrom, dateTo, page, limit } = req.query;
      const result = await approvalService.listApprovals({
        status: status as string | undefined,
        serviceKey: serviceKey as string | undefined,
        search: search as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[OperatorServiceApproval] Error listing approvals:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /service-approvals/stats
   */
  router.get('/service-approvals/stats', async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = await approvalService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('[OperatorServiceApproval] Error fetching stats:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /approval-analytics
   * WO-NETURE-APPROVAL-ANALYTICS-LITE-V1 + ENHANCEMENT-V1
   * Query: ?period=all|7d|30d (default: all)
   */
  router.get('/approval-analytics', async (req: Request, res: Response): Promise<void> => {
    try {
      const period = (req.query.period as string) || 'all';
      const periodClause =
        period === '7d'
          ? `AND osa.created_at >= NOW() - INTERVAL '7 days'`
          : period === '30d'
            ? `AND osa.created_at >= NOW() - INTERVAL '30 days'`
            : '';

      const [summaryRows, reasonRows, avgTimeRows, supplierRows] = await Promise.all([
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE osa.approval_status = 'approved')::int AS approved,
            COUNT(*) FILTER (WHERE osa.approval_status = 'rejected')::int AS rejected,
            COUNT(*) FILTER (WHERE osa.approval_status = 'pending')::int AS pending
          FROM offer_service_approvals osa
          WHERE osa.service_key = 'neture' ${periodClause}
        `),
        dataSource.query(`
          SELECT osa.reason, COUNT(*)::int AS count
          FROM offer_service_approvals osa
          WHERE osa.service_key = 'neture'
            AND osa.approval_status = 'rejected'
            AND osa.reason IS NOT NULL AND osa.reason != ''
            ${periodClause}
          GROUP BY osa.reason
          ORDER BY count DESC
          LIMIT 5
        `),
        dataSource.query(`
          SELECT ROUND(AVG(EXTRACT(EPOCH FROM (osa.decided_at - osa.created_at)) / 3600)::numeric, 1) AS avg_hours
          FROM offer_service_approvals osa
          WHERE osa.service_key = 'neture' AND osa.decided_at IS NOT NULL ${periodClause}
        `),
        dataSource.query(`
          SELECT
            spo.supplier_id AS "supplierId",
            COALESCE(ns.company_name, 'Unknown') AS "supplierName",
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE osa.approval_status = 'approved')::int AS approved,
            ROUND(
              COUNT(*) FILTER (WHERE osa.approval_status = 'approved')::numeric
              / NULLIF(COUNT(*), 0) * 100, 1
            ) AS "approvalRate"
          FROM offer_service_approvals osa
          JOIN supplier_product_offers spo ON spo.id = osa.offer_id
          LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
          WHERE osa.service_key = 'neture' ${periodClause}
          GROUP BY spo.supplier_id, ns.company_name
          HAVING COUNT(*) >= 3
          ORDER BY "approvalRate" DESC
          LIMIT 10
        `),
      ]);

      const s = summaryRows[0] || { total: 0, approved: 0, rejected: 0, pending: 0 };
      const approvalRate = s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0;

      res.json({
        success: true,
        data: {
          summary: { ...s, approvalRate },
          topRejectionReasons: reasonRows,
          avgProcessingTimeHours: parseFloat(avgTimeRows[0]?.avg_hours) || 0,
          supplierApprovalRates: supplierRows.map((r: any) => ({
            supplierId: r.supplierId,
            supplierName: r.supplierName,
            approvalRate: parseFloat(r.approvalRate) || 0,
            total: r.total,
          })),
        },
      });
    } catch (error) {
      logger.error('[OperatorServiceApproval] Error fetching analytics:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * PATCH /service-approvals/:id/approve
   */
  router.patch('/service-approvals/:id/approve', async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }
      const { id } = req.params;
      const { reason } = req.body || {};
      const result = await approvalService.approve(id, userId, reason);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      logger.error('[OperatorServiceApproval] Error approving:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * PATCH /service-approvals/:id/reject
   */
  router.patch('/service-approvals/:id/reject', async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }
      const { id } = req.params;
      const { reason } = req.body || {};
      const result = await approvalService.reject(id, userId, reason);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      logger.error('[OperatorServiceApproval] Error rejecting:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /service-approvals/batch-approve
   * WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
   */
  router.post('/service-approvals/batch-approve', async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }
      const { ids, reason } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, error: 'IDS_REQUIRED' });
        return;
      }
      const result = await approvalService.batchApprove(ids, userId, reason);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[OperatorServiceApproval] Error batch approving:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /service-approvals/batch-reject
   * WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
   */
  router.post('/service-approvals/batch-reject', async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }
      const { ids, reason } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, error: 'IDS_REQUIRED' });
        return;
      }
      const result = await approvalService.batchReject(ids, userId, reason);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[OperatorServiceApproval] Error batch rejecting:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
