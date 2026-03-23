/**
 * Common Forum Operator Routes
 *
 * WO-O4O-FORUM-OPERATOR-UNIFICATION-V1
 * 서비스 공통 포럼 운영자 API — serviceCode 기반 격리
 *
 * Mount: /api/v1/forum/operator
 *
 * Request Review:
 *   GET    /requests                - 전체 신청 목록
 *   GET    /requests/pending-count  - 대기 중인 신청 수
 *   GET    /requests/:id            - 신청 상세
 *   PATCH  /requests/:id/review     - 심사 (approve/reject/revision)
 *
 * Delete Request Review:
 *   GET    /delete-requests                - 삭제 요청 목록
 *   GET    /delete-requests/pending-count  - 대기 중인 삭제 요청 수
 *   POST   /delete-requests/:id/approve    - 승인 (isActive=false)
 *   POST   /delete-requests/:id/reject     - 반려
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { forumCategoryRequestService } from '../../services/forum/ForumCategoryRequestService.js';
import { isServiceOperator } from '../../utils/role.utils.js';
import { AppDataSource } from '../../database/connection.js';
import { ForumCategory } from '@o4o/forum-core/entities';
import { ForumCategoryRequest } from '@o4o/forum-core/entities';
import type { AuthRequest } from '../../types/auth.js';
import type { ServiceKey } from '../../types/roles.js';
import logger from '../../utils/logger.js';

/**
 * Service catalog code → RBAC ServiceKey mapping.
 * DB stores 'k-cosmetics' / 'kpa-society' but RBAC uses 'cosmetics' / 'kpa'.
 */
const SERVICE_CODE_TO_RBAC_KEY: Record<string, ServiceKey> = {
  glycopharm: 'glycopharm',
  neture: 'neture',
  'k-cosmetics': 'cosmetics',
  'kpa-society': 'kpa',
};

const VALID_SERVICE_CODES = Object.keys(SERVICE_CODE_TO_RBAC_KEY);

const router: Router = Router();

// All operator routes require authentication
router.use(authenticate);

/**
 * Middleware: extract and validate serviceCode, check operator permission
 */
function requireServiceOperator(req: Request, res: Response, next: Function): void {
  const serviceCode = (req.query.serviceCode as string) || '';
  if (!serviceCode || !VALID_SERVICE_CODES.includes(serviceCode)) {
    res.status(400).json({ success: false, error: 'Valid serviceCode query param is required' });
    return;
  }

  const rbacKey = SERVICE_CODE_TO_RBAC_KEY[serviceCode];
  const user = (req as AuthRequest).user;
  if (!user || !isServiceOperator(user.roles || [], rbacKey)) {
    res.status(403).json({ success: false, error: 'Operator access required for this service' });
    return;
  }

  // Store validated serviceCode on request for downstream handlers
  (req as any)._serviceCode = serviceCode;
  next();
}

router.use(requireServiceOperator);

// ============================================================================
// REQUEST REVIEW — delegates to ForumCategoryRequestService
// ============================================================================

/** GET /requests — 전체 신청 목록 */
router.get('/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await forumCategoryRequestService.listByService({
      serviceCode,
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
    logger.error('Error listing forum requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** GET /requests/pending-count — 대기 중인 신청 수 */
router.get('/requests/pending-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const result = await forumCategoryRequestService.getPendingCount(serviceCode);

    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: result.error.message });
      return;
    }

    res.json({ success: true, ...result.data });
  } catch (error: any) {
    logger.error('Error getting pending request count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** GET /requests/:id — 신청 상세 */
router.get('/requests/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const result = await forumCategoryRequestService.getDetail(req.params.id, serviceCode);

    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    logger.error('Error getting forum request detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** PATCH /requests/:id/review — 심사 (approve/reject/revision) */
router.patch('/requests/:id/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const user = (req as AuthRequest).user!;
    const { action, reviewComment } = req.body;

    if (!action || !['approve', 'reject', 'revision'].includes(action)) {
      res.status(400).json({ success: false, error: 'action must be approve, reject, or revision' });
      return;
    }

    const result = await forumCategoryRequestService.review(
      req.params.id,
      serviceCode,
      { id: user.id, name: user.name, email: user.email, roles: user.roles },
      { action, reviewComment },
    );

    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    logger.error('Error reviewing forum request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DELETE REQUEST REVIEW — direct DB queries on forum_category metadata
// Scoped via forum_category_requests.serviceCode join
// ============================================================================

const categoryRepo = () => AppDataSource.getRepository(ForumCategory);
const requestRepo = () => AppDataSource.getRepository(ForumCategoryRequest);

/**
 * Find category IDs that belong to a specific service.
 * Uses forum_category_requests.createdCategoryId for serviceCode scoping.
 * Also includes categories directly linked via organizationId for backward compat.
 */
async function getCategoryIdsForService(serviceCode: string): Promise<string[]> {
  const rows = await requestRepo()
    .createQueryBuilder('r')
    .select('r.createdCategoryId', 'catId')
    .where('r.serviceCode = :serviceCode', { serviceCode })
    .andWhere('r.createdCategoryId IS NOT NULL')
    .getRawMany();
  return rows.map((r: any) => r.catId).filter(Boolean);
}

/** GET /delete-requests — 삭제 요청 목록 */
router.get('/delete-requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const statusFilter = req.query.status as string || 'pending';

    const categoryIds = await getCategoryIdsForService(serviceCode);
    if (categoryIds.length === 0) {
      res.json({ success: true, data: [], count: 0 });
      return;
    }

    const qb = categoryRepo()
      .createQueryBuilder('cat')
      .leftJoinAndSelect('cat.creator', 'creator')
      .where(`cat.metadata->>'deleteRequestStatus' = :status`, { status: statusFilter })
      .andWhere('cat.id IN (:...categoryIds)', { categoryIds })
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

/** GET /delete-requests/pending-count — 대기 중인 삭제 요청 수 */
router.get('/delete-requests/pending-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const categoryIds = await getCategoryIdsForService(serviceCode);

    if (categoryIds.length === 0) {
      res.json({ success: true, data: { count: 0 } });
      return;
    }

    const count = await categoryRepo()
      .createQueryBuilder('cat')
      .where(`cat.metadata->>'deleteRequestStatus' = :status`, { status: 'pending' })
      .andWhere('cat.id IN (:...categoryIds)', { categoryIds })
      .getCount();

    res.json({ success: true, data: { count } });
  } catch (error: any) {
    logger.error('Error getting pending delete request count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST /delete-requests/:id/approve — 승인 (isActive=false 처리) */
router.post('/delete-requests/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;
    const { reviewComment } = req.body;

    // Verify category belongs to this service
    const categoryIds = await getCategoryIdsForService(serviceCode);
    if (!categoryIds.includes(req.params.id)) {
      res.status(404).json({ success: false, error: 'Category not found for this service' });
      return;
    }

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

/** POST /delete-requests/:id/reject — 반려 */
router.post('/delete-requests/:id/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;
    const { reviewComment } = req.body;

    // Verify category belongs to this service
    const categoryIds = await getCategoryIdsForService(serviceCode);
    if (!categoryIds.includes(req.params.id)) {
      res.status(404).json({ success: false, error: 'Category not found for this service' });
      return;
    }

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

// ============================================================================
// ANALYTICS — read-only aggregation queries
// WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1
// ============================================================================

/** GET /analytics/summary — KPI summary for the service */
router.get('/analytics/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;

    // Category stats (scoped via approved requests)
    const categoryIds = await getCategoryIdsForService(serviceCode);
    let totalForums = 0;
    let activeForums = 0;
    let totalPosts = 0;

    if (categoryIds.length > 0) {
      const catStats = await categoryRepo()
        .createQueryBuilder('cat')
        .select('COUNT(*)::int', 'total')
        .addSelect('COUNT(*) FILTER (WHERE cat.isActive = true)::int', 'active')
        .addSelect('COALESCE(SUM(cat.postCount), 0)::int', 'posts')
        .where('cat.id IN (:...categoryIds)', { categoryIds })
        .getRawOne();
      totalForums = catStats?.total || 0;
      activeForums = catStats?.active || 0;
      totalPosts = catStats?.posts || 0;
    }

    // Request stats (scoped by serviceCode)
    const reqStats = await requestRepo()
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)::int', 'cnt')
      .where('r.serviceCode = :serviceCode', { serviceCode })
      .groupBy('r.status')
      .getRawMany();

    const statusCounts: Record<string, number> = {};
    for (const row of reqStats) {
      statusCounts[row.status] = row.cnt;
    }

    // Delete request stats
    let deleteRequestsPending = 0;
    if (categoryIds.length > 0) {
      deleteRequestsPending = await categoryRepo()
        .createQueryBuilder('cat')
        .where(`cat.metadata->>'deleteRequestStatus' = :status`, { status: 'pending' })
        .andWhere('cat.id IN (:...categoryIds)', { categoryIds })
        .getCount();
    }

    res.json({
      success: true,
      data: {
        totalForums,
        activeForums,
        totalPosts,
        pendingRequests: statusCounts['pending'] || 0,
        revisionRequests: statusCounts['revision_requested'] || 0,
        approvedRequests: statusCounts['approved'] || 0,
        rejectedRequests: statusCounts['rejected'] || 0,
        deleteRequestsPending,
      },
    });
  } catch (error: any) {
    logger.error('Error getting forum analytics summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** GET /analytics/trend — daily request/approval trend (last 30 days) */
router.get('/analytics/trend', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Daily request counts
    const daily = await requestRepo()
      .createQueryBuilder('r')
      .select(`TO_CHAR(r.created_at, 'YYYY-MM-DD')`, 'date')
      .addSelect('COUNT(*)::int', 'requests')
      .addSelect(`COUNT(*) FILTER (WHERE r.status = 'approved')::int`, 'approved')
      .addSelect(`COUNT(*) FILTER (WHERE r.status = 'rejected')::int`, 'rejected')
      .where('r.serviceCode = :serviceCode', { serviceCode })
      .andWhere(`r.createdAt >= :fromDate`, { fromDate })
      .groupBy(`TO_CHAR(r.created_at, 'YYYY-MM-DD')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    res.json({ success: true, data: { daily, days } });
  } catch (error: any) {
    logger.error('Error getting forum analytics trend:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** GET /analytics/activity — recent review activity */
router.get('/analytics/activity', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    // Recent reviewed requests
    const reviewed = await requestRepo()
      .createQueryBuilder('r')
      .select([
        'r.id', 'r.name', 'r.status', 'r.reviewerName',
        'r.reviewComment', 'r.reviewedAt', 'r.requesterName',
      ])
      .where('r.serviceCode = :serviceCode', { serviceCode })
      .andWhere('r.reviewedAt IS NOT NULL')
      .orderBy('r.reviewedAt', 'DESC')
      .limit(limit)
      .getMany();

    const activity = reviewed.map((r) => ({
      id: r.id,
      type: 'review' as const,
      name: r.name,
      status: r.status,
      reviewerName: r.reviewerName,
      reviewComment: r.reviewComment,
      requesterName: r.requesterName,
      timestamp: r.reviewedAt,
    }));

    res.json({ success: true, data: activity });
  } catch (error: any) {
    logger.error('Error getting forum analytics activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
