/**
 * 게시판 운영자 중재 — 2026-11-14 커뮤니티 점검(중재 사유 · 기록).
 *
 * 예전에는 운영자가 남의 글 · 댓글을 지워도 사유도 기록도 없었다(분쟁 시 추적 불가).
 *   - 게시판 운영자(forumContext.communityOperator)가 **남의** 글 · 댓글을 지울 때는 사유(2~500자)가 필요하다.
 *     글쓴이 본인 삭제와 커뮤니티 밖 플랫폼 관리자의 기존 관리 화면은 사유를 요구하지 않는다(호환).
 *   - 운영자 · 관리자가 남의 글 · 댓글에 한 중재(삭제 · 잠금 · 댓글 막기)는 action_logs 에 남긴다.
 * 기록 실패는 중재 자체를 되돌리지 않는다(이미 처리됨) — 서버 로그로 남긴다.
 */
import type { DataSource, EntityManager } from 'typeorm';
import logger from '../../utils/logger.js';

type Exec = Pick<DataSource | EntityManager, 'query'>;

export const MODERATION_REASON_MAX = 500;

/** 사유를 정리한다. 2자 미만 · 500자 초과 · 문자열 아님이면 null. */
export function moderationReason(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const reason = input.trim();
  return reason.length >= 2 && reason.length <= MODERATION_REASON_MAX ? reason : null;
}

export async function logForumModeration(
  db: Exec,
  serviceKey: string | undefined,
  actorId: string,
  action: 'forum:post_moderate_delete' | 'forum:comment_moderate_delete' | 'forum:post_moderate_settings',
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta) VALUES($1,$2,$3,'manual','success',$4::jsonb)`,
      [(serviceKey || 'forum').slice(0, 50), actorId, action, JSON.stringify(meta)],
    );
  } catch (error) {
    logger.error('[forum moderation] audit log failed', { action, error: (error as Error)?.message });
  }
}
