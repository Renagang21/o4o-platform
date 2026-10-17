/**
 * Admin Forum Routes — 삭제된 포럼 관리 (복구 / 완전 삭제 / 삭제 이력)
 *
 * WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1
 *
 * 완전 삭제(hard delete)를 Operator 라우터와 분리한 admin-scoped API.
 * - 서버 측 권한 검사: isServiceAdmin(serviceCode) → {service}:admin 또는 platform:super_admin
 *   (일반 operator 는 URL/API 직접 호출로도 완전 삭제 불가)
 * - 기존 공통 DELETE /forum/operator/categories/:id/hard 역시 서비스 admin 권한을 검사한다.
 * - Neture Admin 화면은 본 admin 전용 API 만 호출한다.
 *
 * Mount: /api/v1/forum/admin
 *
 *   GET    /forums/deleted               - 삭제(archived)된 포럼 목록 (+ 삭제유형/사유/처리자/삭제일 + 카운트)
 *   GET    /forums/:id/hard-delete-check - 완전 삭제 사전 점검
 *   POST   /forums/:id/restore           - 복구 (archived → completed, slug/name 충돌 차단)
 *   DELETE /forums/:id/hard              - 완전 삭제 (archived 전용, 종속 데이터 정리 + 포럼 제거)
 *   GET    /audit-logs                   - 삭제 이력 (action_logs 조회)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { forumOperationAccess } from '../../middleware/forum-operation-access.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { isServiceAdmin } from '../../utils/role.utils.js';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost, ForumCategoryMember, ForumCategoryRequest } from '@o4o/forum-core/entities';
import { ActionLog } from '@o4o/action-log-core';
import { changeForumAvailability, hardDeleteForum } from '../../services/forum/forum-operation.service.js';
import { OperationError } from '../../services/operations/operation-audit.js';
import type { AuthRequest } from '../../types/auth.js';
import type { ServiceKey } from '../../types/roles.js';
import logger from '../../utils/logger.js';

/**
 * Service catalog code → RBAC ServiceKey mapping.
 * (operator-forum.routes.ts 와 동일 — DB 'k-cosmetics'/'kpa-society' ↔ RBAC 'cosmetics'/'kpa')
 * 공통 operator 라우터 동작을 건드리지 않기 위해 admin 라우터에 최소 복제.
 */
const SERVICE_CODE_TO_RBAC_KEY: Record<string, ServiceKey> = {
  neture: 'neture',
  'k-cosmetics': 'cosmetics',
  'kpa-society': 'kpa',
};
const VALID_SERVICE_CODES = Object.keys(SERVICE_CODE_TO_RBAC_KEY);

const FORUM_AUDIT_ACTION_KEYS = [
  'forum.delete_request.approve',
  'forum.operator.soft_delete',
  'forum.operator.pause',
  'forum.operator.resume',
  'forum.operator.hard_delete',
  'forum.admin.restore',
  'forum.admin.hard_delete',
];

const router: Router = Router();

router.use(authenticate);

/** Middleware: serviceCode 검증 + admin 권한 검사 (operator 로는 진입 불가) */
function requireServiceAdmin(req: Request, res: Response, next: NextFunction): void {
  const serviceCode = (req.query.serviceCode as string) || '';
  if (!serviceCode || !VALID_SERVICE_CODES.includes(serviceCode)) {
    res.status(400).json({ success: false, error: 'Valid serviceCode query param is required' });
    return;
  }
  const rbacKey = SERVICE_CODE_TO_RBAC_KEY[serviceCode];
  const user = (req as AuthRequest).user;
  if (!user || !isServiceAdmin(user.roles || [], rbacKey)) {
    res.status(403).json({ success: false, error: 'Admin access required for this service', code: 'ADMIN_REQUIRED' });
    return;
  }
  (req as any)._serviceCode = serviceCode;
  next();
}
router.use(requireServiceAdmin);
router.use(forumOperationAccess('admin'));

const requestRepo = () => AppDataSource.getRepository(ForumCategoryRequest);
const postRepo = () => AppDataSource.getRepository(ForumPost);
const memberRepo = () => AppDataSource.getRepository(ForumCategoryMember);

/** 삭제 유형/사유/처리자/삭제일 을 metadata 로부터 도출 */
function deriveDeleteInfo(meta: Record<string, any> | null | undefined): {
  deleteType: 'delete_request_approved' | 'operator_direct' | 'unknown';
  deleteTypeLabel: string;
  deleteReason: string | null;
  deletedBy: string | null;
  deletedAt: string | null;
} {
  const m = meta || {};
  if (m.deleteRequestStatus === 'approved') {
    return {
      deleteType: 'delete_request_approved',
      deleteTypeLabel: '소유자 삭제 요청 승인',
      deleteReason: m.deleteReviewComment || m.deleteRequestReason || null,
      deletedBy: m.deleteReviewedBy || null,
      deletedAt: m.archivedAt || m.deleteReviewedAt || null,
    };
  }
  if (m.directDeactivatedAt) {
    return {
      deleteType: 'operator_direct',
      deleteTypeLabel: 'Operator 직접 삭제',
      deleteReason: m.directDeactivateReason || null,
      deletedBy: m.directDeactivatedBy || null,
      deletedAt: m.archivedAt || m.directDeactivatedAt || null,
    };
  }
  return {
    deleteType: 'unknown',
    deleteTypeLabel: '기타',
    deleteReason: m.deleteReviewComment || m.directDeactivateReason || null,
    deletedBy: m.deleteReviewedBy || m.directDeactivatedBy || null,
    deletedAt: m.archivedAt || null,
  };
}

/** GET /forums/deleted — 삭제(archived)된 포럼 목록 */
router.get('/forums/deleted', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const forums = await requestRepo()
      .createQueryBuilder('forum')
      .where('forum.serviceCode = :serviceCode', { serviceCode })
      .andWhere('forum.status = :status', { status: 'archived' })
      .orderBy(`forum.metadata->>'archivedAt'`, 'DESC')
      .getMany();

    const forumIds = forums.map((f) => f.id);
    const postCounts: Record<string, number> = {};
    const commentCounts: Record<string, number> = {};
    const memberCounts: Record<string, number> = {};
    const actorNames: Record<string, string> = {};

    if (forumIds.length > 0) {
      // 게시글 수
      const postRows = await postRepo()
        .createQueryBuilder('p')
        .select('p.forumId', 'forumId')
        .addSelect('COUNT(*)::int', 'cnt')
        .where('p.forumId IN (:...forumIds)', { forumIds })
        .groupBy('p.forumId')
        .getRawMany();
      for (const r of postRows) postCounts[r.forumId] = Number(r.cnt) || 0;

      // 댓글 수 (게시글 조인)
      const commentRows = await AppDataSource.query(
        `SELECT fp.forum_id AS "forumId", COUNT(*)::int AS cnt
         FROM forum_comment fc
         JOIN forum_post fp ON fp.id = fc."postId"
         WHERE fp.forum_id = ANY($1::uuid[])
         GROUP BY fp.forum_id`,
        [forumIds],
      );
      for (const r of commentRows) commentCounts[r.forumId] = Number(r.cnt) || 0;

      // 회원 수
      const memberRows = await memberRepo()
        .createQueryBuilder('m')
        .select('m.forumCategoryId', 'forumId')
        .addSelect('COUNT(*)::int', 'cnt')
        .where('m.forumCategoryId IN (:...forumIds)', { forumIds })
        .groupBy('m.forumCategoryId')
        .getRawMany();
      for (const r of memberRows) memberCounts[r.forumId] = Number(r.cnt) || 0;

      // 삭제 처리자 이름 (best-effort)
      const actorIds = [...new Set(
        forums.map((f) => deriveDeleteInfo(f.metadata).deletedBy).filter(Boolean) as string[],
      )];
      if (actorIds.length > 0) {
        const userRows = await AppDataSource.query(
          `SELECT id, name FROM users WHERE id = ANY($1::uuid[])`,
          [actorIds],
        );
        for (const u of userRows) actorNames[u.id] = u.name;
      }
    }

    const data = forums.map((forum) => {
      const info = deriveDeleteInfo(forum.metadata);
      return {
        id: forum.id,
        name: forum.name,
        description: forum.description,
        slug: forum.slug,
        status: forum.status,
        forumType: forum.forumType,
        createdBy: forum.requesterId,
        creatorName: forum.requesterName,
        createdAt: forum.createdAt,
        deleteType: info.deleteType,
        deleteTypeLabel: info.deleteTypeLabel,
        deleteReason: info.deleteReason,
        deletedBy: info.deletedBy,
        deletedByName: info.deletedBy ? (actorNames[info.deletedBy] || null) : null,
        deletedAt: info.deletedAt,
        postCount: postCounts[forum.id] || 0,
        commentCount: commentCounts[forum.id] || 0,
        memberCount: memberCounts[forum.id] || 0,
      };
    });

    res.json({ success: true, data, count: data.length });
  } catch (error: any) {
    logger.error('Error listing deleted forums:', error);
    res.status(error instanceof OperationError ? error.status : 500).json({ success: false, error: error instanceof OperationError ? error.message : '포럼 처리에 실패했습니다.' });
  }
});

/** GET /forums/:id/hard-delete-check — 완전 삭제 사전 점검 (operator delete-check 와 동일 로직) */
router.get('/forums/:id/hard-delete-check', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const forum = await requestRepo().findOne({ where: { id: req.params.id, serviceCode } });
    if (!forum || forum.status !== 'archived') {
      res.status(404).json({ success: false, error: '삭제된 포럼을 찾을 수 없습니다 (archived 상태만 대상)' });
      return;
    }

    const [postCount, totalMemberCount, ownerCount] = await Promise.all([
      postRepo().count({ where: { forumId: req.params.id } }),
      memberRepo().count({ where: { forumCategoryId: req.params.id } }),
      memberRepo().count({ where: { forumCategoryId: req.params.id, role: 'owner' } }),
    ]);
    const generalMemberCount = totalMemberCount - ownerCount;

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


    const warnings: string[] = [];
    if (normalPostCount > 0) warnings.push(`게시글 ${normalPostCount}건과 연결 댓글·좋아요·알림도 삭제됩니다`);
    if (orphanPostCount > 0) warnings.push(`고아 게시글 ${orphanPostCount}건이 함께 삭제됩니다 (작성자 계정 없음)`);
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
    logger.error('Error checking admin hard delete eligibility:', error);
    res.status(error instanceof OperationError ? error.status : 500).json({ success: false, error: error instanceof OperationError ? error.message : '포럼 처리에 실패했습니다.' });
  }
});

/** POST /forums/:id/restore — 복구 (archived → completed), slug/name 충돌 차단 */
router.post('/forums/:id/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;

    const forum = await requestRepo().findOne({ where: { id: req.params.id, serviceCode } });
    if (!forum || forum.status !== 'archived') {
      res.status(404).json({ success: false, error: '삭제된 포럼을 찾을 수 없습니다 (archived 상태만 복구 가능)' });
      return;
    }

    // 충돌 검사 — 자동 변경하지 않고 차단
    const conflicts: string[] = [];
    if (forum.slug) {
      const slugDup = await requestRepo()
        .createQueryBuilder('f')
        .where('f.serviceCode = :serviceCode', { serviceCode })
        .andWhere('f.status = :status', { status: 'completed' })
        .andWhere('f.slug = :slug', { slug: forum.slug })
        .andWhere('f.id != :id', { id: forum.id })
        .getCount();
      if (slugDup > 0) conflicts.push(`동일한 slug('${forum.slug}')를 사용하는 활성 포럼이 있습니다`);
    }
    const nameDup = await requestRepo()
      .createQueryBuilder('f')
      .where('f.serviceCode = :serviceCode', { serviceCode })
      .andWhere('f.status = :status', { status: 'completed' })
      .andWhere('f.name = :name', { name: forum.name })
      .andWhere('f.id != :id', { id: forum.id })
      .getCount();
    if (nameDup > 0) conflicts.push(`동일한 포럼명('${forum.name}')을 사용하는 활성 포럼이 있습니다`);

    // 생성자 계정 상태 (경고 — 차단하지 않음)
    const warnings: string[] = [];
    const creatorRows = await AppDataSource.query(
      `SELECT id FROM users WHERE id = $1`,
      [forum.requesterId],
    );
    if (creatorRows.length === 0) warnings.push('생성자 계정이 존재하지 않습니다');

    if (conflicts.length > 0) {
      res.status(409).json({
        success: false,
        error: '충돌로 인해 복구할 수 없습니다',
        code: 'RESTORE_CONFLICT',
        data: { conflicts, warnings },
      });
      return;
    }

    const result = await changeForumAvailability(AppDataSource, forum.id, serviceCode, userId!, true);
    res.json({ success: true, data: { ...result, warnings: [...warnings, ...(result.warning ? [result.warning] : [])] } });
  } catch (error: any) {
    logger.error('Error restoring forum:', error);
    res.status(error instanceof OperationError ? error.status : 500).json({ success: false, error: error instanceof OperationError ? error.message : '포럼 처리에 실패했습니다.' });
  }
});

/** DELETE /forums/:id/hard — 완전 삭제 (archived 전용) */
router.delete('/forums/:id/hard', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const userId = (req as AuthRequest).user?.id;
    const { reason } = req.body;

    if (!reason?.trim()) {
      res.status(400).json({ success: false, error: '삭제 사유를 입력해주세요', code: 'REASON_REQUIRED' });
      return;
    }

    const forum = await requestRepo().findOne({ where: { id: req.params.id, serviceCode } });
    if (!forum) {
      res.status(404).json({ success: false, error: 'Forum not found for this service' });
      return;
    }
    // Admin 완전 삭제는 이미 운영 삭제(archived)된 포럼만 대상 — 활성 포럼 차단
    if (forum.status !== 'archived') {
      res.status(400).json({
        success: false,
        error: '완전 삭제는 이미 삭제(비활성)된 포럼만 가능합니다. 활성 포럼은 먼저 운영에서 내려야 합니다.',
        code: 'NOT_ARCHIVED',
      });
      return;
    }

    const deleted = await hardDeleteForum(AppDataSource, forum.id, serviceCode, userId!, reason);
    logger.info('Forum hard deleted by service admin', { forumId: forum.id, userId, counts: deleted.affectedCounts });
    res.json({ success: true, data: deleted });
  } catch (error: any) {
    logger.error('Error admin hard deleting forum:', error);
    res.status(error instanceof OperationError ? error.status : 500).json({ success: false, error: error instanceof OperationError ? error.message : '포럼 처리에 실패했습니다.' });
  }
});

/** GET /audit-logs — 삭제 이력 (action_logs) */
router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceCode = (req as any)._serviceCode;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);

    const rows = await AppDataSource.getRepository(ActionLog)
      .createQueryBuilder('log')
      .where('log.service_key = :serviceCode', { serviceCode })
      .andWhere('log.action_key IN (:...keys)', { keys: FORUM_AUDIT_ACTION_KEYS })
      .orderBy('log.created_at', 'DESC')
      .limit(limit)
      .getMany();

    const data = rows.map((r) => ({
      id: r.id,
      actionKey: r.action_key,
      actorUserId: r.user_id,
      createdAt: r.created_at,
      meta: r.meta || {},
    }));

    res.json({ success: true, data, count: data.length });
  } catch (error: any) {
    logger.error('Error listing forum audit logs:', error);
    res.status(error instanceof OperationError ? error.status : 500).json({ success: false, error: error instanceof OperationError ? error.message : '포럼 처리에 실패했습니다.' });
  }
});

export default router;
