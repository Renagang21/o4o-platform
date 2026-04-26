/**
 * KPA Forum Request Controller
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (F1-F8)
 * 포럼 카테고리 요청 생성/조회/승인/거절/보완요청
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { ForumRequestService } from '../services/forum-request.service.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

export function createForumRequestController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireKpaScope: ScopeMiddleware,
): Router {
  const router = Router();
  const service = new ForumRequestService(dataSource);

  // F1: POST /forum-requests — 포럼 카테고리 요청 생성
  router.post(
    '/forum-requests',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { organizationId, name, description, reason, iconEmoji } = req.body;

      const result = await service.createRequest(user.id, user, {
        organizationId,
        name,
        description,
        reason,
        iconEmoji,
      });

      if (result.error) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }

      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // F2: GET /forum-requests/my — 내 요청 목록
  router.get(
    '/forum-requests/my',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const organizationId = req.query.organizationId as string;

      const result = await service.listMy(user.id, organizationId);
      res.json({ success: true, data: result.data, total: result.total });
    }),
  );

  // F3: GET /forum-requests/:id — 요청 상세
  router.get(
    '/forum-requests/:id',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id } = req.params;

      const result = await service.getDetail(id, user);

      if (result.error) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }

      res.json({ success: true, data: result.data });
    }),
  );

  // F4: GET /forum-requests — 전체 요청 목록 (operator/admin)
  router.get(
    '/forum-requests',
    requireAuth as any,
    requireKpaScope('kpa:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const status = req.query.status as string;
      const organizationId = req.query.organizationId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const result = await service.listAll({ status, organizationId, page, limit });
      res.json({ success: true, data: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages });
    }),
  );

  // F5: GET /branches/:branchId/forum-requests/pending — 분회 대기 요청
  router.get(
    '/branches/:branchId/forum-requests/pending',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { branchId } = req.params;

      const result = await service.listPending(user);

      if (result.error) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }

      res.json({ success: true, data: result.data });
    }),
  );

  // F6: PATCH /branches/:branchId/forum-requests/:id/approve — 승인 (ForumCategory 생성)
  router.patch(
    '/branches/:branchId/forum-requests/:id/approve',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { branchId, id } = req.params;
      const { reviewComment } = req.body;

      const result = await service.approve(id, user, reviewComment);

      if (result.error) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }

      res.json({ success: true, data: result.data });
    }),
  );

  // F7: PATCH /branches/:branchId/forum-requests/:id/reject — 거절
  router.patch(
    '/branches/:branchId/forum-requests/:id/reject',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { branchId, id } = req.params;
      const { rejectionReason } = req.body;

      const result = await service.reject(id, user, rejectionReason);

      if (result.error) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }

      res.json({ success: true, data: result.data });
    }),
  );

  // F8: PATCH /branches/:branchId/forum-requests/:id/request-revision — 보완 요청
  router.patch(
    '/branches/:branchId/forum-requests/:id/request-revision',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { branchId, id } = req.params;
      const { revisionNote } = req.body;

      const result = await service.requestRevision(id, user, revisionNote);

      if (result.error) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }

      res.json({ success: true, data: result.data });
    }),
  );

  return router;
}
