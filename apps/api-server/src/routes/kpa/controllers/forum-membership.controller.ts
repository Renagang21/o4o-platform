/**
 * KPA Forum Membership Controller
 *
 * WO-KPA-A-FORUM-MEMBERSHIP-TABLE-AND-JOIN-API-V1
 * 폐쇄형 포럼 가입 신청/승인/거절/회원 관리 API
 *
 * Routes (mounted on forumRouter):
 *   POST   /categories/:id/join               — 가입 신청
 *   GET    /categories/:id/members            — 회원 목록 (owner)
 *   GET    /categories/:id/join-requests      — 대기 신청 (owner)
 *   POST   /categories/:id/members/:requestId/approve — 승인 (owner)
 *   POST   /categories/:id/members/:requestId/reject  — 거절 (owner)
 *   DELETE /categories/:id/members/:userId    — 회원 삭제 (owner)
 *   GET    /categories/:id/membership-status  — 내 멤버십 상태
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { ForumMembershipService } from '../services/forum-membership.service.js';

type AuthMiddleware = RequestHandler;

export function createForumMembershipController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const service = new ForumMembershipService(dataSource);

  // POST /categories/:id/join — 폐쇄형 포럼 가입 신청
  router.post(
    '/categories/:id/join',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id } = req.params;
      const result = await service.requestJoin(id, user);
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

  // GET /categories/:id/members — 포럼 회원 목록 (owner only)
  router.get(
    '/categories/:id/members',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id } = req.params;
      const result = await service.listMembers(id, user);
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

  // GET /categories/:id/join-requests — 대기 중 가입 신청 (owner only)
  router.get(
    '/categories/:id/join-requests',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id } = req.params;
      const result = await service.listPendingJoinRequests(id, user);
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

  // POST /categories/:id/members/:requestId/approve — 가입 승인 (owner)
  router.post(
    '/categories/:id/members/:requestId/approve',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id, requestId } = req.params;
      const result = await service.approveJoin(id, requestId, user);
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

  // POST /categories/:id/members/:requestId/reject — 가입 거절 (owner)
  router.post(
    '/categories/:id/members/:requestId/reject',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id, requestId } = req.params;
      const { reviewComment } = req.body || {};
      const result = await service.rejectJoin(id, requestId, user, reviewComment);
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

  // DELETE /categories/:id/members/:userId — 회원 삭제 (owner)
  router.delete(
    '/categories/:id/members/:userId',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id, userId } = req.params;
      const result = await service.removeMember(id, userId, user);
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

  // GET /categories/:id/membership-status — 내 멤버십 상태 확인
  router.get(
    '/categories/:id/membership-status',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id } = req.params;
      const result = await service.getMembershipStatus(id, user.id);
      res.json({ success: true, data: result.data });
    }),
  );

  return router;
}
