/**
 * Funnel Controller
 *
 * WO-O4O-FUNNEL-VISUALIZATION-PHASE3A-CP1
 *
 * consultation 퍼널 집계 API.
 * - GET /funnel/consultation — 퍼널 수치 조회
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import { FunnelService } from '../services/funnel.service.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;

export function createFunnelController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
  const funnelService = new FunnelService(dataSource);

  /**
   * GET /funnel/consultation
   * consultation 퍼널 수치 조회
   * Requires authentication (pharmacy staff)
   */
  router.get(
    '/funnel/consultation',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHORIZED',
          });
          return;
        }

        // Find pharmacy owned by user
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
          res.status(404).json({
            success: false,
            error: 'Pharmacy not found for this user',
            code: 'PHARMACY_NOT_FOUND',
          });
          return;
        }

        // Parse query params
        const now = new Date();
        const defaultFrom = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        );
        const from =
          (req.query.from as string) || defaultFrom.toISOString().split('T')[0];
        const to =
          (req.query.to as string) || now.toISOString().split('T')[0];
        const sourceType = req.query.sourceType as
          | 'qr'
          | 'tablet'
          | undefined;

        // Validate sourceType
        if (sourceType && !['qr', 'tablet'].includes(sourceType)) {
          res.status(400).json({
            success: false,
            error: 'Invalid sourceType. Valid values: qr, tablet',
            code: 'INVALID_SOURCE_TYPE',
          });
          return;
        }

        const summary = await funnelService.getConsultationFunnelSummary({
          from,
          to,
          pharmacyId: pharmacy.id,
          sourceType,
        });

        res.json({
          success: true,
          data: summary,
        });
      } catch (error: any) {
        console.error('Failed to get consultation funnel:', error);
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
