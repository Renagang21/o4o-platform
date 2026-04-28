/**
 * Cosmetics Event Offer Controller
 *
 * WO-O4O-EVENT-OFFER-KCOS-ADOPTION-V1
 *
 * 공통 EventOfferService를 K-Cosmetics service_key로 호출하는 thin controller.
 * - service 인스턴스 자체는 KPA와 동일한 EventOfferService 재사용 (코드 복사 X)
 * - 모든 호출에 SERVICE_KEYS.K_COSMETICS_EVENT_OFFER를 명시 전달
 * - participate() 후처리(STORE_SERVICE_KEY_MAP)에 의해 자동으로 'k-cosmetics' 매장
 *   진열 row가 생성됨 (WO-O4O-EVENT-OFFER-STORE-PRODUCT-LINK-V1)
 *
 * Routes (mounted at /api/v1/cosmetics/event-offers):
 * - GET  /                  (optionalAuth)              — Public listing
 * - GET  /enriched          (optionalAuth)              — Enriched listing
 * - GET  /stats             (auth + cosmetics:operator) — Operator stats
 * - GET  /my-participations (authenticate)              — My participations
 * - GET  /:id               (optionalAuth)              — Detail (+ availability if logged in)
 * - POST /:id/participate   (authenticate)              — Create participation order
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { EventOfferService, EventOfferError } from '../../kpa/services/event-offer.service.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

export function createCosmeticsEventOfferController(
  dataSource: DataSource,
  authenticate: RequestHandler,
  optionalAuth: RequestHandler,
  requireCosmeticsScope: (scope: string) => RequestHandler,
): Router {
  const router = Router();
  const service = new EventOfferService(dataSource);
  const SK = SERVICE_KEYS.K_COSMETICS_EVENT_OFFER;

  /**
   * GET / — Public event offer listing (paginated)
   */
  router.get(
    '/',
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);

      const { data, total } = await service.listGroupbuys(page, limit, SK);

      res.json({
        success: true,
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }),
  );

  /**
   * GET /enriched — Enriched event offer listing with product/supplier info
   */
  router.get(
    '/enriched',
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const status = ['active', 'ended', 'all'].includes(req.query.status as string)
        ? (req.query.status as 'active' | 'ended' | 'all')
        : 'active';

      const { data, total } = await service.listGroupbuysEnriched(page, limit, status, SK);

      res.json({
        success: true,
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }),
  );

  /**
   * GET /stats — Operator stats
   */
  router.get(
    '/stats',
    authenticate,
    requireCosmeticsScope('cosmetics:operator'),
    asyncHandler(async (_req: Request, res: Response) => {
      const stats = await service.getGroupbuyStats(SK);

      res.json({ success: true, data: stats });
    }),
  );

  /**
   * GET /my-participations — My event offer orders
   */
  router.get(
    '/my-participations',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const { data, total } = await service.getMyParticipations(user.id, SK);

      res.json({
        success: true,
        data,
        pagination: { page: 1, limit: 20, total, totalPages: Math.ceil(total / 20) },
      });
    }),
  );

  /**
   * GET /:id — Event offer detail (public)
   * 인증 사용자 시 availability(잔여 수량 등) 포함
   */
  router.get(
    '/:id',
    optionalAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const listing = await service.getGroupbuyDetail(req.params.id, SK);
      if (!listing) {
        res.status(404).json({ success: false, error: { message: 'Event offer not found' } });
        return;
      }

      const user = (req as any).user;
      const availability = user?.id
        ? await service.getListingAvailability(req.params.id, user.id, SK)
        : null;

      res.json({ success: true, data: listing, ...(availability ? { availability } : {}) });
    }),
  );

  /**
   * POST /:id/participate — Create participation order
   * STORE_SERVICE_KEY_MAP에 의해 'k-cosmetics' 매장 진열로 자동 연결
   */
  router.post(
    '/:id/participate',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      try {
        const result = await service.participate(
          req.params.id,
          user.id,
          { quantity: req.body?.quantity },
          SK,
        );

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
    }),
  );

  return router;
}
