/**
 * OperatorRegistrationController
 * WO-O4O-NETURE-REGISTRATION-SYSTEM-FIX-V1
 *
 * 가입 신청 조회/승인/거부 API
 * Mounted at: /operator (→ /api/v1/neture/operator/registrations/*)
 */
import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { OperatorRegistrationService } from '../services/operator-registration.service.js';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

export function createOperatorRegistrationController(dataSource: DataSource): Router {
  const router = Router();
  const registrationService = new OperatorRegistrationService(dataSource);

  /**
   * GET /operator/registrations
   * 가입 신청 목록 조회
   */
  router.get(
    '/registrations',
    requireAuth,
    requireNetureScope('neture:operator'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { status } = req.query;
        const rows = await registrationService.listRegistrations({
          status: status as string | undefined,
        });
        res.json({ success: true, data: rows });
      } catch (error) {
        logger.error('[Operator] Error fetching registrations:', error);
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch registrations',
        });
      }
    },
  );

  /**
   * POST /operator/registrations/:userId/approve
   * 가입 승인
   */
  router.post(
    '/registrations/:userId/approve',
    requireAuth,
    requireNetureScope('neture:operator'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { userId } = req.params;
        const approvedBy = req.user?.id;
        if (!approvedBy) {
          res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
          return;
        }

        const result = await registrationService.approveRegistration(userId, approvedBy);
        res.json({ success: true, data: result });
      } catch (error: any) {
        if (error?.message === 'REGISTRATION_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: 'REGISTRATION_NOT_FOUND',
            message: 'Registration not found or already processed',
          });
          return;
        }
        logger.error('[Operator] Error approving registration:', error);
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to approve registration',
        });
      }
    },
  );

  /**
   * POST /operator/registrations/:userId/reject
   * 가입 거부
   */
  router.post(
    '/registrations/:userId/reject',
    requireAuth,
    requireNetureScope('neture:operator'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { userId } = req.params;
        const rejectedBy = req.user?.id;
        if (!rejectedBy) {
          res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
          return;
        }

        const { reason } = req.body;
        const result = await registrationService.rejectRegistration(userId, rejectedBy, reason);
        res.json({ success: true, data: result });
      } catch (error: any) {
        if (error?.message === 'REGISTRATION_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: 'REGISTRATION_NOT_FOUND',
            message: 'Registration not found or already processed',
          });
          return;
        }
        logger.error('[Operator] Error rejecting registration:', error);
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to reject registration',
        });
      }
    },
  );

  /**
   * GET /operator/registrations/copilot
   * 가입 승인 Copilot — 우선순위별 분류
   * WO-O4O-NETURE-OPERATOR-COPILOT-REGISTRATION-V1
   */
  router.get(
    '/registrations/copilot',
    requireAuth,
    requireNetureScope('neture:operator'),
    async (_req: AuthenticatedRequest, res: Response) => {
      try {
        const data = await registrationService.getRegistrationCopilot();
        res.json({ success: true, data });
      } catch (error) {
        logger.error('[Operator] Error fetching registration copilot:', error);
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch registration copilot',
        });
      }
    },
  );

  return router;
}
