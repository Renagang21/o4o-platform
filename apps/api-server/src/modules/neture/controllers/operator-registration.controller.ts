/**
 * OperatorRegistrationController
 * WO-O4O-NETURE-REGISTRATION-SYSTEM-FIX-V1
 * WO-O4O-NETURE-REGISTRATION-AUTH-GUARD-FIX-V1
 * WO-O4O-NETURE-REGISTRATION-LIST-NOT-SHOWING-V1
 *
 * 가입 신청 조회/승인/거부 API
 * Mounted at: /operator (→ /api/v1/neture/operator/registrations/*)
 *
 * Auth: requireAuth + requireRole (DB-based role_assignments 조회)
 * - JWT payload.roles 기반 체크 → role_assignments 실시간 DB 조회로 변경
 * - JWT 갱신 없이도 role_assignments 변경 즉시 반영
 */
import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import type { ActionLogService } from '@o4o/action-log-core';
import { requireAuth, requireRole } from '../../../middleware/auth.middleware.js';
import { OperatorRegistrationService } from '../services/operator-registration.service.js';
import logger from '../../../utils/logger.js';

/**
 * Operator/Admin role guard — DB-based (role_assignments 실시간 조회)
 * JWT 갱신 불요: role_assignments 테이블 변경 즉시 반영
 */
const requireOperatorOrAdmin = requireRole([
  'admin', 'super_admin', 'operator',
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
]);

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

export function createOperatorRegistrationController(dataSource: DataSource, actionLogService?: ActionLogService): Router {
  const router = Router();
  const registrationService = new OperatorRegistrationService(dataSource);

  /**
   * GET /operator/registrations
   * 가입 신청 목록 조회
   */
  router.get(
    '/registrations',
    requireAuth,
    requireOperatorOrAdmin,
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
    requireOperatorOrAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { userId } = req.params;
        const approvedBy = req.user?.id;
        if (!approvedBy) {
          res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
          return;
        }

        const result = await registrationService.approveRegistration(userId, approvedBy);
        actionLogService?.logSuccess('neture', approvedBy, 'neture.operator.registration_approve', {
          meta: { targetId: userId, statusBefore: 'pending', statusAfter: 'approved' },
        }).catch(() => {});
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
    requireOperatorOrAdmin,
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
        actionLogService?.logSuccess('neture', rejectedBy, 'neture.operator.registration_reject', {
          meta: { targetId: userId, reason, statusBefore: 'pending', statusAfter: 'rejected' },
        }).catch(() => {});
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
   * PATCH /operator/registrations/:userId/notes
   * 운영자 메모 저장
   */
  router.patch(
    '/registrations/:userId/notes',
    requireAuth,
    requireOperatorOrAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { userId } = req.params;
        const { notes } = req.body;
        const result = await registrationService.updateNotes(userId, notes);
        res.json({ success: true, data: result });
      } catch (error: any) {
        if (error?.message === 'REGISTRATION_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: 'REGISTRATION_NOT_FOUND',
            message: 'Registration not found',
          });
          return;
        }
        logger.error('[Operator] Error updating notes:', error);
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to update notes',
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
    requireOperatorOrAdmin,
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
