/**
 * Operator Signal Engine
 *
 * WO-OPERATOR-SIGNAL-CORE-V1 + WO-OPERATOR-SIGNAL-THRESHOLD-CONFIG-V1
 * 서비스별 operatorConfig에서 중복되던 signal 판정 로직을 공통화.
 * ThresholdRule 기반으로 임계값을 외부 설정 가능.
 * UI 없이 순수 함수만 제공한다.
 */

import type { SignalStatus, OperatorSignal, OperatorActivityItem } from './types';
import type { ThresholdRule } from './threshold';
import { DEFAULT_THRESHOLD } from './threshold';

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
 * totalPosts <= alert → alert
 * recentPostsCount <= warning → warning
 * else → good
 *
 * 기본 ThresholdRule { alert: 0, warning: 0 } = 기존 동작과 동일.
 */
export function computeForumSignal(
  totalPosts: number,
  recentPostsCount: number,
  rule: ThresholdRule = DEFAULT_THRESHOLD,
): OperatorSignal {
  if (totalPosts <= rule.alert) {
    return { status: 'alert', message: '포럼 게시글 없음 — 초기 상태' };
  }
  if (recentPostsCount <= rule.warning) {
    return { status: 'warning', message: `게시글 ${totalPosts}개 · 최근 활동 없음` };
  }
  return { status: 'good', message: `게시글 ${totalPosts}개 활성` };
}

/**
 * 콘텐츠+사이니지 Signal 공통 판정.
 * totalContent <= alert AND totalMedia <= alert → alert
 * totalContent <= alert → warning (미디어만 존재)
 * totalPlaylists <= warning AND totalMedia > alert → warning (플레이리스트 미설정)
 * else → good
 *
 * 기본 ThresholdRule { alert: 0, warning: 0 } = 기존 동작과 동일.
 */
export function computeContentSignageSignal(
  totalContent: number,
  totalMedia: number,
  totalPlaylists: number,
  rule: ThresholdRule = DEFAULT_THRESHOLD,
): OperatorSignal {
  if (totalContent <= rule.alert && totalMedia <= rule.alert) {
    return { status: 'alert', message: '등록된 콘텐츠 없음' };
  }
  if (totalContent <= rule.alert) {
    return { status: 'warning', message: `미디어 ${totalMedia}개 · 공지/뉴스 없음` };
  }
  if (totalPlaylists <= rule.warning && totalMedia > rule.alert) {
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
