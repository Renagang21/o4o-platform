/**
 * KPA Course Request Controller
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (C1-C11)
 * 강좌 기획안(Course Request) API 엔드포인트
 *
 * Routes:
 *   C1:  POST   /course-requests
 *   C2:  GET    /course-requests/me
 *   C3:  GET    /course-requests/:id
 *   C4:  PATCH  /course-requests/:id
 *   C5:  POST   /course-requests/:id/submit
 *   C6:  POST   /course-requests/:id/cancel
 *   C7:  GET    /branches/:branchId/course-requests
 *   C8:  GET    /branches/:branchId/course-requests/pending
 *   C9:  PATCH  /branches/:branchId/course-requests/:id/approve
 *   C10: PATCH  /branches/:branchId/course-requests/:id/reject
 *   C11: PATCH  /branches/:branchId/course-requests/:id/request-revision
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { CourseRequestService } from '../services/course-request.service.js';

type ServiceError = { success: false; error: any; status: number };
function isServiceError(result: { success: boolean }): result is ServiceError {
  return result.success === false;
}

export function createCourseRequestController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  requireKpaScope: (scope: string) => RequestHandler,
): Router {
  const router = Router();
  const service = new CourseRequestService(dataSource);

  // ── C1: POST /course-requests — 강좌 기획안 생성 (draft) ──
  router.post(
    '/course-requests',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { organizationId, proposedTitle, proposedDescription, proposedLevel, proposedDuration, proposedCredits, proposedTags, proposedMetadata } = req.body;

      const result = await service.createDraft(user.id, {
        organizationId,
        proposedTitle,
        proposedDescription,
        proposedLevel,
        proposedDuration,
        proposedCredits,
        proposedTags,
        proposedMetadata,
        userName: user.name || user.email || 'Unknown',
        userEmail: user.email || null,
        userRoles: user.roles || [],
      });

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.status(result.status).json({ success: true, data: result.data });
    }),
  );

  // ── C2: GET /course-requests/me — 내 기획안 목록 ──
  router.get(
    '/course-requests/me',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const data = await service.listMy(user.id);
      res.json({ success: true, data });
    }),
  );

  // ── C3: GET /course-requests/:id — 기획안 상세 ──
  router.get(
    '/course-requests/:id',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = (req as any).user;
      const userRoles: string[] = user.roles || [];

      const result = await service.getDetail(id, user.id, userRoles);

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // ── C4: PATCH /course-requests/:id — 기획안 수정 (draft/revision_requested에서만) ──
  router.patch(
    '/course-requests/:id',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = (req as any).user;
      const { proposedTitle, proposedDescription, proposedLevel, proposedDuration, proposedCredits, proposedTags, proposedMetadata } = req.body;

      const result = await service.updateDraft(id, user.id, {
        proposedTitle,
        proposedDescription,
        proposedLevel,
        proposedDuration,
        proposedCredits,
        proposedTags,
        proposedMetadata,
      });

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // ── C5: POST /course-requests/:id/submit — 제출 ──
  router.post(
    '/course-requests/:id/submit',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = (req as any).user;

      const result = await service.submit(id, user.id);

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // ── C6: POST /course-requests/:id/cancel — 취소 ──
  router.post(
    '/course-requests/:id/cancel',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = (req as any).user;

      const result = await service.cancel(id, user.id);

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // ── C7: GET /branches/:branchId/course-requests — 분회 내 기획안 목록 ──
  router.get(
    '/branches/:branchId/course-requests',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;

      const result = await service.listByBranch(branchId, user.id, user.roles || []);

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // ── C8: GET /branches/:branchId/course-requests/pending — 제출된 기획안만 ──
  router.get(
    '/branches/:branchId/course-requests/pending',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;

      const result = await service.listPending(branchId, user.id, user.roles || []);

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // ── C9: PATCH /branches/:branchId/course-requests/:id/approve — 승인 → Course 생성 ──
  router.patch(
    '/branches/:branchId/course-requests/:id/approve',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;

      const result = await service.approve(branchId, id, user.id, user.roles || [], req.body.reviewComment);

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // ── C10: PATCH /branches/:branchId/course-requests/:id/reject — 거절 ──
  router.patch(
    '/branches/:branchId/course-requests/:id/reject',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      const { rejectionReason } = req.body;

      const result = await service.reject(branchId, id, user.id, user.roles || [], rejectionReason);

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // ── C11: PATCH /branches/:branchId/course-requests/:id/request-revision — 보완 요청 ──
  router.patch(
    '/branches/:branchId/course-requests/:id/request-revision',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      const { revisionNote } = req.body;

      const result = await service.requestRevision(branchId, id, user.id, user.roles || [], revisionNote);

      if (isServiceError(result)) {
        res.status(result.status).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  return router;
}
