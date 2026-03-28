/**
 * Operator Service Approval Controller
 *
 * WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
 * WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
 *
 * 서비스 레벨 상품 승인 관리 — Neture Operator 전용.
 *
 * GET  /service-approvals       — 페이지네이션 목록 (검색 + 기간 필터)
 * GET  /service-approvals/stats — 상태별 카운트 + todayPending
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
      const result = await approvalService.approve(id, userId);
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
      const { ids } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, error: 'IDS_REQUIRED' });
        return;
      }
      const result = await approvalService.batchApprove(ids, userId);
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
