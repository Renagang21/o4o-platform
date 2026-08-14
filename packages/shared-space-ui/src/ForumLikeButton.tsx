/**
 * ForumLikeButton — forum 게시글 좋아요 버튼 공통 부품 (presentational)
 *
 * WO-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1
 *
 * KPA / Neture 상세가 각각 동일한 `🤍/❤️ 좋아요 N` 버튼과 active 스타일을 복제하고 있었다.
 * 표시만 담당하며 like API·auth·router 는 알지 않는다(호출측 adapter 소유).
 * - 미로그인 처리(비활성 vs 로그인 모달)는 호출측이 `disabled`/`onClick` 으로 결정한다.
 */

import type { CSSProperties } from 'react';

export interface ForumLikeButtonProps {
  liked: boolean;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
  /** 모바일 터치 타깃(44px) 확보 */
  compact?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function ForumLikeButton({
  liked,
  count = 0,
  disabled = false,
  onClick,
  compact = false,
  label = '좋아요',
  className,
  style,
}: ForumLikeButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={liked}
      style={{
        ...styles.button,
        ...(compact ? styles.buttonCompact : null),
        ...(liked ? styles.active : null),
        ...(disabled ? styles.disabled : null),
        ...style,
      }}
    >
      <span aria-hidden>{liked ? '❤️' : '🤍'}</span>
      <span>
        {label}
        {count > 0 ? ` ${count}` : ''}
      </span>
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    fontSize: 14,
    color: '#334155',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 24,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonCompact: {
    minHeight: 44,
  },
  active: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
  },
  disabled: {
    cursor: 'not-allowed',
    opacity: 0.6,
  },
};
