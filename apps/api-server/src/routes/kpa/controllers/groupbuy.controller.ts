/**
 * KPA Groupbuy Controller
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (lines 2367-2594)
 * WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: E-commerce order creation via GroupbuyService
 *
 * Routes:
 * - GET /              (optionalAuth) — Public groupbuy listing
 * - GET /stats         (authenticate + kpa:operator) — Operator stats
 * - GET /my-participations (authenticate) — My groupbuy orders
 * - GET /:id           (optionalAuth) — Groupbuy detail
 * - POST /:id/participate (authenticate) — Create participation order
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { GroupbuyService, GroupbuyError } from '../services/groupbuy.service.js';

export function createGroupbuyController(
  dataSource: DataSource,
  authenticate: RequestHandler,
  optionalAuth: RequestHandler,
  requireKpaScope: (scope: string) => RequestHandler,
): Router {
  const router = Router();
  const service = new GroupbuyService(dataSource);

  /**
   * GET / — Public groupbuy listing (paginated)
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
   * WO-KPA-GROUPBUY-STATS-V1: 운영자 통계 엔드포인트
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
   * GET /my-participations — My groupbuy orders
   * WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: 내 공동구매 주문 목록
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
   * GET /:id — Groupbuy detail (public)
   */
  router.get('/:id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const listing = await service.getGroupbuyDetail(req.params.id);
    if (!listing) {
      res.status(404).json({ success: false, error: { message: 'Groupbuy product not found' } });
      return;
    }
    res.json({ success: true, data: listing });
  }));

  /**
   * POST /:id/participate — Create participation order
   * WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: 공동구매 주문 생성
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
        if (err instanceof GroupbuyError) {
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
