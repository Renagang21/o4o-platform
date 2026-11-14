/**
 * 글쓴이가 바꿀 수 있는 칸 — 2026-11-14 커뮤니티 점검.
 *
 * 상단 고정 · 잠금 · 공지 유형 · 보관 · 승인 상태는 운영 업무다. 고정은 운영자 전용 pin API(pinPost),
 * 삭제(보관)는 delete API 가 권한을 확인하고 처리한다. 그런데 글 작성 · 수정 요청 본문의
 * isPinned · isLocked · type · status 를 그대로 저장해서, 일반 회원이 자기 글을 고정하거나 공지로 바꿀 수 있었다.
 *
 * 그래서 글쓴이 요청에서는:
 *   - isPinned · isLocked 는 무시한다(값이 와도 저장하지 않는다 — 기존 화면이 false 를 기본으로 보내므로 거부하지 않는다).
 *   - type 은 공지(announcement) 를 빼고 알려진 값만 받는다.
 *   - status 는 작성 중(draft) · 게시(publish) 만 받는다.
 * 플랫폼 관리자의 기존 governance 경로(커뮤니티 밖 generic 관리 화면)는 그대로 둔다.
 */
// 값은 forum-core 열거(PostType · PostStatus)의 문자열과 같다 — 런타임 import 없이 쓴다(테스트 환경이 forum-core ESM 을 읽지 못한다).
import type { PostStatus, PostType } from '@o4o/forum-core/entities';

export interface AuthorPostFields {
  isPinned?: boolean;
  isLocked?: boolean;
  type?: PostType;
  status?: PostStatus;
}

/** 공지(announcement)를 뺀 글 유형. */
const AUTHOR_TYPES = new Set<string>(['discussion', 'question', 'poll', 'guide']);
/** 작성 중 · 게시. */
const AUTHOR_STATUSES = new Set<string>(['draft', 'publish']);

export function authorPostFields(body: Record<string, unknown>, governance: boolean): AuthorPostFields {
  if (governance) {
    return {
      isPinned: body.isPinned as boolean | undefined,
      isLocked: body.isLocked as boolean | undefined,
      type: body.type as PostType | undefined,
      status: body.status as PostStatus | undefined,
    };
  }
  return {
    type: typeof body.type === 'string' && AUTHOR_TYPES.has(body.type) ? (body.type as PostType) : undefined,
    status: typeof body.status === 'string' && AUTHOR_STATUSES.has(body.status) ? (body.status as PostStatus) : undefined,
  };
}
