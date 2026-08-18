/**
 * CommunityContentStates — 커뮤니티 콘텐츠·자료실 화면 공통 상태 표현
 *
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1
 *
 * 목록/상세가 공유하는 loading · error · empty · not-found 표현을 한 곳에 모은다.
 * 순수 presentational — fetch/router/서비스 분기 없음.
 *
 * O4O Load-Error 계약: 조회 실패를 "빈 목록"으로 삼키지 않는다. 실패는 오류 표현 +
 * 재시도로 드러낸다. 정상 0건만 empty 로 통과한다.
 */

import { type ReactNode, type CSSProperties } from 'react';

export interface CommunityContentLoadingStateProps {
  text?: string;
}

export function CommunityContentLoadingState({ text = '불러오는 중...' }: CommunityContentLoadingStateProps) {
  return <p style={styles.muted}>{text}</p>;
}

export interface CommunityContentErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** 재시도 외 보조 액션(목록으로 등) */
  actionSlot?: ReactNode;
}

export function CommunityContentErrorState({
  message = '콘텐츠를 불러오지 못했습니다.',
  onRetry,
  retryLabel = '다시 시도',
  actionSlot,
}: CommunityContentErrorStateProps) {
  return (
    <div style={styles.center}>
      <p style={styles.errorText}>{message}</p>
      {onRetry && (
        <button type="button" style={styles.retryBtn} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
      {actionSlot}
    </div>
  );
}

export interface CommunityContentEmptyStateProps {
  message?: string;
  actionSlot?: ReactNode;
}

export function CommunityContentEmptyState({
  message = '아직 등록된 콘텐츠가 없습니다.',
  actionSlot,
}: CommunityContentEmptyStateProps) {
  return (
    <div style={styles.center}>
      <p style={styles.muted}>{message}</p>
      {actionSlot}
    </div>
  );
}

/** wrapper 마다 복제되던 날짜 포맷 — 실패 시 '-' 로 대체한다. */
export function formatCommunityContentDate(
  value?: string | null,
  variant: 'short' | 'full' = 'short',
): string {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(
      'ko-KR',
      variant === 'full'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { month: 'long', day: 'numeric' },
    );
  } catch {
    return '-';
  }
}

const styles: Record<string, CSSProperties> = {
  muted: { textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '0.9375rem', margin: 0 },
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '30vh', gap: 12, padding: '24px 0',
  },
  errorText: { fontSize: '0.9375rem', color: '#ef4444', margin: 0, textAlign: 'center' },
  retryBtn: {
    padding: '8px 20px', fontSize: '0.875rem', fontWeight: 500, color: '#475569',
    backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
  },
};
