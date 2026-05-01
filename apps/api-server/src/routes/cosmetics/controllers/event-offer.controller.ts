/**
 * Cosmetics Event Offer Controller
 *
 * WO-O4O-EVENT-OFFER-KCOS-ADOPTION-V1
 * WO-O4O-EVENT-OFFER-KCOS-CREATE-V1: operator create endpoint 추가
 *
 * 공통 EventOfferService를 K-Cosmetics service_key로 호출하는 thin controller.
 * - service 인스턴스 자체는 KPA와 동일한 EventOfferService 재사용 (코드 복사 X)
 * - 모든 호출에 SERVICE_KEYS.K_COSMETICS_EVENT_OFFER를 명시 전달
 * - participate() 후처리(STORE_SERVICE_KEY_MAP)에 의해 자동으로 'k-cosmetics' 매장
 *   진열 row가 생성됨 (WO-O4O-EVENT-OFFER-STORE-PRODUCT-LINK-V1)
 *
 * Routes (mounted at /api/v1/cosmetics/event-offers):
 * - GET  /                          (optionalAuth)              — Public listing
 * - GET  /enriched                  (optionalAuth)              — Enriched listing
 * - GET  /stats                     (auth + cosmetics:operator) — Operator stats
 * - GET  /my-participations         (authenticate)              — My participations
 * - GET  /pending-listings          (auth + cosmetics:operator) — Approval queue (WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1)
 * - GET  /:id                       (optionalAuth)              — Detail (+ availability if logged in)
 * - POST /                          (auth + cosmetics:operator) — Create event offer (operator)
 * - POST /:id/participate           (authenticate)              — Create participation order
 * - POST /products/:id/approve      (auth + cosmetics:operator) — Approve pending OPL (WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1)
 * - POST /products/:id/reject       (auth + cosmetics:operator) — Reject pending OPL (WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1)
 *
 * NOTE: K-Cos supplier 직접 create는 multi-service proposal에서 처리됨
 *       (WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1).
 *       이 controller는 K-Cos operator 책임 영역만 담당.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import {
  EventOfferService,
  EventOfferError,
  EventOfferCreateError,
} from '../../kpa/services/event-offer.service.js';
import { resolveOrganizationForEventOffer } from '../../kpa/helpers/event-offer-organization.helper.js';
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

  // ─── WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1 ─────────────────────────
  // Approval Queue: supplier가 multi-service proposal로 제안한 pending OPL을
  // K-Cos operator가 승인/반려.
  //
  // KPA approval과 동일한 EventOfferService 메서드를 사용하되,
  // SK = K_COSMETICS_EVENT_OFFER로 격리.

  /**
   * GET /pending-listings — Approval queue (K-Cos operator 전용)
   *
   * /:id 캐치를 피하기 위해 /:id 위에 등록.
   */
  router.get(
    '/pending-listings',
    authenticate,
    requireCosmeticsScope('cosmetics:operator'),
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
   * POST /products/:id/approve — pending OPL 승인 (K-Cos operator 전용)
   */
  router.post(
    '/products/:id/approve',
    authenticate,
    requireCosmeticsScope('cosmetics:operator'),
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
   * POST /products/:id/reject — pending OPL 반려 (K-Cos operator 전용)
   * body: { reason: string } 필수
   */
  router.post(
    '/products/:id/reject',
    authenticate,
    requireCosmeticsScope('cosmetics:operator'),
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
            NOT_FOUND:       '이벤트를 찾을 수 없습니다.',
            INVALID_STATE:   '대기중(pending) 상태에서만 반려할 수 있습니다.',
            INVALID_REASON:  '반려 사유를 입력해 주세요.',
            INTERNAL_ERROR:  '서버 오류가 발생했습니다.',
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
   * POST / — Create event offer (operator)
   *
   * WO-O4O-EVENT-OFFER-KCOS-CREATE-V1: thin wrapper over EventOfferService.createListing()
   *
   * organizationId는 helper(resolveOrganizationForEventOffer)에서 결정.
   * 운영자 직접 등록 → status='approved', is_active=true (즉시 노출).
   *
   * 응답 형태는 KPA operator 응답을 차용한 K-Cos 표준 형태(EventOfferProduct-like)로 정렬.
   */
  router.post(
    '/',
    authenticate,
    requireCosmeticsScope('cosmetics:operator'),
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const { offerId } = req.body ?? {};
      if (!offerId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: '필수 파라미터가 없습니다.' },
        });
        return;
      }

      // body에 organizationId가 명시되면 우선 사용, 아니면 helper로 결정
      let organizationId: string | undefined = req.body?.organizationId;
      if (!organizationId) {
        const resolved = await resolveOrganizationForEventOffer({
          dataSource,
          userId: user.id,
          roleType: 'operator',
          serviceKey: SK,
        });
        organizationId = resolved ?? undefined;
        if (!organizationId) {
          res.status(400).json({
            success: false,
            error: {
              code: 'ORG_NOT_FOUND',
              message: 'K-Cosmetics 운영자 조직 정보를 찾을 수 없습니다.',
            },
          });
          return;
        }
      }

      try {
        const result = await service.createListing({
          offerId,
          serviceKey: SK,
          organizationId,
          roleType: 'operator',
        });

        res.status(201).json({
          success: true,
          data: {
            id: result.id,
            offerId: result.offerId,
            title: result.title,
            supplierName: result.supplierName,
            conditionSummary: `단가: ${result.price ?? '미정'}원`,
            status: result.status,
            isActive: result.isActive,
            startAt: null,
            endAt: null,
            totalQuantity: null,
            createdAt: result.createdAt,
          },
        });
      } catch (err) {
        if (err instanceof EventOfferCreateError) {
          // 기존 K-Cos 패턴(KPA operator와 동일)으로 ALREADY_LISTED → ALREADY_REGISTERED 매핑
          const codeMap: Record<string, string> = {
            OFFER_NOT_FOUND: 'OFFER_NOT_FOUND',
            OFFER_NOT_OWNED: 'OFFER_NOT_OWNED',
            ALREADY_LISTED: 'ALREADY_REGISTERED',
            INTERNAL_ERROR: 'INTERNAL_ERROR',
          };
          const messageMap: Record<string, string> = {
            OFFER_NOT_FOUND: '공급자 상품을 찾을 수 없습니다.',
            OFFER_NOT_OWNED: '해당 상품에 대한 권한이 없습니다.',
            ALREADY_REGISTERED: '이미 등록된 이벤트 상품입니다.',
            INTERNAL_ERROR: '서버 오류가 발생했습니다.',
          };
          const code = codeMap[err.code] ?? 'INTERNAL_ERROR';
          res.status(err.statusCode).json({
            success: false,
            error: { code, message: messageMap[code] ?? err.message },
          });
          return;
        }
        throw err;
      }
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
