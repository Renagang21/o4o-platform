/**
 * OperatorPartnerController — 파트너 서비스 신청 승인 콘솔
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 *
 * operator-supplier.controller 의 파트너 대칭. 파트너 서비스 상태 단일 출처 = neture.neture_partners.
 *
 * Routes (mounted at /operator):
 *   GET  /operator/partners?status=      — 파트너 목록
 *   POST /operator/partners/:id/approve  — pending → active
 *   POST /operator/partners/:id/reject   — pending → rejected
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')  (CLAUDE.md §11)
 */
import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { ActionLogService } from '@o4o/action-log-core';
import { NeturePartnerServiceApplicationService } from '../services/neture-partner-service-application.service.js';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

export function createOperatorPartnerController(dataSource: DataSource): Router {
  const router = Router();
  const service = new NeturePartnerServiceApplicationService(dataSource);
  const actionLogService = new ActionLogService(dataSource);

  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  router.get('/partners', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await service.listPartners(status);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture Operator API] Error listing partners:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list partners' } });
    }
  });

  router.post('/partners/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const approvedBy = req.user?.id;
      if (!approvedBy) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

      const result = await service.approvePartner(id, approvedBy);
      if (!result.success) {
        const status = result.error === 'PARTNER_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }
      actionLogService
        .logSuccess('neture', approvedBy, 'neture.operator.partner_approve', { meta: { partnerId: id } })
        .catch(() => {});
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture Operator API] Error approving partner:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve partner' } });
    }
  });

  router.post('/partners/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const rejectedBy = req.user?.id;
      if (!rejectedBy) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

      const { reason } = req.body || {};
      const result = await service.rejectPartner(id, rejectedBy, typeof reason === 'string' ? reason : undefined);
      if (!result.success) {
        const status = result.error === 'PARTNER_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }
      actionLogService
        .logSuccess('neture', rejectedBy, 'neture.operator.partner_reject', { meta: { partnerId: id, reason } })
        .catch(() => {});
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture Operator API] Error rejecting partner:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject partner' } });
    }
  });

  return router;
}
