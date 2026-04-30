/**
 * Content Approval Controller
 *
 * WO-O4O-OPERATOR-CONTENT-APPROVAL-PHASE1-V1
 *
 * 운영자용 콘텐츠 승인 API.
 * 공급자 자료 제출(hub_content_submission) 및
 * 매장 HUB 공유 요청(store_share_to_hub) 통합 처리.
 *
 * Routes (mounted at /operator/approvals):
 *   GET    /             — 승인 대기 목록
 *   GET    /:id          — 단건 상세
 *   POST   /:id/approve  — 승인
 *   POST   /:id/reject   — 반려
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { ContentApprovalService } from '../services/content-approval.service.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

export function createContentApprovalController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireKpaScope: ScopeMiddleware,
): Router {
  const router = Router();
  const service = new ContentApprovalService(dataSource);

  // ── A1: GET / — 승인 목록 ─────────────────────────────────────────────────
  router.get(
    '/',
    requireAuth as any,
    requireKpaScope('kpa:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const entity_type = req.query.entity_type as string | undefined;
      const status = (req.query.status as string) || 'pending';
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const result = await service.listApprovals({ entity_type: entity_type as any, status, page, limit });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    }),
  );

  // ── A2: GET /:id — 단건 상세 ─────────────────────────────────────────────
  router.get(
    '/:id',
    requireAuth as any,
    requireKpaScope('kpa:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const result = await service.getDetail(id);

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

  // ── A3: POST /:id/approve — 승인 ─────────────────────────────────────────
  router.post(
    '/:id/approve',
    requireAuth as any,
    requireKpaScope('kpa:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id } = req.params;
      const { comment } = req.body;

      const result = await service.approve(id, user, comment);

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

  // ── A4: POST /:id/reject — 반려 ──────────────────────────────────────────
  router.post(
    '/:id/reject',
    requireAuth as any,
    requireKpaScope('kpa:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id } = req.params;
      const { reason } = req.body;

      const result = await service.reject(id, user, reason);

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
