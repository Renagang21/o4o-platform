/**
 * Billing Preview Controller
 *
 * WO-O4O-BILLING-AUTOMATION-PHASE3C-CP1
 *
 * consultation 목적 청구 미리보기 API.
 * - GET /billing/preview/consultation — 청구 미리보기 산출
 * 운영자/관리자 전용. 저장 없음.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { BillingPreviewService } from '../services/billing-preview.service.js';
import type { BillingUnit } from '../services/billing-preview.service.js';
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
      logLegacyRoleUsage(userId, role, 'glycopharm/billing-preview.controller:isOperatorOrAdmin');
    });
    return false;
  }

  return false;
}

export function createBillingPreviewController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const billingPreviewService = new BillingPreviewService(dataSource);

  /**
   * GET /billing/preview/consultation
   * consultation 청구 미리보기
   * Requires operator/admin role
   */
  router.get(
    '/billing/preview/consultation',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const user = authReq.user;

        if (!user?.id) {
          res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHORIZED',
          });
          return;
        }

        if (!isOperatorOrAdmin(user.roles || [], user.id)) {
          res.status(403).json({
            success: false,
            error: 'Operator or administrator role required',
            code: 'FORBIDDEN',
          });
          return;
        }

        // Parse query params
        const now = new Date();
        const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const from = (req.query.from as string) || defaultFrom.toISOString().split('T')[0];
        const to = (req.query.to as string) || now.toISOString().split('T')[0];
        const pharmacyId = req.query.pharmacyId as string | undefined;
        const supplierId = req.query.supplierId as string | undefined;

        // Billing unit: consultation_action (default) or approved_request
        const unit = (req.query.unit as BillingUnit) || 'consultation_action';
        if (!['consultation_action', 'approved_request'].includes(unit)) {
          res.status(400).json({
            success: false,
            error: 'Invalid unit. Valid values: consultation_action, approved_request',
            code: 'INVALID_BILLING_UNIT',
          });
          return;
        }

        // Unit price (default: 5000)
        const unitPriceRaw = req.query.unitPrice as string | undefined;
        let unitPrice: number | undefined;
        if (unitPriceRaw) {
          unitPrice = parseInt(unitPriceRaw, 10);
          if (isNaN(unitPrice) || unitPrice < 0) {
            res.status(400).json({
              success: false,
              error: 'unitPrice must be a non-negative integer',
              code: 'INVALID_UNIT_PRICE',
            });
            return;
          }
        }

        const preview = await billingPreviewService.getConsultationBillingPreview({
          from,
          to,
          pharmacyId,
          supplierId,
          unit,
          unitPrice,
        });

        res.json({ success: true, data: preview });
      } catch (error: any) {
        console.error('Failed to get billing preview:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          code: 'INTERNAL_ERROR',
        });
      }
    },
  );

  return router;
}
