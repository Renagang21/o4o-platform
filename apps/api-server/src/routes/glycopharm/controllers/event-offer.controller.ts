/**
 * GlycoPharm Event Offer Controller
 *
 * WO-O4O-GLYCOPHARM-EVENT-OFFERS-BACKEND-CANONICAL-ALIGNMENT-V1
 *
 * EventOfferService 재사용 (복제 금지) — serviceKey = SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER
 * Neture 패턴 동일 적용.
 *
 * Routes (mounted at /api/v1/glycopharm/event-offers):
 * - GET /enriched          (authenticate) — StoreHub 이벤트 오퍼 목록
 * - GET /my-participations (authenticate) — 내 참여 내역
 * - GET /:id               (authenticate) — 상세
 * - POST /:id/participate  (authenticate) — 참여 주문 생성
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { EventOfferService, EventOfferError } from '../../kpa/services/event-offer.service.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

export function createGlycopharmEventOfferController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const service = new EventOfferService(dataSource);
  const sk = SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER;

  /**
   * GET /enriched — StoreHub 이벤트 오퍼 enriched 목록
   */
  router.get('/enriched', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const status = (['upcoming', 'active', 'ended', 'all'].includes(req.query.status as string)
      ? req.query.status as 'upcoming' | 'active' | 'ended' | 'all'
      : 'active');

    const { data, total } = await service.listGroupbuysEnriched(page, limit, status, sk);

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }));

  /**
   * GET /my-participations — 인증 사용자의 참여 내역
   */
  router.get('/my-participations', requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const { data, total } = await service.getMyParticipations(user.id, sk);

      res.json({
        success: true,
        data,
        pagination: { page: 1, limit: 20, total, totalPages: Math.ceil(total / 20) },
      });
    })
  );

  /**
   * GET /:id — 이벤트 오퍼 상세
   */
  router.get('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const listing = await service.getGroupbuyDetail(req.params.id, sk);
    if (!listing) {
      res.status(404).json({ success: false, error: { message: 'Event offer not found' } });
      return;
    }

    const user = (req as any).user;
    const availability = user?.id
      ? await service.getListingAvailability(req.params.id, user.id, sk)
      : null;

    res.json({ success: true, data: listing, ...(availability ? { availability } : {}) });
  }));

  /**
   * POST /:id/participate — 참여 주문 생성
   */
  router.post('/:id/participate', requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      try {
        const result = await service.participate(req.params.id, user.id, {
          quantity: req.body?.quantity,
        }, sk);

        res.status(201).json({ success: true, data: result });
      } catch (err) {
        if (err instanceof EventOfferError) {
          res.status(err.statusCode).json({
            success: false,
            error: { message: err.message, ...(err.code ? { code: err.code } : {}) },
          });
          return;
        }
        throw err;
      }
    })
  );

  return router;
}
