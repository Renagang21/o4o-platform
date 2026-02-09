/**
 * Report Controller
 *
 * WO-O4O-SUPPLIER-REPORTING-BILLING-BASIS-PHASE3B-CP1
 *
 * 운영자용 청구 근거 리포트 API.
 * - GET /reports/consultation — consultation 리포트
 * - GET /reports/pharmacies — 약국 목록 (드롭다운용)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { ReportService } from '../services/report.service.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../../../utils/role.utils.js';

type AuthMiddleware = RequestHandler;

/**
 * Check if user has operator/admin role (same pattern as operator.controller.ts)
 */
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
      logLegacyRoleUsage(userId, role, 'glycopharm/report.controller:isOperatorOrAdmin');
    });
    return false;
  }

  return false;
}

export function createReportController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const reportService = new ReportService(dataSource);

  /**
   * GET /reports/consultation
   * consultation 청구 근거 리포트
   * Requires operator/admin role
   */
  router.get(
    '/reports/consultation',
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
        const sourceType = req.query.sourceType as 'qr' | 'tablet' | undefined;

        if (sourceType && !['qr', 'tablet'].includes(sourceType)) {
          res.status(400).json({
            success: false,
            error: 'Invalid sourceType. Valid values: qr, tablet',
            code: 'INVALID_SOURCE_TYPE',
          });
          return;
        }

        const report = await reportService.getConsultationBillingReport({
          from,
          to,
          pharmacyId,
          sourceType,
        });

        res.json({ success: true, data: report });
      } catch (error: any) {
        console.error('Failed to get consultation report:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          code: 'INTERNAL_ERROR',
        });
      }
    },
  );

  /**
   * GET /reports/pharmacies
   * 약국 목록 (리포트 필터 드롭다운용)
   * Requires operator/admin role
   */
  router.get(
    '/reports/pharmacies',
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

        const pharmacies = await reportService.listPharmacies();
        res.json({ success: true, data: pharmacies });
      } catch (error: any) {
        console.error('Failed to list pharmacies:', error);
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
