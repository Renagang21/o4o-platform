import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { ForumCategoryRequest } from '@o4o/forum-core/entities';
import { OperationError, operationReason, recordOperation } from '../operations/operation-audit.js';
import { mergeForumMetadataPatch } from '../community/community-public-read-metadata.js';
import { purgeForumAndDependents } from './forumHardDelete.js';

export async function changeForumAvailability(db: DataSource, id: string, serviceCode: string, actorId: string, active: boolean, inputReason?: unknown) {
  const reason = active ? null : operationReason(inputReason);
  return db.transaction(async manager => {
    const forum = await manager.getRepository(ForumCategoryRequest).findOne({ where: { id, serviceCode }, lock: { mode: 'pessimistic_write' } });
    if (!forum) throw new OperationError(404, 'NOT_FOUND', '포럼을 찾을 수 없습니다.');
    if (forum.status !== (active ? 'archived' : 'completed')) throw new OperationError(409, 'STATUS_CHANGED', '포럼 상태가 변경됐습니다. 다시 조회해 주세요.');
    if (active) {
      const conflicts = await manager.query(`SELECT id FROM forum_category_requests
        WHERE service_code=$1 AND status='completed' AND id<>$2
          AND (name=$3 OR ($4::text IS NOT NULL AND slug=$4)) LIMIT 1`, [serviceCode, id, forum.name, forum.slug || null]);
      if (conflicts.length) throw new OperationError(409, 'RESTORE_CONFLICT', '같은 이름 또는 주소의 활성 포럼이 있습니다.');
    }
    let affected = 0;
    const pauseId = active ? (forum.metadata as any)?.o4oOperatorPauseId : randomUUID();
    let tracked = false;
    if (!active) {
      const rows = await manager.query(`UPDATE forum_post SET status='archived',updated_at=NOW() WHERE forum_id=$1 AND status='publish' RETURNING id,updated_at::text AS "updatedAt"`, [id]);
      affected = rows[1] ?? 0;
      await recordOperation(manager, serviceCode, actorId, 'forum.operator.pause', { forumId: id, forumName: forum.name, pauseId, reason, pausedPostIds: rows[0].map((row: { id: string }) => row.id), pausedPosts: rows[0], postsArchived: affected });
    } else if (pauseId) {
      // Only server-written audit IDs can restore posts; caller metadata cannot supply the ID list.
      const [audit] = await manager.query(`SELECT meta->'pausedPosts' AS posts FROM action_logs
        WHERE service_key=$2 AND action_key='forum.operator.pause' AND status='success'
        AND meta->>'forumId'=$1::text AND meta->>'pauseId'=$3
        ORDER BY created_at DESC LIMIT 1`, [id, serviceCode, pauseId]);
      if (audit && Array.isArray(audit.posts)) {
        tracked = true;
        const rows = await manager.query(`UPDATE forum_post f SET status='publish',updated_at=NOW()
          FROM jsonb_to_recordset($2::jsonb) AS paused(id text, "updatedAt" text)
          WHERE f.forum_id=$1 AND f.status='archived' AND f.id::text=paused.id
            AND f.updated_at=paused."updatedAt"::timestamp RETURNING f.id`, [id, JSON.stringify(audit.posts)]);
        affected = rows[1] ?? 0;
      }
    }
    await mergeForumMetadataPatch(manager, id, serviceCode, {
      o4oOperatorPauseId: active ? null : pauseId,
      ...(active && (forum.metadata as any)?.deleteRequestStatus === 'approved' ? { deleteRequestStatus: 'restored' } : {}),
      ...(active ? { reactivatedAt: new Date().toISOString(), reactivatedBy: actorId }
        : { directDeactivatedAt: new Date().toISOString(), directDeactivatedBy: actorId, directDeactivateReason: reason, archivedAt: new Date().toISOString() }),
    }, active ? 'completed' : 'archived');
    if (active) await recordOperation(manager, serviceCode, actorId, 'forum.operator.resume', { forumId: id, forumName: forum.name, postsRestored: affected, untrackedPostsPreserved: !tracked });
    return { id, isActive: active, affectedPosts: affected, ...(active && !tracked ? { warning: '과거 보관된 게시글은 자동 복구하지 않았습니다.' } : {}) };
  });
}

export async function hardDeleteForum(db: DataSource, id: string, serviceCode: string, actorId: string, inputReason: unknown) {
  const reason = operationReason(inputReason);
  return db.transaction(async manager => {
    const forum = await manager.getRepository(ForumCategoryRequest).findOne({ where: { id, serviceCode }, lock: { mode: 'pessimistic_write' } });
    if (!forum) throw new OperationError(404, 'NOT_FOUND', '포럼을 찾을 수 없습니다.');
    if (forum.status !== 'archived') throw new OperationError(409, 'ARCHIVE_REQUIRED', '사용 중지 후 완전 삭제해 주세요.');
    const counts = await purgeForumAndDependents(manager, forum);
    await recordOperation(manager, serviceCode, actorId, 'forum.admin.hard_delete', { forumId: id, forumName: forum.name, reason, affectedCounts: counts });
    return { id, name: forum.name, hardDeleted: true, affectedCounts: counts };
  });
}
