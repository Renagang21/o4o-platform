/**
 * GlycoPharm Operator Forum Request Controller
 *
 * WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1
 * GlycoPharm 운영자 포럼 카테고리 심사 API
 *
 * Mount: /api/v1/glycopharm/operator/forum-requests
 *
 * Endpoints:
 *   GET  /                - 전체 신청 목록 (페이지네이션)
 *   GET  /pending-count   - 대기 중인 신청 수
 *   GET  /:id             - 신청 상세
 *   PATCH /:id/review     - 심사 (approve/reject/revision)
 */

import { Router, Request, Response } from 'express';
import { forumRequestService } from '../../../services/forum/ForumRequestService.js';
import type { AuthRequest } from '../../../types/auth.js';

const SERVICE_CODE = 'glycopharm';

export function createOperatorForumRequestController(): Router {
  const router = Router();
  // Auth + scope guard is applied by parent operator router

  /** GET / — 전체 신청 목록 */
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await forumRequestService.listByService({
        serviceCode: SERVICE_CODE,
        status,
        page,
        limit,
      });

      if ('error' in result) {
        res.status(result.error.status).json({ success: false, error: result.error.message });
        return;
      }

      res.json({ success: true, ...result.data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /** GET /pending-count — 대기 중인 신청 수 */
  router.get('/pending-count', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await forumRequestService.getPendingCount(SERVICE_CODE);

      if ('error' in result) {
        res.status(result.error.status).json({ success: false, error: result.error.message });
        return;
      }

      res.json({ success: true, ...result.data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /** GET /:id — 신청 상세 */
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await forumRequestService.getDetail(req.params.id, SERVICE_CODE);

      if ('error' in result) {
        res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
        return;
      }

      res.json({ success: true, data: result.data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /** PATCH /:id/review — 심사 (approve/reject/revision) */
  router.patch('/:id/review', async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user!;
      const { action, reviewComment } = req.body;

      if (!action || !['approve', 'reject', 'revision'].includes(action)) {
        res.status(400).json({ success: false, error: 'action must be approve, reject, or revision' });
        return;
      }

      const result = await forumRequestService.review(
        req.params.id,
        SERVICE_CODE,
        { id: user.id, name: user.name, email: user.email, roles: user.roles },
        { action, reviewComment },
      );

      if ('error' in result) {
        res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
        return;
      }

      res.json({ success: true, data: result.data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
