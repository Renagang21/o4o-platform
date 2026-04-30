/**
 * Common Forum Operator Routes
 *
 * WO-O4O-FORUM-OPERATOR-UNIFICATION-V1
 * 서비스 공통 포럼 운영자 API — serviceCode 기반 격리
 *
 * WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1
 * forum_category 테이블 제거 후 forum_category_requests 기반으로 전환.
 * forum_category_requests.id = forum identifier (SSOT)
 * status: 'completed' = active forum, 'archived' = deactivated forum
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
 *   POST   /delete-requests/:id/approve    - 승인 (status → archived)
 *   POST   /delete-requests/:id/reject     - 반려
 *
 * Batch (V3):
 *   POST   /requests/batch-review           - 일괄 심사 (approve/reject)
 *   POST   /delete-requests/batch-approve   - 일괄 삭제 승인
 *   POST   /delete-requests/batch-reject    - 일괄 삭제 반려
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { forumCategoryRequestService } from '../../services/forum/ForumCategoryRequestService.js';
import { isServiceOperator } from '../../utils/role.utils.js';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost, ForumCategoryMember } from '@o4o/forum-core/entities';
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

/** POST /requests/:id/create — 포럼 생성 실행 (approved 상태에서만) */
router.post('/requests/:id/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const result = await forumCategoryRequestService.createForumFromRequest(req.params.id, serviceCode);

    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    logger.error('Error creating forum from request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST /requests/:id/recreate — 포럼 재생성 (failed 상태에서만) — create와 동일 로직, 의미 구분용 alias */
router.post('/requests/:id/recreate', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const result = await forumCategoryRequestService.createForumFromRequest(req.params.id, serviceCode);

    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    logger.error('Error recreating forum from request:', error);
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
// DELETE REQUEST REVIEW — forum_category_requests metadata-based deletion flow
// WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1: categoryRepo() removed, uses requestRepo()
// ============================================================================

const requestRepo = () => AppDataSource.getRepository(ForumCategoryRequest);
const postRepo = () => AppDataSource.getRepository(ForumPost);
const memberRepo = () => AppDataSource.getRepository(ForumCategoryMember);

/**
 * Find forum IDs (forum_category_requests.id) that belong to a specific service.
 * Returns all completed/archived forums for the service.
 */
async function getForumIdsForService(serviceCode: string): Promise<string[]> {
  const rows = await requestRepo()
    .createQueryBuilder('r')
    .select('r.id', 'forumId')
    .where('r.serviceCode = :serviceCode', { serviceCode })
    .andWhere('r.status IN (:...statuses)', { statuses: ['completed', 'archived'] })
    .getRawMany();
  return rows.map((r: any) => r.forumId).filter(Boolean);
}

/** GET /delete-requests — 삭제 요청 목록 */
router.get('/delete-requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const statusFilter = req.query.status as string || 'pending';

    const forumIds = await getForumIdsForService(serviceCode);
    if (forumIds.length === 0) {
      res.json({ success: true, data: [], count: 0 });
      return;
    }

    const forums = await requestRepo()
      .createQueryBuilder('forum')
      .where(`forum.metadata->>'deleteRequestStatus' = :status`, { status: statusFilter })
      .andWhere('forum.id IN (:...forumIds)', { forumIds })
      .orderBy(`forum.metadata->>'deleteRequestedAt'`, 'DESC')
      .getMany();

    const data = forums.map((forum) => ({
      id: forum.id,
      name: forum.name,
      description: forum.description,
      slug: forum.slug,
      isActive: forum.status === 'completed',
      postCount: null, // computed on demand — use delete-check endpoint
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

/** GET /delete-requests/pending-count — 대기 중인 삭제 요청 수 */
router.get('/delete-requests/pending-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const forumIds = await getForumIdsForService(serviceCode);

    if (forumIds.length === 0) {
      res.json({ success: true, data: { count: 0 } });
      return;
    }

    const count = await requestRepo()
      .createQueryBuilder('forum')
      .where(`forum.metadata->>'deleteRequestStatus' = :status`, { status: 'pending' })
      .andWhere('forum.id IN (:...forumIds)', { forumIds })
      .getCount();

    res.json({ success: true, data: { count } });
  } catch (error: any) {
    logger.error('Error getting pending delete request count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST /delete-requests/:id/approve — 승인 (status → archived) */
router.post('/delete-requests/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;
    const { reviewComment } = req.body;

    const forumIds = await getForumIdsForService(serviceCode);
    if (!forumIds.includes(req.params.id)) {
      res.status(404).json({ success: false, error: 'Forum not found for this service' });
      return;
    }

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

/** POST /delete-requests/:id/reject — 반려 */
router.post('/delete-requests/:id/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;
    const { reviewComment } = req.body;

    const forumIds = await getForumIdsForService(serviceCode);
    if (!forumIds.includes(req.params.id)) {
      res.status(404).json({ success: false, error: 'Forum not found for this service' });
      return;
    }

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

// ============================================================================
// BATCH ENDPOINTS — WO-O4O-TABLE-STANDARD-V3-EXPANSION
// ============================================================================

/** POST /requests/batch-review — 일괄 심사 (ForumManagementPage) */
router.post('/requests/batch-review', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const user = (req as AuthRequest).user!;
    const { ids, action, reviewComment } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }
    if (!action || !['approve', 'reject'].includes(action)) {
      res.status(400).json({ success: false, error: 'action must be approve or reject' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];

    for (const id of ids) {
      try {
        const result = await forumCategoryRequestService.review(
          id,
          serviceCode,
          { id: user.id, name: user.name, email: user.email, roles: user.roles },
          { action, reviewComment },
        );
        if ('error' in result) {
          results.push({ id, status: 'skipped', error: result.error.message });
        } else {
          results.push({ id, status: 'success' });
        }
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }

    res.json({ success: true, data: { results } });
  } catch (error: any) {
    logger.error('Error batch reviewing forum requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST /delete-requests/batch-approve — 일괄 삭제 승인 */
router.post('/delete-requests/batch-approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;
    const { ids, reviewComment } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const forumIds = await getForumIdsForService(serviceCode);
    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];

    for (const id of ids) {
      try {
        if (!forumIds.includes(id)) {
          results.push({ id, status: 'failed', error: 'Forum not found for this service' });
          continue;
        }
        const forum = await requestRepo().findOne({ where: { id } });
        if (!forum) {
          results.push({ id, status: 'failed', error: 'Forum not found' });
          continue;
        }
        const meta = forum.metadata || {};
        if (meta.deleteRequestStatus !== 'pending') {
          results.push({ id, status: 'skipped', error: 'No pending delete request' });
          continue;
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
        await requestRepo().save(forum);
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }

    res.json({ success: true, data: { results } });
  } catch (error: any) {
    logger.error('Error batch approving forum delete requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST /delete-requests/batch-reject — 일괄 삭제 반려 */
router.post('/delete-requests/batch-reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;
    const { ids, reviewComment } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const forumIds = await getForumIdsForService(serviceCode);
    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];

    for (const id of ids) {
      try {
        if (!forumIds.includes(id)) {
          results.push({ id, status: 'failed', error: 'Forum not found for this service' });
          continue;
        }
        const forum = await requestRepo().findOne({ where: { id } });
        if (!forum) {
          results.push({ id, status: 'failed', error: 'Forum not found' });
          continue;
        }
        const meta = forum.metadata || {};
        if (meta.deleteRequestStatus !== 'pending') {
          results.push({ id, status: 'skipped', error: 'No pending delete request' });
          continue;
        }
        forum.metadata = {
          ...meta,
          deleteRequestStatus: 'rejected',
          deleteReviewedAt: new Date().toISOString(),
          deleteReviewedBy: userId,
          deleteReviewComment: reviewComment?.trim() || null,
        };
        await requestRepo().save(forum);
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }

    res.json({ success: true, data: { results } });
  } catch (error: any) {
    logger.error('Error batch rejecting forum delete requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DIRECT FORUM MANAGEMENT — operator direct deactivation
// WO-KPA-A-OPERATOR-FORUM-DIRECT-SOFT-DELETE-V1
// WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1: uses forum_category_requests
// ============================================================================

/** GET /categories — all forums for service (active + inactive) */
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;

    const forums = await requestRepo()
      .createQueryBuilder('forum')
      .where('forum.serviceCode = :serviceCode', { serviceCode })
      .andWhere('forum.status IN (:...statuses)', { statuses: ['completed', 'archived'] })
      .orderBy('forum.createdAt', 'DESC')
      .getMany();

    const data = forums.map((forum) => ({
      id: forum.id,
      name: forum.name,
      description: forum.description,
      slug: forum.slug,
      isActive: forum.status === 'completed',
      status: forum.status,
      forumType: forum.forumType,
      tags: forum.tags || [],
      createdBy: forum.requesterId,
      creatorName: forum.requesterName,
      createdAt: forum.createdAt,
      updatedAt: forum.updatedAt,
    }));

    res.json({ success: true, data, count: data.length });
  } catch (error: any) {
    logger.error('Error listing forums:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** PATCH /categories/:id — operator forum info update (name, description, tags) */
router.patch('/categories/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const { name, description, tags } = req.body;

    const forum = await requestRepo().findOne({
      where: { id: req.params.id, serviceCode },
    });
    if (!forum || !['completed', 'archived'].includes(forum.status)) {
      res.status(404).json({ success: false, error: 'Forum not found for this service' });
      return;
    }

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed || trimmed.length < 2 || trimmed.length > 50) {
        res.status(400).json({ success: false, error: '포럼 이름은 2~50자여야 합니다' });
        return;
      }
      forum.name = trimmed;
    }

    if (description !== undefined) {
      forum.description = description ? String(description).trim() : '';
    }

    if (tags !== undefined) {
      const sanitized = [...new Set<string>(
        (Array.isArray(tags) ? tags : [])
          .map((t: string) => String(t).trim().replace(/^#/, ''))
          .filter(Boolean)
          .filter((t: string) => t.length <= 30)
      )];
      forum.tags = sanitized;
    }

    const updated = await requestRepo().save(forum);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error('Error updating forum:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST /categories/:id/deactivate — operator direct soft delete (status → archived) */
router.post('/categories/:id/deactivate', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;
    const { reason } = req.body;

    if (!reason?.trim()) {
      res.status(400).json({ success: false, error: '삭제 사유를 입력해주세요', code: 'REASON_REQUIRED' });
      return;
    }

    const forum = await requestRepo().findOne({
      where: { id: req.params.id, serviceCode },
    });
    if (!forum || !['completed', 'archived'].includes(forum.status)) {
      res.status(404).json({ success: false, error: 'Forum not found for this service' });
      return;
    }

    if (forum.status !== 'completed') {
      res.status(400).json({ success: false, error: '이미 비활성화된 포럼입니다', code: 'ALREADY_INACTIVE' });
      return;
    }

    const meta = forum.metadata || {};
    forum.status = 'archived';
    forum.metadata = {
      ...meta,
      directDeactivatedAt: new Date().toISOString(),
      directDeactivatedBy: userId,
      directDeactivateReason: reason.trim(),
      archivedAt: new Date().toISOString(),
    };

    await requestRepo().save(forum);
    logger.info(`Forum ${forum.id} deactivated by operator ${userId} (reason: ${reason.trim()})`);
    res.json({ success: true, data: { id: forum.id, isActive: false } });
  } catch (error: any) {
    logger.error('Error deactivating forum:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** GET /categories/:id/delete-check — hard delete pre-flight check */
router.get('/categories/:id/delete-check', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;

    const forum = await requestRepo().findOne({
      where: { id: req.params.id, serviceCode },
    });
    if (!forum || !['completed', 'archived'].includes(forum.status)) {
      res.status(404).json({ success: false, error: 'Forum not found for this service' });
      return;
    }

    const [postCount, totalMemberCount, ownerCount] = await Promise.all([
      postRepo().count({ where: { forumId: req.params.id } }),
      memberRepo().count({ where: { forumCategoryId: req.params.id } }),
      memberRepo().count({ where: { forumCategoryId: req.params.id, role: 'owner' } }),
    ]);
    const generalMemberCount = totalMemberCount - ownerCount;

    // 고아 게시글 판별: authorId가 NULL이거나 users 테이블에 존재하지 않는 게시글
    // WO-KPA-FORUM-ORPHAN-POST-FORCE-CLEANUP-V1
    let orphanPostCount = 0;
    if (postCount > 0) {
      const orphanRows = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count
         FROM forum_post fp
         LEFT JOIN users u ON u.id = fp.author_id
         WHERE fp.forum_id = $1 AND u.id IS NULL`,
        [req.params.id],
      );
      orphanPostCount = parseInt(orphanRows[0]?.count ?? '0', 10);
    }
    const normalPostCount = postCount - orphanPostCount;

    // 운영자 hard delete: 정상 게시글만 차단, 고아 게시글은 자동 정리 허용
    const blockedReasons: string[] = [];
    if (normalPostCount > 0) blockedReasons.push(`정상 게시글 ${normalPostCount}건이 남아 있어 삭제할 수 없습니다`);

    const warnings: string[] = [];
    if (orphanPostCount > 0) warnings.push(`고아 게시글 ${orphanPostCount}건이 자동 정리됩니다 (작성자 계정 없음)`);
    if (generalMemberCount > 0) warnings.push(`일반 멤버 ${generalMemberCount}명의 멤버십이 함께 삭제됩니다`);
    if (ownerCount > 0) warnings.push(`개설자 멤버십이 함께 삭제됩니다`);

    res.json({
      success: true,
      data: {
        postCount,
        normalPostCount,
        orphanPostCount,
        memberCount: totalMemberCount,
        generalMemberCount,
        ownerCount,
        hardDeleteAllowed: blockedReasons.length === 0,
        blockedReasons,
        warnings,
      },
    });
  } catch (error: any) {
    logger.error('Error checking hard delete eligibility:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** DELETE /categories/:id/hard — operator permanent hard delete */
router.delete('/categories/:id/hard', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;
    const { reason } = req.body;

    if (!reason?.trim()) {
      res.status(400).json({ success: false, error: '삭제 사유를 입력해주세요', code: 'REASON_REQUIRED' });
      return;
    }

    const forum = await requestRepo().findOne({
      where: { id: req.params.id, serviceCode },
    });
    if (!forum || !['completed', 'archived'].includes(forum.status)) {
      res.status(404).json({ success: false, error: 'Forum not found for this service' });
      return;
    }

    // Re-check: 정상 게시글만 차단, 고아 게시글은 자동 정리 허용
    const postCount = await postRepo().count({ where: { forumId: req.params.id } });

    if (postCount > 0) {
      const orphanRows = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count
         FROM forum_post fp
         LEFT JOIN users u ON u.id = fp.author_id
         WHERE fp.forum_id = $1 AND u.id IS NULL`,
        [req.params.id],
      );
      const orphanPostCount = parseInt(orphanRows[0]?.count ?? '0', 10);
      const normalPostCount = postCount - orphanPostCount;

      if (normalPostCount > 0) {
        res.status(409).json({
          success: false,
          error: '정상 게시글이 남아 있어 영구 삭제를 할 수 없습니다',
          code: 'HARD_DELETE_BLOCKED',
          data: { blockedReasons: [`정상 게시글 ${normalPostCount}건이 남아 있습니다`], normalPostCount, orphanPostCount },
        });
        return;
      }

      // 고아 게시글만 남은 경우 → 자동 정리 후 진행
      const deletedPosts = await postRepo().delete({ forumId: req.params.id });
      logger.info(`Forum ${forum.id} (${forum.name}): 고아 게시글 ${deletedPosts.affected ?? 0}건 자동 정리 (operator: ${userId})`);
    }

    // 멤버십 cascade 삭제 (owner 포함) → FK 위반 방지
    const deletedMembers = await memberRepo().delete({ forumCategoryId: req.params.id });
    logger.info(`Forum ${forum.id} (${forum.name}) hard deleted by operator ${userId} (reason: ${reason.trim()}, members removed: ${deletedMembers.affected ?? 0})`);
    await requestRepo().remove(forum);

    res.json({ success: true, data: { id: req.params.id, name: forum.name, hardDeleted: true } });
  } catch (error: any) {
    logger.error('Error hard deleting forum:', error);
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

    // Forum stats from forum_category_requests
    const forumStats = await requestRepo()
      .createQueryBuilder('forum')
      .select('COUNT(*) FILTER (WHERE forum.status IN (\'completed\', \'archived\'))::int', 'total')
      .addSelect('COUNT(*) FILTER (WHERE forum.status = \'completed\')::int', 'active')
      .where('forum.serviceCode = :serviceCode', { serviceCode })
      .getRawOne();

    const totalForums = forumStats?.total || 0;
    const activeForums = forumStats?.active || 0;

    // Post count — count posts by forum_id scoped to service forums
    const forumIds = await getForumIdsForService(serviceCode);
    let totalPosts = 0;
    if (forumIds.length > 0) {
      const postStats = await postRepo()
        .createQueryBuilder('post')
        .select('COUNT(*)::int', 'total')
        .where('post.forumId IN (:...forumIds)', { forumIds })
        .getRawOne();
      totalPosts = postStats?.total || 0;
    }

    // Request stats (all statuses, scoped by serviceCode)
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

    // Delete request stats — forums with pending delete request
    let deleteRequestsPending = 0;
    if (forumIds.length > 0) {
      deleteRequestsPending = await requestRepo()
        .createQueryBuilder('forum')
        .where(`forum.metadata->>'deleteRequestStatus' = :status`, { status: 'pending' })
        .andWhere('forum.id IN (:...forumIds)', { forumIds })
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
