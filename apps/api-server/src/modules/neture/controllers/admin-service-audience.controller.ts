/**
 * Admin Service Audience Policy Controller
 *
 * WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1
 *
 * admin.neture.co.kr 전용 — 서비스별 "약국 대상 서비스 여부" 정책 조회/수정.
 * Mount: /api/v1/neture/admin/service-audience-policies
 * Guard: requireAuth + requireNetureScope('neture:admin')
 *
 * gate 실제 적용은 후속 WO(WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1).
 */
import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { ServiceAudienceService } from '../services/service-audience.service.js';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & { user?: { id: string; role: string } };

export function createAdminServiceAudienceController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ServiceAudienceService(dataSource);

  router.use(requireAuth);
  router.use(requireNetureScope('neture:admin') as any);

  // GET /  — 전 서비스 정책 목록
  router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await service.list();
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture Admin API] Error listing service audience policies:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // PUT /:serviceKey — 정책 upsert
  router.put('/:serviceKey', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await service.upsert(
        req.params.serviceKey,
        { isPharmacyTargetService: req.body?.isPharmacyTargetService, note: req.body?.note },
        req.user?.id ?? null,
      );
      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(400).json({ success: false, error: { code: result.error } });
      }
    } catch (error) {
      logger.error('[Neture Admin API] Error updating service audience policy:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  return router;
}
