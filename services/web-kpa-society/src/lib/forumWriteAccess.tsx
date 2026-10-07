/**
 * 약사 커뮤니티(포럼) 쓰기 자격 안내 — KPA 포럼 화면용
 *
 * WO-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1
 *
 * 포럼 읽기는 누구나 되지만 쓰기(글 · 댓글 · 좋아요)는 backend `requireCommunityAccess('pharmacy')` 가 막는다.
 * Neture 자격만 가진 약국(kpa-society membership 없음)처럼 쓸 수 없는 사용자에게 쓰기 버튼을 이용 가능한 것처럼
 * 보이지 않도록, 서버의 같은 판정(`GET /communities/pharmacy/access`)을 조회해 버튼 대신 안내를 보인다.
 * 판정 · 정책 변경은 공통 Forum 트랙(WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1) 소관이다 — 이 파일은 안내만 한다.
 *
 * 조회 실패 · 미인증은 `null`(= 기존 화면 그대로). 차단이 확인된 경우(`allowed === false`)에만 숨긴다.
 */

import { useEffect, useState } from 'react';
import { authClient, useAuth } from '../contexts/AuthContext';

export const FORUM_COMMUNITY_KEY = 'pharmacy';

export interface ForumWriteAccess {
  allowed: boolean;
  reason: string | null;
}

const REASON_MESSAGES: Record<string, string> = {
  SERVICE_MEMBERSHIP_REQUIRED:
    '약사 커뮤니티의 글쓰기 · 댓글 · 좋아요는 KPA 약사회(또는 약국 HUB) 회원만 할 수 있습니다. 글 읽기는 계속 이용할 수 있습니다.',
  SEMI_FRANCHISE_MEMBERSHIP_REQUIRED: '이 커뮤니티는 세미프랜차이즈에 가입한 약국만 참여할 수 있습니다. 글 읽기는 계속 이용할 수 있습니다.',
  COMMUNITY_MEMBERSHIP_REQUIRED: '커뮤니티 가입 승인 후 글을 쓸 수 있습니다.',
};

export function forumWriteDeniedMessage(reason: string | null | undefined): string {
  return (reason && REASON_MESSAGES[reason]) || '이 커뮤니티에 글을 쓸 권한이 없습니다. 글 읽기는 계속 이용할 수 있습니다.';
}

/** 쓰기 API 403 의 서버 code → 안내 문구. 해당 없으면 null. */
export function forumWriteErrorMessage(code: string | null | undefined): string | null {
  if (code === 'COMMUNITY_ACCESS_DENIED') return REASON_MESSAGES.SERVICE_MEMBERSHIP_REQUIRED;
  if (code && REASON_MESSAGES[code]) return REASON_MESSAGES[code];
  return null;
}

/** `authClient.api` (baseURL = /api/v1) */
type GetApi = { get: (url: string) => Promise<{ data?: unknown }> };

export async function fetchForumWriteAccess(api: GetApi): Promise<ForumWriteAccess | null> {
  try {
    const res = await api.get(`/communities/${FORUM_COMMUNITY_KEY}/access`);
    const data = (res?.data as { data?: { allowed?: unknown; reason?: unknown } } | undefined)?.data;
    if (!data || typeof data.allowed !== 'boolean') return null;
    return { allowed: data.allowed, reason: typeof data.reason === 'string' ? data.reason : null };
  } catch {
    return null;
  }
}

// 같은 사용자 · 같은 화면 흐름에서 여러 컴포넌트가 한 번만 조회하도록 사용자별로 공유한다.
let shared: { userId: string; promise: Promise<ForumWriteAccess | null> } | null = null;

/** 로그인 사용자의 포럼 쓰기 자격. 미인증 · 조회 중 · 실패 = null. */
export function useForumWriteAccess(): ForumWriteAccess | null {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated && user ? user.id : null;
  const [access, setAccess] = useState<{ userId: string; value: ForumWriteAccess | null } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    if (!shared || shared.userId !== userId) shared = { userId, promise: fetchForumWriteAccess(authClient.api) };
    // fetchForumWriteAccess 는 reject 하지 않는다(실패 = null).
    void shared.promise.then((value) => {
      if (!cancelled) setAccess({ userId, value });
    });
    return () => { cancelled = true; };
  }, [userId]);
  if (!userId || !access || access.userId !== userId) return null;
  return access.value;
}

/** 쓰기 버튼 자리에 놓는 안내. */
export function ForumWriteDeniedNotice({ access, compact = false }: { access: ForumWriteAccess; compact?: boolean }) {
  return (
    <div
      role="note"
      style={{
        padding: compact ? '8px 12px' : '12px 16px',
        borderRadius: 8,
        background: '#F1F5F9',
        color: '#475569',
        fontSize: compact ? 12 : 13,
        lineHeight: 1.5,
      }}
    >
      {forumWriteDeniedMessage(access.reason)}
    </div>
  );
}

/** 테스트 전용 — 모듈 공유 캐시 초기화 */
export function __resetForumWriteAccessCache() {
  shared = null;
}
