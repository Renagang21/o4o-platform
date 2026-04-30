/**
 * GlycoPharm Operator Forum Delete Request Controller
 *
 * WO-O4O-FORUM-DELETE-REQUEST-V1
 * WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1: forum_category 제거 → forum_category_requests 기반으로 전환
 *
 * Mount: /api/v1/glycopharm/operator/forum-delete-requests
 *
 * Endpoints:
 *   GET  /             - 삭제 요청 목록
 *   GET  /pending-count - 대기 중인 삭제 요청 수
 *   POST /:id/approve  - 승인 (status → archived)
 *   POST /:id/reject   - 반려
 */

import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import { ForumCategoryRequest } from '@o4o/forum-core/entities';
import { FORUM_ORGS } from '../../../controllers/forum/forum-organizations.js';
import logger from '../../../utils/logger.js';

export function createOperatorForumDeleteRequestController(): Router {
  const router = Router();
  // Auth + scope guard is applied by parent operator router

  const requestRepo = () => AppDataSource.getRepository(ForumCategoryRequest);

  /** GET / — 삭제 요청 목록 */
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const statusFilter = req.query.status as string || 'pending';

      const forums = await requestRepo()
        .createQueryBuilder('forum')
        .where(`forum.metadata->>'deleteRequestStatus' = :status`, { status: statusFilter })
        .andWhere('forum.organizationId = :orgId', { orgId: FORUM_ORGS.GLYCOPHARM })
        .orderBy(`forum.metadata->>'deleteRequestedAt'`, 'DESC')
        .getMany();

      const data = forums.map((forum) => ({
        id: forum.id,
        name: forum.name,
        description: forum.description,
        slug: forum.slug,
        isActive: forum.status === 'completed',
        postCount: null,
        createdBy: forum.requesterId,
        creatorName: forum.requesterName,
        deleteRequestStatus: forum.metadata?.deleteRequestStatus,
        deleteRequestedAt: forum.metadata?.deleteRequestedAt,
        deleteRequestReason: forum.metadata?.deleteRequestReason,
        deleteReviewedAt: forum.metadata?.deleteReviewedAt,
        deleteReviewComment: forum.metadata?.deleteReviewComment,
      }));

      res.json({ success: true, data, count: data.length });
    } catch (error: any) {
      logger.error('Error listing forum delete requests:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /** GET /pending-count — 대기 중인 삭제 요청 수 */
  router.get('/pending-count', async (_req: Request, res: Response): Promise<void> => {
    try {
      const count = await requestRepo()
        .createQueryBuilder('forum')
        .where(`forum.metadata->>'deleteRequestStatus' = :status`, { status: 'pending' })
        .andWhere('forum.organizationId = :orgId', { orgId: FORUM_ORGS.GLYCOPHARM })
        .getCount();

      res.json({ success: true, data: { count } });
    } catch (error: any) {
      logger.error('Error getting pending delete request count:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /** POST /:id/approve — 승인 (status → archived) */
  router.post('/:id/approve', async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { reviewComment } = req.body;

      const forum = await requestRepo().findOne({ where: { id: req.params.id } });
      if (!forum) {
        res.status(404).json({ success: false, error: 'Forum not found' });
        return;
      }

      const meta = forum.metadata || {};
      if (meta.deleteRequestStatus !== 'pending') {
        res.status(400).json({ success: false, error: 'No pending delete request for this forum' });
        return;
      }

      forum.status = 'archived';
      forum.metadata = {
        ...meta,
        deleteRequestStatus: 'approved',
        deleteReviewedAt: new Date().toISOString(),
        deleteReviewedBy: userId,
        deleteReviewComment: reviewComment?.trim() || null,
        archivedAt: new Date().toISOString(),
      };

      const updated = await requestRepo().save(forum);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Error approving forum delete request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /** POST /:id/reject — 반려 */
  router.post('/:id/reject', async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { reviewComment } = req.body;

      const forum = await requestRepo().findOne({ where: { id: req.params.id } });
      if (!forum) {
        res.status(404).json({ success: false, error: 'Forum not found' });
        return;
      }

      const meta = forum.metadata || {};
      if (meta.deleteRequestStatus !== 'pending') {
        res.status(400).json({ success: false, error: 'No pending delete request for this forum' });
        return;
      }

      forum.metadata = {
        ...meta,
        deleteRequestStatus: 'rejected',
        deleteReviewedAt: new Date().toISOString(),
        deleteReviewedBy: userId,
        deleteReviewComment: reviewComment?.trim() || null,
      };

      const updated = await requestRepo().save(forum);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Error rejecting forum delete request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
