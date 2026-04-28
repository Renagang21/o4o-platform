/**
 * Neture Event Offer Controller
 *
 * WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1
 *
 * EventOfferService 재사용 (복제 금지) — serviceKey = SERVICE_KEYS.EVENT_OFFER_NETURE
 *
 * Routes:
 * - GET  /event-offers                   (requireAuth) — listing
 * - GET  /event-offers/enriched          (requireAuth) — enriched listing
 * - GET  /event-offers/my-participations (requireAuth) — my participations
 * - GET  /event-offers/:id               (requireAuth) — detail
 * - POST /event-offers/:id/participate   (requireAuth) — participate
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { EventOfferService, EventOfferError } from '../../kpa/services/event-offer.service.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

export function createNetureEventOfferController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const service = new EventOfferService(dataSource);
  const sk = SERVICE_KEYS.EVENT_OFFER_NETURE;

  /**
   * GET /event-offers — Neture event offer listing (paginated)
   */
  router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);

    const { data, total } = await service.listGroupbuys(page, limit, sk);

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }));

  /**
   * GET /event-offers/enriched — Enriched listing with product/supplier info
   */
  router.get('/enriched', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const status = (['active', 'ended', 'all'].includes(req.query.status as string)
      ? req.query.status as 'active' | 'ended' | 'all'
      : 'active');

    const { data, total } = await service.listGroupbuysEnriched(page, limit, status, sk);

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }));

  /**
   * GET /event-offers/my-participations — Authenticated user's participations
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
   * GET /event-offers/:id — Event offer detail
   * WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2: availability 포함 (requireAuth이므로 항상 계산)
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
   * POST /event-offers/:id/participate — Create participation order
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

        res.status(201).json({
          success: true,
          data: result,
        });
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
