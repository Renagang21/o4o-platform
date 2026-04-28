/**
 * KPA Event Offer Controller
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (lines 2367-2594)
 * WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: E-commerce order creation via EventOfferService
 * WO-O4O-EVENT-OFFER-BACKEND-NAMING-ALIGNMENT-V1: createGroupbuyController → createEventOfferController
 *
 * Routes (URLs frozen — /groupbuy/* 변경 금지):
 * - GET /              (optionalAuth) — Public event offer listing
 * - GET /stats         (authenticate + kpa:operator) — Operator stats
 * - GET /my-participations (authenticate) — My event offer orders
 * - GET /:id           (optionalAuth) — Event offer detail
 * - POST /:id/participate (authenticate) — Create participation order
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { EventOfferService, EventOfferError } from '../services/event-offer.service.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

export function createEventOfferController(
  dataSource: DataSource,
  authenticate: RequestHandler,
  optionalAuth: RequestHandler,
  requireKpaScope: (scope: string) => RequestHandler,
): Router {
  const router = Router();
  const service = new EventOfferService(dataSource);

  /**
   * GET / — Public event offer listing (paginated)
   */
  router.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);

    const { data, total } = await service.listGroupbuys(page, limit);

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }));

  /**
   * GET /stats — Operator stats
   */
  router.get('/stats', authenticate, requireKpaScope('kpa:operator'),
    asyncHandler(async (req: Request, res: Response) => {
      const stats = await service.getGroupbuyStats();

      res.json({
        success: true,
        data: stats,
      });
    })
  );

  /**
   * GET /my-participations — My event offer orders
   */
  router.get('/my-participations', authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const { data, total } = await service.getMyParticipations(user.id);

      res.json({
        success: true,
        data,
        pagination: { page: 1, limit: 20, total, totalPages: Math.ceil(total / 20) },
      });
    })
  );

  /**
   * GET /enriched — Enriched event offer listing with product/supplier info
   * WO-EVENT-OFFER-HUB-TABLE-AND-DIRECT-ORDER-REFINE-V1
   * WO-EVENT-OFFER-HUB-TIME-WINDOW-FILTER-HOTFIX-V1: status 필터 (active|ended|all)
   */
  router.get('/enriched', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const status = (['active', 'ended', 'all'].includes(req.query.status as string)
      ? req.query.status as 'active' | 'ended' | 'all'
      : 'active');

    const { data, total } = await service.listGroupbuysEnriched(page, limit, status);

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }));

  /**
   * GET /:id — Event offer detail (public)
   * WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2: 인증 사용자 시 availability 포함
   */
  router.get('/:id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const listing = await service.getGroupbuyDetail(req.params.id);
    if (!listing) {
      res.status(404).json({ success: false, error: { message: 'Event offer not found' } });
      return;
    }

    const user = (req as any).user;
    const availability = user?.id
      ? await service.getListingAvailability(req.params.id, user.id, SERVICE_KEYS.KPA_GROUPBUY)
      : null;

    res.json({ success: true, data: listing, ...(availability ? { availability } : {}) });
  }));

  /**
   * POST /:id/participate — Create participation order
   * listing.service_key -> Order.metadata.serviceKey 전파 보장
   */
  router.post('/:id/participate', authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      try {
        const result = await service.participate(req.params.id, user.id, {
          quantity: req.body?.quantity,
        });

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
