/**
 * Service Recruitment Exposure Proxy Controller (shared factory)
 *
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1
 *
 * KPA / GlycoPharm / K-Cosmetics 운영자가 자기 서비스의 판매자 모집 노출 승인을
 * 수행하기 위한 per-service proxy. neture:operator 권한 없이 자기 서비스 operator
 * scope 로 접근한다(권한 우회가 아니라 권한 경계 보강).
 *
 *  - serviceKey 는 클라이언트 입력을 신뢰하지 않고 backend 에서 고정.
 *  - 기존 NeturePartnerContractService(setRecruitmentExposure/getRecruitmentsForExposureReview) 재사용.
 *  - approve/reject 는 recruitment.serviceId === 고정 serviceKey 일 때만 허용(SERVICE_MISMATCH 차단).
 *
 * Routes (mounted at service base):
 *   GET   /operator/recruitment-exposure
 *   PATCH /operator/recruitment-exposure/:id/approve   body: { note? }
 *   PATCH /operator/recruitment-exposure/:id/reject    body: { note? }
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { NetureService } from '../neture.service.js';
import { ExposureStatus, RecruitmentStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & { user?: { id: string; role: string } };

export function createServiceRecruitmentExposureProxyController(
  authMiddleware: RequestHandler,
  requireOperatorScope: RequestHandler,
  serviceKey: string,
): Router {
  const router = Router();
  const netureService = new NetureService();

  router.use('/operator/recruitment-exposure', authMiddleware, requireOperatorScope);

  // GET /operator/recruitment-exposure?exposureStatus=&status=
  router.get('/operator/recruitment-exposure', async (req: Request, res: Response): Promise<void> => {
    try {
      const { exposureStatus, status } = req.query;
      const data = await netureService.getRecruitmentsForExposureReview({
        serviceKey, // 고정 — 클라이언트 입력 무시
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
      logger.error(`[ServiceRecruitmentExposureProxy:${serviceKey}] Error listing:`, error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  const decide = (decision: ExposureStatus.APPROVED | ExposureStatus.REJECTED) =>
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = (req as AuthenticatedRequest).user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
          return;
        }
        const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
        // serviceKey 고정 전달 → recruitment.serviceId 불일치 시 SERVICE_MISMATCH
        const result = await netureService.setRecruitmentExposure(req.params.id, userId, decision, note, serviceKey);
        if (!result.success) {
          const code = result.error === 'RECRUITMENT_NOT_FOUND' ? 404 : result.error === 'SERVICE_MISMATCH' ? 403 : 400;
          res.status(code).json({ success: false, error: result.error });
          return;
        }
        res.json({ success: true, data: result.data });
      } catch (error) {
        logger.error(`[ServiceRecruitmentExposureProxy:${serviceKey}] Error deciding:`, error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    };

  router.patch('/operator/recruitment-exposure/:id/approve', decide(ExposureStatus.APPROVED));
  router.patch('/operator/recruitment-exposure/:id/reject', decide(ExposureStatus.REJECTED));

  return router;
}
