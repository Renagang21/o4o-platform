/**
 * Forum Hard Delete — shared purge helper
 *
 * WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1
 *
 * 포럼(forum_category_requests row)과 "포럼 식별자로 명확히 연결된" 종속 데이터를
 * 하나의 트랜잭션 안에서 정리한다. 다음 두 경로가 공통으로 재사용한다.
 *   - 공통 operator hard delete  : DELETE /api/v1/forum/operator/categories/:id/hard
 *   - Neture Admin 전용 hard delete: DELETE /api/v1/forum/admin/forums/:id/hard
 *
 * 삭제 대상 (모두 forum_id / post_id / comment_id 등 명시적 식별자 기준):
 *   - forum_post (forum_id = forumId) + 해당 게시글의 forum_comment / forum_post_like
 *   - forum_notifications 중 위 게시글/댓글에 연결된 것 (postId / commentId 기준, userId 기준 광범위 삭제 금지)
 *   - forum_category_members (forum_category_id = forumId) — forum_category 드롭 후 FK 없음 → 수동 정리
 *   - forum_category_requests row 자체
 *
 * 선행 조건(예: 정상 게시글 잔존 차단, archived 상태 요구)은 호출자가 검증한다.
 */

import { In } from 'typeorm';
import type { EntityManager } from 'typeorm';
import {
  ForumPost,
  ForumComment,
  ForumPostLike,
  ForumCategoryMember,
  ForumCategoryRequest,
} from '@o4o/forum-core/entities';
import { ForumNotification } from '../../entities/ForumNotification.js';

export interface ForumPurgeCounts {
  posts: number;
  comments: number;
  likes: number;
  notifications: number;
  members: number;
}

/**
 * 포럼과 명확히 연결된 종속 데이터를 트랜잭션 내에서 정리하고 포럼 row 를 제거한다.
 * 반드시 manager(트랜잭션) 컨텍스트로 호출한다.
 */
export async function purgeForumAndDependents(
  manager: EntityManager,
  forum: ForumCategoryRequest,
): Promise<ForumPurgeCounts> {
  const forumId = forum.id;
  const counts: ForumPurgeCounts = { posts: 0, comments: 0, likes: 0, notifications: 0, members: 0 };

  // 1. 이 포럼에 속한 게시글 ids
  const posts = await manager.getRepository(ForumPost).find({
    where: { forumId },
    select: ['id'],
  });
  const postIds = posts.map((p) => p.id);

  if (postIds.length > 0) {
    // 1a. 게시글에 달린 댓글 ids (알림 연결 정리용으로 먼저 수집)
    const comments = await manager.getRepository(ForumComment).find({
      where: { postId: In(postIds) },
      select: ['id'],
    });
    const commentIds = comments.map((c) => c.id);

    // 1b. 게시글/댓글에 명확히 연결된 알림만 정리 (userId 기준 광범위 삭제 금지)
    const notifRepo = manager.getRepository(ForumNotification);
    const notifByPost = await notifRepo.delete({ postId: In(postIds) });
    counts.notifications += notifByPost.affected ?? 0;
    if (commentIds.length > 0) {
      const notifByComment = await notifRepo.delete({ commentId: In(commentIds) });
      counts.notifications += notifByComment.affected ?? 0;
    }

    // 1c. 좋아요 정리 (forum_post_like — FK 없음 → 수동 정리)
    const likeRes = await manager.getRepository(ForumPostLike).delete({ postId: In(postIds) });
    counts.likes = likeRes.affected ?? 0;

    // 1d. 댓글 정리 (forum_comment.postId → forum_post 는 ON DELETE CASCADE 이지만 카운트/명시성 위해 직접 삭제)
    if (commentIds.length > 0) {
      const commentRes = await manager.getRepository(ForumComment).delete({ postId: In(postIds) });
      counts.comments = commentRes.affected ?? 0;
    }

    // 1e. 게시글 정리
    const postRes = await manager.getRepository(ForumPost).delete({ forumId });
    counts.posts = postRes.affected ?? 0;
  }

  // 2. 멤버십 정리 (forum_category 드롭 후 FK 없음 → 수동)
  const memberRes = await manager.getRepository(ForumCategoryMember).delete({ forumCategoryId: forumId });
  counts.members = memberRes.affected ?? 0;

  // 3. 포럼 row 제거
  await manager.getRepository(ForumCategoryRequest).remove(forum);

  return counts;
}
