/**
 * Supplier Content Controller
 *
 * WO-O4O-SUPPLIER-CONTENT-SUBMISSION-PHASE1-V1
 *
 * 공급자 마케팅 자료 제출 / 조회 API.
 * 경로: /kpa/supplier/content-submissions
 *
 * Routes:
 *   GET  /           — 내 제출 목록 (승인 상태 포함)
 *   GET  /:id        — 단건 상세
 *   POST /           — 자료 제출 (cms_contents 생성 + 승인 요청 생성)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { SupplierContentService } from '../services/supplier-content.service.js';

type AuthMiddleware = RequestHandler;

export function createSupplierContentController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const service = new SupplierContentService(dataSource);

  // 모든 라우트에 인증 필수
  router.use(requireAuth as any);

  // ── S1: GET / — 내 제출 목록 ──────────────────────────────────────────────
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const result = await service.listMy(user.id, page, limit);

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

  // ── S2: GET /:id — 단건 상세 ──────────────────────────────────────────────
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id } = req.params;

      const result = await service.getOne(user.id, id);

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

  // ── S3: POST / — 자료 제출 ────────────────────────────────────────────────
  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { title, summary, body, imageUrl, linkUrl, contentType, organizationId } = req.body;

      const result = await service.submit(user.id, user, {
        title,
        summary,
        body,
        imageUrl,
        linkUrl,
        contentType,
        organizationId,
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

  return router;
}
