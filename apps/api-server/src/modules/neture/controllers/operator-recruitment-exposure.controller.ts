/**
 * Operator Recruitment Exposure Approval Controller
 *
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1 (IR dbd2ca435 B안)
 *
 * 판매자 모집 제품의 "서비스 노출 승인" — 운영자 전용.
 * 운영자 승인 = 모집 제품의 자기 서비스 노출 승인 (개별 판매자 승인 아님).
 *
 * Routes (mounted at /operator):
 *   GET   /recruitment-exposure                 — 큐 목록 (serviceKey/exposureStatus/status 필터)
 *   PATCH /recruitment-exposure/:id/approve     — 노출 승인 (body: { note? })
 *   PATCH /recruitment-exposure/:id/reject      — 노출 반려 (body: { note? })
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 * Note: serviceKey 별 권한 enforcement / 서비스 operator 앱 호출 wiring 은
 *       후속 WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1 에서 결정.
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { NetureService } from '../neture.service.js';
import { ExposureStatus, RecruitmentStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

export function createOperatorRecruitmentExposureController(_dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();

  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/recruitment-exposure
   */
  router.get('/recruitment-exposure', async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceKey, exposureStatus, status } = req.query;
      const data = await netureService.getRecruitmentsForExposureReview({
        serviceKey: typeof serviceKey === 'string' && serviceKey ? serviceKey : undefined,
        exposureStatus:
          typeof exposureStatus === 'string' && Object.values(ExposureStatus).includes(exposureStatus as ExposureStatus)
            ? (exposureStatus as ExposureStatus)
            : undefined,
        status:
          typeof status === 'string' && Object.values(RecruitmentStatus).includes(status as RecruitmentStatus)
            ? (status as RecruitmentStatus)
            : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[OperatorRecruitmentExposure] Error listing:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * PATCH /operator/recruitment-exposure/:id/approve
   */
  router.patch('/recruitment-exposure/:id/approve', async (req: Request, res: Response): Promise<void> => {
    await decide(req, res, ExposureStatus.APPROVED);
  });

  /**
   * PATCH /operator/recruitment-exposure/:id/reject
   */
  router.patch('/recruitment-exposure/:id/reject', async (req: Request, res: Response): Promise<void> => {
    await decide(req, res, ExposureStatus.REJECTED);
  });

  async function decide(
    req: Request,
    res: Response,
    decision: ExposureStatus.APPROVED | ExposureStatus.REJECTED,
  ): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }
      const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
      const result = await netureService.setRecruitmentExposure(req.params.id, userId, decision, note);
      if (!result.success) {
        const status = result.error === 'RECRUITMENT_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[OperatorRecruitmentExposure] Error deciding:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }

  return router;
}
