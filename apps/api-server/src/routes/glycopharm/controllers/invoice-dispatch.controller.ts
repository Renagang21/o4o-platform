/**
 * Invoice Dispatch Controller
 *
 * WO-O4O-INVOICE-DISPATCH-PHASE3E-CP1
 *
 * 인보이스 발송/수령 API.
 * - POST /invoices/:id/send — CONFIRMED 인보이스 이메일 발송
 * - POST /invoices/:id/received — 수령 확인 처리
 * - GET  /invoices/:id/dispatch-log — 발송 이력 조회
 *
 * 운영자/관리자 전용.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { InvoiceDispatchService } from '../services/invoice-dispatch.service.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../../../utils/role.utils.js';

type AuthMiddleware = RequestHandler;

function isOperatorOrAdmin(roles: string[] = [], userId: string = 'unknown'): boolean {
  const hasGlycopharmRole = hasAnyServiceRole(roles, [
    'glycopharm:admin',
    'glycopharm:operator',
    'platform:admin',
    'platform:super_admin',
  ]);
  if (hasGlycopharmRole) return true;

  const legacyRoles = ['admin', 'operator', 'administrator', 'super_admin'];
  const detectedLegacyRoles = roles.filter((r) => legacyRoles.includes(r));
  if (detectedLegacyRoles.length > 0) {
    detectedLegacyRoles.forEach((role) => {
      logLegacyRoleUsage(userId, role, 'glycopharm/invoice-dispatch.controller:isOperatorOrAdmin');
    });
    return false;
  }

  return false;
}

function checkAuth(req: Request, res: Response): string | null {
  const authReq = req as AuthRequest;
  const user = authReq.user;

  if (!user?.id) {
    res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
    return null;
  }

  if (!isOperatorOrAdmin(user.roles || [], user.id)) {
    res.status(403).json({ success: false, error: 'Operator or administrator role required', code: 'FORBIDDEN' });
    return null;
  }

  return user.id;
}

export function createInvoiceDispatchController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const dispatchService = new InvoiceDispatchService(dataSource);

  /**
   * POST /invoices/:id/send
   * CONFIRMED 인보이스를 이메일로 발송
   */
  router.post(
    '/invoices/:id/send',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = checkAuth(req, res);
        if (!userId) return;

        const { recipientEmail } = req.body;

        if (!recipientEmail || typeof recipientEmail !== 'string') {
          res.status(400).json({
            success: false,
            error: 'recipientEmail is required',
            code: 'MISSING_RECIPIENT',
          });
          return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
          res.status(400).json({
            success: false,
            error: 'Invalid email format',
            code: 'INVALID_EMAIL',
          });
          return;
        }

        const result = await dispatchService.sendInvoice({
          invoiceId: req.params.id,
          recipientEmail,
          sentBy: userId,
        });

        res.json({ success: true, data: result });
      } catch (error: any) {
        console.error('Failed to send invoice:', error);
        const status = error.message?.includes('not found') ? 404
          : error.message?.includes('Cannot send') ? 409
          : error.message?.includes('Email send failed') ? 502
          : 500;
        res.status(status).json({
          success: false,
          error: error.message,
          code: status === 404 ? 'NOT_FOUND'
            : status === 409 ? 'INVALID_STATUS'
            : status === 502 ? 'EMAIL_FAILED'
            : 'INTERNAL_ERROR',
        });
      }
    },
  );

  /**
   * POST /invoices/:id/received
   * 수령 확인 처리
   */
  router.post(
    '/invoices/:id/received',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = checkAuth(req, res);
        if (!userId) return;

        const result = await dispatchService.markInvoiceReceived(req.params.id, userId);
        res.json({ success: true, data: result });
      } catch (error: any) {
        console.error('Failed to mark invoice received:', error);
        const status = error.message?.includes('not found') ? 404
          : error.message?.includes('Cannot mark') ? 409
          : 500;
        res.status(status).json({
          success: false,
          error: error.message,
          code: status === 404 ? 'NOT_FOUND'
            : status === 409 ? 'INVALID_STATUS'
            : 'INTERNAL_ERROR',
        });
      }
    },
  );

  /**
   * GET /invoices/:id/dispatch-log
   * 발송 이력 조회
   */
  router.get(
    '/invoices/:id/dispatch-log',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = checkAuth(req, res);
        if (!userId) return;

        const result = await dispatchService.getDispatchStatus(req.params.id);
        res.json({ success: true, data: result });
      } catch (error: any) {
        console.error('Failed to get dispatch log:', error);
        const status = error.message?.includes('not found') ? 404 : 500;
        res.status(status).json({
          success: false,
          error: error.message,
          code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        });
      }
    },
  );

  return router;
}
