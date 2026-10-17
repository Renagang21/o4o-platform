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

import { Router, Request, Response, NextFunction } from 'express';
import { forumOperationAccess } from '../../middleware/forum-operation-access.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { forumRequestService } from '../../services/forum/ForumRequestService.js';
import { isServiceAdmin, isServiceOperator } from '../../utils/role.utils.js';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost, ForumCategoryMember } from '@o4o/forum-core/entities';
import { ForumCategoryRequest } from '@o4o/forum-core/entities';
import type { AuthRequest } from '../../types/auth.js';
import type { ServiceKey } from '../../types/roles.js';
import logger from '../../utils/logger.js';
import { ActionLogService } from '@o4o/action-log-core';
import { mergeForumMetadataPatch } from '../../services/community/community-public-read-metadata.js';
import { changeForumAvailability, hardDeleteForum } from '../../services/forum/forum-operation.service.js';
import { OperationError } from '../../services/operations/operation-audit.js';

/**
 * WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1
 * 삭제/복구 감사 로그를 공통 action_logs (@o4o/action-log-core) 에 남긴다.
 * 실패해도 주 업무를 롤백하지 않는다(감사 실패는 경고 로깅만).
 */
let _actionLog: ActionLogService | null = null;
function actionLog(): ActionLogService {
  if (!_actionLog) _actionLog = new ActionLogService(AppDataSource);
  return _actionLog;
}
async function safeAudit(
  serviceCode: string,
  userId: string | null,
  actionKey: string,
  meta: Record<string, any>,
): Promise<void> {
  try {
    await actionLog().logSuccess(serviceCode, userId, actionKey, { meta });
  } catch (err: any) {
    logger.warn(`[forum-audit] failed to record ${actionKey}: ${err?.message || err}`);
  }
}

/**
 * Service catalog code → RBAC ServiceKey mapping.
 * DB stores 'k-cosmetics' / 'kpa-society' but RBAC uses 'cosmetics' / 'kpa'.
 */
const SERVICE_CODE_TO_RBAC_KEY: Record<string, ServiceKey> = {
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
function requireServiceOperator(req: Request, res: Response, next: NextFunction): void {
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
router.use(forumOperationAccess('operator'));

// ============================================================================
// REQUEST REVIEW — delegates to ForumRequestService
// ============================================================================

/** GET /requests — 전체 신청 목록 */
router.get('/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await forumRequestService.listByService({
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
    const result = await forumRequestService.getPendingCount(serviceCode);

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
    const result = await forumRequestService.getDetail(req.params.id, serviceCode);

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
    const result = await forumRequestService.createForumFromRequest(req.params.id, serviceCode);

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
    const result = await forumRequestService.createForumFromRequest(req.params.id, serviceCode);

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

    const result = await forumRequestService.review(
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

    const beforeStatus = forum.status;
    forum.status = 'archived';
    const metadataPatch = {
      deleteRequestStatus: 'approved',
      deleteReviewedAt: new Date().toISOString(),
      deleteReviewedBy: userId,
      deleteReviewComment: reviewComment?.trim() || null,
      archivedAt: new Date().toISOString(),
    };

    await mergeForumMetadataPatch(AppDataSource, forum.id, forum.serviceCode, metadataPatch, 'archived');
    const updated = await requestRepo().findOne({ where: { id: forum.id } });
    await safeAudit(serviceCode, userId ?? null, 'forum.delete_request.approve', {
      forumId: forum.id,
      forumName: forum.name,
      serviceCode,
      action: 'delete_request_approve',
      reason: reviewComment?.trim() || null,
      actorUserId: userId ?? null,
      actorRoles: (req as AuthRequest).user?.roles ?? [],
      requestedBy: meta.deleteRequestedBy ?? null,
      beforeStatus,
      afterStatus: 'archived',
    });
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

    const metadataPatch = {
      deleteRequestStatus: 'rejected',
      deleteReviewedAt: new Date().toISOString(),
      deleteReviewedBy: userId,
      deleteReviewComment: reviewComment?.trim() || null,
    };

    await mergeForumMetadataPatch(AppDataSource, forum.id, forum.serviceCode, metadataPatch);
    const updated = await requestRepo().findOne({ where: { id: forum.id } });
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
        const result = await forumRequestService.review(
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
        const metadataPatch = {
          deleteRequestStatus: 'approved',
          deleteReviewedAt: new Date().toISOString(),
          deleteReviewedBy: userId,
          deleteReviewComment: reviewComment?.trim() || null,
          archivedAt: new Date().toISOString(),
        };
        await mergeForumMetadataPatch(AppDataSource, forum.id, forum.serviceCode, metadataPatch, 'archived');
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
        const metadataPatch = {
          deleteRequestStatus: 'rejected',
          deleteReviewedAt: new Date().toISOString(),
          deleteReviewedBy: userId,
          deleteReviewComment: reviewComment?.trim() || null,
        };
        await mergeForumMetadataPatch(AppDataSource, forum.id, forum.serviceCode, metadataPatch);
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

    await requestRepo().update({ id: forum.id, serviceCode: forum.serviceCode }, { name: forum.name, description: forum.description, tags: forum.tags });
    const updated = await requestRepo().findOne({ where: { id: forum.id } });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error('Error updating forum:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** Daily availability changes include tracked posts and required audit in one transaction. */
router.post('/categories/:id/deactivate', async (req, res) => {
  try { res.json({ success: true, data: await changeForumAvailability(AppDataSource, req.params.id, (req as any)._serviceCode, (req as AuthRequest).user!.id, false, req.body?.reason) }); }
  catch (error) { const status = error instanceof OperationError ? error.status : 500; res.status(status).json({ success: false, error: error instanceof OperationError ? error.message : '포럼 사용 중지 실패' }); }
});
router.post('/categories/:id/activate', async (req, res) => {
  try { res.json({ success: true, data: await changeForumAvailability(AppDataSource, req.params.id, (req as any)._serviceCode, (req as AuthRequest).user!.id, true) }); }
  catch (error) { const status = error instanceof OperationError ? error.status : 500; res.status(status).json({ success: false, error: error instanceof OperationError ? error.message : '포럼 재개 실패' }); }
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

    const blockedReasons: string[] = [];
    if (!isServiceAdmin((req as AuthRequest).user?.roles || [], SERVICE_CODE_TO_RBAC_KEY[serviceCode])) blockedReasons.push('완전 삭제는 해당 서비스 admin 권한이 필요합니다');
    if (forum.status !== 'archived') blockedReasons.push('먼저 포럼 사용을 중지해 주세요');

    const warnings: string[] = [];
    if (normalPostCount > 0) warnings.push(`게시글 ${normalPostCount}건과 연결 댓글·좋아요·알림도 삭제됩니다`);
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

/** DELETE /categories/:id/hard — service admin permanent hard delete */
router.delete('/categories/:id/hard', forumOperationAccess('admin'), async (req, res) => {
  try { res.json({ success: true, data: await hardDeleteForum(AppDataSource, req.params.id, (req as any)._serviceCode, (req as AuthRequest).user!.id, req.body?.reason) }); }
  catch (error) { const status = error instanceof OperationError ? error.status : 500; res.status(status).json({ success: false, error: error instanceof OperationError ? error.message : '포럼 완전 삭제 실패' }); }
});

export default router;
