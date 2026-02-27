/**
 * Invoice Controller
 *
 * WO-O4O-INVOICE-FINALIZATION-PHASE3D-CP1
 *
 * 청구 인보이스 CRUD API.
 * - POST /invoices — DRAFT 생성 (Preview 스냅샷)
 * - POST /invoices/:id/confirm — CONFIRMED 전환
 * - GET  /invoices/:id — 상세 조회
 * - GET  /invoices — 목록 조회
 *
 * 운영자/관리자 전용.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { InvoiceService } from '../services/invoice.service.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';

type AuthMiddleware = RequestHandler;

function isOperatorOrAdmin(roles: string[] = []): boolean {
  return hasAnyServiceRole(roles, [
    'glycopharm:admin',
    'glycopharm:operator',
    'platform:admin',
    'platform:super_admin',
  ]);
}

function checkAuth(req: Request, res: Response): string | null {
  const authReq = req as AuthRequest;
  const user = authReq.user;

  if (!user?.id) {
    res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
    return null;
  }

  if (!isOperatorOrAdmin(user.roles || [])) {
    res.status(403).json({ success: false, error: 'Operator or administrator role required', code: 'FORBIDDEN' });
    return null;
  }

  return user.id;
}

export function createInvoiceController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const invoiceService = new InvoiceService(dataSource);

  /**
   * POST /invoices
   * DRAFT 인보이스 생성 (Preview 스냅샷)
   */
  router.post(
    '/invoices',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = checkAuth(req, res);
        if (!userId) return;

        const { periodFrom, periodTo, pharmacyId, supplierId, unit, unitPrice } = req.body;

        if (!periodFrom || !periodTo) {
          res.status(400).json({ success: false, error: 'periodFrom and periodTo are required', code: 'MISSING_PERIOD' });
          return;
        }

        if (!unit || !['consultation_action', 'approved_request'].includes(unit)) {
          res.status(400).json({ success: false, error: 'Invalid unit. Valid values: consultation_action, approved_request', code: 'INVALID_BILLING_UNIT' });
          return;
        }

        if (unitPrice == null || typeof unitPrice !== 'number' || unitPrice < 0) {
          res.status(400).json({ success: false, error: 'unitPrice must be a non-negative number', code: 'INVALID_UNIT_PRICE' });
          return;
        }

        const invoice = await invoiceService.createInvoiceDraftFromPreview({
          periodFrom,
          periodTo,
          pharmacyId,
          supplierId,
          unit,
          unitPrice,
          createdBy: userId,
        });

        res.status(201).json({ success: true, data: invoice });
      } catch (error: any) {
        console.error('Failed to create invoice draft:', error);
        const status = error.message?.includes('already exists') ? 409 : 500;
        res.status(status).json({
          success: false,
          error: error.message,
          code: status === 409 ? 'DUPLICATE_INVOICE' : 'INTERNAL_ERROR',
        });
      }
    },
  );

  /**
   * POST /invoices/:id/confirm
   * DRAFT → CONFIRMED 전환
   */
  router.post(
    '/invoices/:id/confirm',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = checkAuth(req, res);
        if (!userId) return;

        const invoice = await invoiceService.confirmInvoice(req.params.id, userId);
        res.json({ success: true, data: invoice });
      } catch (error: any) {
        console.error('Failed to confirm invoice:', error);
        const status = error.message?.includes('not found') ? 404
          : error.message?.includes('Cannot confirm') ? 409
          : 500;
        res.status(status).json({
          success: false,
          error: error.message,
          code: status === 404 ? 'NOT_FOUND' : status === 409 ? 'INVALID_STATUS' : 'INTERNAL_ERROR',
        });
      }
    },
  );

  /**
   * GET /invoices/:id
   * 인보이스 상세 조회
   */
  router.get(
    '/invoices/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = checkAuth(req, res);
        if (!userId) return;

        const invoice = await invoiceService.getInvoice(req.params.id);
        if (!invoice) {
          res.status(404).json({ success: false, error: 'Invoice not found', code: 'NOT_FOUND' });
          return;
        }

        res.json({ success: true, data: invoice });
      } catch (error: any) {
        console.error('Failed to get invoice:', error);
        res.status(500).json({ success: false, error: error.message, code: 'INTERNAL_ERROR' });
      }
    },
  );

  /**
   * GET /invoices
   * 인보이스 목록 조회
   */
  router.get(
    '/invoices',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = checkAuth(req, res);
        if (!userId) return;

        const invoices = await invoiceService.listInvoices({
          status: req.query.status as any,
          pharmacyId: req.query.pharmacyId as string,
          supplierId: req.query.supplierId as string,
          periodFrom: req.query.periodFrom as string,
          periodTo: req.query.periodTo as string,
        });

        res.json({ success: true, data: invoices });
      } catch (error: any) {
        console.error('Failed to list invoices:', error);
        res.status(500).json({ success: false, error: error.message, code: 'INTERNAL_ERROR' });
      }
    },
  );

  return router;
}
