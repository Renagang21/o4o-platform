/**
 * GlycoPharm Operator Forum Delete Request Controller
 *
 * WO-O4O-FORUM-DELETE-REQUEST-V1
 * 포럼 삭제 요청 심사 API
 *
 * Mount: /api/v1/glycopharm/operator/forum-delete-requests
 *
 * Endpoints:
 *   GET  /             - 삭제 요청 목록
 *   GET  /pending-count - 대기 중인 삭제 요청 수
 *   POST /:id/approve  - 승인 (isActive=false 처리)
 *   POST /:id/reject   - 반려
 */

import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import { ForumCategory } from '@o4o/forum-core/entities';
import { FORUM_ORGS } from '../../../controllers/forum/forum-organizations.js';
import logger from '../../../utils/logger.js';

export function createOperatorForumDeleteRequestController(): Router {
  const router = Router();
  // Auth + scope guard is applied by parent operator router

  const categoryRepo = () => AppDataSource.getRepository(ForumCategory);

  /** GET / — 삭제 요청 목록 */
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const statusFilter = req.query.status as string || 'pending';

      const qb = categoryRepo()
        .createQueryBuilder('cat')
        .leftJoinAndSelect('cat.creator', 'creator')
        .where(`cat.metadata->>'deleteRequestStatus' = :status`, { status: statusFilter })
        .andWhere('cat.organizationId = :orgId', { orgId: FORUM_ORGS.GLYCOPHARM })
        .orderBy(`cat.metadata->>'deleteRequestedAt'`, 'DESC');

      const categories = await qb.getMany();

      const data = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        slug: cat.slug,
        isActive: cat.isActive,
        postCount: cat.postCount,
        createdBy: cat.createdBy,
        creatorName: (cat as any).creator?.name || null,
        deleteRequestStatus: cat.metadata?.deleteRequestStatus,
        deleteRequestedAt: cat.metadata?.deleteRequestedAt,
        deleteRequestReason: cat.metadata?.deleteRequestReason,
        deleteReviewedAt: cat.metadata?.deleteReviewedAt,
        deleteReviewComment: cat.metadata?.deleteReviewComment,
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
      const count = await categoryRepo()
        .createQueryBuilder('cat')
        .where(`cat.metadata->>'deleteRequestStatus' = :status`, { status: 'pending' })
        .andWhere('cat.organizationId = :orgId', { orgId: FORUM_ORGS.GLYCOPHARM })
        .getCount();

      res.json({ success: true, data: { count } });
    } catch (error: any) {
      logger.error('Error getting pending delete request count:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /** POST /:id/approve — 승인 (isActive=false 처리) */
  router.post('/:id/approve', async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { reviewComment } = req.body;

      const category = await categoryRepo().findOne({ where: { id: req.params.id } });
      if (!category) {
        res.status(404).json({ success: false, error: 'Category not found' });
        return;
      }

      const meta = category.metadata || {};
      if (meta.deleteRequestStatus !== 'pending') {
        res.status(400).json({ success: false, error: 'No pending delete request for this category' });
        return;
      }

      category.isActive = false;
      category.metadata = {
        ...meta,
        deleteRequestStatus: 'approved',
        deleteReviewedAt: new Date().toISOString(),
        deleteReviewedBy: userId,
        deleteReviewComment: reviewComment?.trim() || null,
        archivedAt: new Date().toISOString(),
      };

      const updated = await categoryRepo().save(category);

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

      const category = await categoryRepo().findOne({ where: { id: req.params.id } });
      if (!category) {
        res.status(404).json({ success: false, error: 'Category not found' });
        return;
      }

      const meta = category.metadata || {};
      if (meta.deleteRequestStatus !== 'pending') {
        res.status(400).json({ success: false, error: 'No pending delete request for this category' });
        return;
      }

      category.metadata = {
        ...meta,
        deleteRequestStatus: 'rejected',
        deleteReviewedAt: new Date().toISOString(),
        deleteReviewedBy: userId,
        deleteReviewComment: reviewComment?.trim() || null,
      };

      const updated = await categoryRepo().save(category);

      res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Error rejecting forum delete request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
