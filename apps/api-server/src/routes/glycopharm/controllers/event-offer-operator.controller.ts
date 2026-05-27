/**
 * GlycoPharm Event Offer Operator Controller
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1
 *
 * 공통 EventOfferService를 SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER 로 호출하는 thin controller.
 * K-Cosmetics createCosmeticsEventOfferController 와 동일한 패턴.
 *
 * Routes (mounted at /api/v1/glycopharm/operator/event-offers):
 * - GET  /pending-listings       (glycopharm:operator) — 승인 대기 목록
 * - POST /products/:id/approve   (glycopharm:operator) — pending OPL 승인
 * - POST /products/:id/reject    (glycopharm:operator) — pending OPL 반려
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import {
  EventOfferService,
  EventOfferCreateError,
} from '../../kpa/services/event-offer.service.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

export function createGlycopharmEventOfferOperatorController(
  dataSource: DataSource,
  authenticate: RequestHandler,
  requireGlycopharmScope: (scope: string) => RequestHandler,
): Router {
  const router = Router();
  const service = new EventOfferService(dataSource);
  const SK = SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER;

  /**
   * GET /pending-listings — 승인 대기 목록 (glycopharm:operator 전용)
   */
  router.get(
    '/pending-listings',
    authenticate,
    requireGlycopharmScope('glycopharm:operator'),
    asyncHandler(async (req: Request, res: Response) => {
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));

      const result = await service.listPendingListings(SK, page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: { page, limit, total: result.total },
      });
    }),
  );

  /**
   * POST /products/:id/approve — pending OPL 승인 (glycopharm:operator 전용)
   */
  router.post(
    '/products/:id/approve',
    authenticate,
    requireGlycopharmScope('glycopharm:operator'),
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      try {
        const result = await service.approveListing(req.params.id, user.id);
        res.json({ success: true, data: result });
      } catch (err) {
        if (err instanceof EventOfferCreateError) {
          const messageMap: Record<string, string> = {
            NOT_FOUND:      '이벤트를 찾을 수 없습니다.',
            INVALID_STATE:  '대기중(pending) 상태에서만 승인할 수 있습니다.',
            INTERNAL_ERROR: '서버 오류가 발생했습니다.',
          };
          res.status(err.statusCode).json({
            success: false,
            error: { code: err.code, message: messageMap[err.code] ?? err.message },
          });
          return;
        }
        throw err;
      }
    }),
  );

  /**
   * POST /products/:id/reject — pending OPL 반려 (glycopharm:operator 전용)
   * body: { reason: string }
   */
  router.post(
    '/products/:id/reject',
    authenticate,
    requireGlycopharmScope('glycopharm:operator'),
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const reason = (req.body?.reason ?? '') as string;

      try {
        const result = await service.rejectListing(req.params.id, user.id, reason);
        res.json({ success: true, data: result });
      } catch (err) {
        if (err instanceof EventOfferCreateError) {
          const messageMap: Record<string, string> = {
            NOT_FOUND:      '이벤트를 찾을 수 없습니다.',
            INVALID_STATE:  '대기중(pending) 상태에서만 반려할 수 있습니다.',
            INVALID_REASON: '반려 사유를 입력해 주세요.',
            INTERNAL_ERROR: '서버 오류가 발생했습니다.',
          };
          res.status(err.statusCode).json({
            success: false,
            error: { code: err.code, message: messageMap[err.code] ?? err.message },
          });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
