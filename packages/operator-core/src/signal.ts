/**
 * Operator Signal Engine
 *
 * WO-OPERATOR-SIGNAL-CORE-V1
 * 서비스별 operatorConfig에서 중복되던 signal 판정 로직을 공통화.
 * UI 없이 순수 함수만 제공한다.
 */

import type { SignalStatus, OperatorSignal, OperatorActivityItem } from './types';

/**
 * 복수 영역의 활성 여부로 전체 상태를 판정한다.
 * 전부 활성 → good, 1개 이상 → warning, 전무 → alert
 */
export function computeOverallSignal(conditions: boolean[]): SignalStatus {
  const active = conditions.filter(Boolean).length;
  if (active === conditions.length) return 'good';
  if (active >= 1) return 'warning';
  return 'alert';
}

/**
 * 포럼 Signal 공통 판정.
 * 게시글 0 → alert, 최근 활동 없음 → warning, else → good
 */
export function computeForumSignal(totalPosts: number, recentPostsCount: number): OperatorSignal {
  if (totalPosts === 0) {
    return { status: 'alert', message: '포럼 게시글 없음 — 초기 상태' };
  }
  if (recentPostsCount === 0) {
    return { status: 'warning', message: `게시글 ${totalPosts}개 · 최근 활동 없음` };
  }
  return { status: 'good', message: `게시글 ${totalPosts}개 활성` };
}

/**
 * 콘텐츠+사이니지 Signal 공통 판정.
 * 콘텐츠 0 + 미디어 0 → alert, 부분 → warning, 전부 → good
 */
export function computeContentSignageSignal(
  totalContent: number,
  totalMedia: number,
  totalPlaylists: number,
): OperatorSignal {
  if (totalContent === 0 && totalMedia === 0) {
    return { status: 'alert', message: '등록된 콘텐츠 없음' };
  }
  if (totalContent === 0) {
    return { status: 'warning', message: `미디어 ${totalMedia}개 · 공지/뉴스 없음` };
  }
  if (totalPlaylists === 0 && totalMedia > 0) {
    return { status: 'warning', message: `콘텐츠 ${totalContent}개 · 플레이리스트 미설정` };
  }
  return {
    status: 'good',
    message: `콘텐츠 ${totalContent}개 · 미디어 ${totalMedia}개 · 재생목록 ${totalPlaylists}개`,
  };
}

/**
 * Activity 아이템 배열을 날짜순 정렬 후 limit개로 자른다.
 */
export function sortAndLimitActivity(
  items: OperatorActivityItem[],
  limit = 5,
): OperatorActivityItem[] {
  return [...items]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
