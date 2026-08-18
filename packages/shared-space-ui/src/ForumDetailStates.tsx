/**
 * ForumDetailStates — forum 게시글 상세 loading / error / not-found 공통 부품 (presentational)
 *
 * WO-O4O-FORUM-DETAIL-STATES-HEADER-EXTRACTION-V1
 *
 * 서비스 전 단계이므로 경미한 시각 정규화를 허용(공통 spinner/message/back look).
 * route 는 부품이 알지 않는다 — back/retry 는 callback 으로만 받는다.
 * KPA ClosedForumAccessBlocker 는 본 부품으로 치환하지 않는다(서비스 측 유지).
 */

import type { CSSProperties, ReactNode } from 'react';

// ─── 공통 spinner (CSS keyframe 자체 주입, 비-Tailwind 환경에서도 동작) ───
const SPINNER_KEYFRAME = '@keyframes fds-spin{to{transform:rotate(360deg)}}';

function Spinner({ size = 28 }: { size?: number }) {
  return (
    <>
      <style>{SPINNER_KEYFRAME}</style>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563EB',
          borderRadius: '50%',
          animation: 'fds-spin 0.8s linear infinite',
        }}
      />
    </>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────
export interface ForumDetailLoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'text';
  className?: string;
  style?: CSSProperties;
}

export function ForumDetailLoadingState({
  message = '게시글을 불러오는 중...',
  variant = 'spinner',
  className,
  style,
}: ForumDetailLoadingStateProps) {
  return (
    <div className={className} style={{ ...stateStyles.wrap, ...style }}>
      {variant === 'spinner' && <Spinner />}
      {message && <p style={stateStyles.message}>{message}</p>}
    </div>
  );
}

// ─── Skeleton (WO-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1) ──
export interface ForumDetailSkeletonStateProps {
  /** breadcrumb 자리 표시 */
  showBreadcrumb?: boolean;
  /** 본문 자리 표시 줄 수 */
  contentLines?: number;
  /** 댓글 자리 표시 개수 (0 이면 미표시) */
  commentItems?: number;
  className?: string;
  style?: CSSProperties;
}

const SKELETON_KEYFRAME = '@keyframes fds-skeleton-pulse{0%,100%{opacity:1}50%{opacity:0.5}}';

function Bar({ width, height = 14, marginBottom }: { width: string; height?: number; marginBottom?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width,
        height,
        marginBottom,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        animation: 'fds-skeleton-pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

/** Neture 상세가 자체 구현하던 스켈레톤을 공통화한 로딩 표현(정보 밀도가 높은 상세용). */
export function ForumDetailSkeletonState({
  showBreadcrumb = true,
  contentLines = 4,
  commentItems = 2,
  className,
  style,
}: ForumDetailSkeletonStateProps) {
  return (
    <div className={className} style={style} aria-busy>
      <style>{SKELETON_KEYFRAME}</style>
      {showBreadcrumb && (
        <div style={skeletonStyles.breadcrumb}>
          <Bar width="40px" />
          <span style={skeletonStyles.divider}>/</span>
          <Bar width="40px" />
          <span style={skeletonStyles.divider}>/</span>
          <Bar width="50px" />
        </div>
      )}
      <div style={skeletonStyles.headerBlock}>
        <Bar width="80px" height={20} marginBottom={16} />
        <Bar width="70%" height={28} marginBottom={16} />
        <Bar width="180px" />
      </div>
      <div style={{ marginBottom: 32 }}>
        {Array.from({ length: contentLines }, (_, i) => (
          <Bar key={i} width={`${90 - i * 10}%`} height={16} marginBottom={12} />
        ))}
      </div>
      {commentItems > 0 && (
        <div style={skeletonStyles.commentBlock}>
          <Bar width="100px" height={18} marginBottom={24} />
          {Array.from({ length: commentItems }, (_, i) => (
            <div key={i} style={skeletonStyles.commentItem}>
              <Bar width="120px" marginBottom={8} />
              <Bar width="80%" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Error / NotFound 공통 내부 렌더 ──────────────────────────────────
interface BaseStateProps {
  icon?: ReactNode;
  title?: string;
  message?: string;
  backLabel?: string;
  onBack?: () => void;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
  style?: CSSProperties;
}

function BaseState({
  icon,
  title,
  message,
  backLabel = '목록으로',
  onBack,
  retryLabel,
  onRetry,
  className,
  style,
}: BaseStateProps) {
  return (
    <div className={className} style={{ ...stateStyles.wrap, ...style }}>
      {icon && <div style={stateStyles.icon}>{icon}</div>}
      {title && <h2 style={stateStyles.title}>{title}</h2>}
      {message && <p style={stateStyles.message}>{message}</p>}
      {(onRetry || onBack) && (
        <div style={stateStyles.actions}>
          {onRetry && (
            <button type="button" onClick={onRetry} style={stateStyles.retryBtn}>
              {retryLabel || '다시 시도'}
            </button>
          )}
          {onBack && (
            <button type="button" onClick={onBack} style={stateStyles.backBtn}>
              {backLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface ForumDetailErrorStateProps {
  title?: string;
  message?: string;
  backLabel?: string;
  retryLabel?: string;
  onBack?: () => void;
  onRetry?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function ForumDetailErrorState({
  title,
  message = '게시글을 불러오지 못했습니다.',
  ...rest
}: ForumDetailErrorStateProps) {
  return <BaseState icon={<span>⚠️</span>} title={title} message={message} {...rest} />;
}

export interface ForumDetailNotFoundStateProps {
  title?: string;
  message?: string;
  backLabel?: string;
  onBack?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function ForumDetailNotFoundState({
  title = '게시글을 찾을 수 없습니다',
  message = '삭제되었거나 존재하지 않는 게시글입니다.',
  ...rest
}: ForumDetailNotFoundStateProps) {
  return <BaseState icon={<span>🔍</span>} title={title} message={message} {...rest} />;
}

const stateStyles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '60px 20px',
    textAlign: 'center',
  },
  icon: {
    fontSize: 32,
    lineHeight: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 4,
  },
  backBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
  },
  retryBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#2563EB',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
};

const skeletonStyles: Record<string, CSSProperties> = {
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    marginBottom: 24,
  },
  divider: {
    color: '#cbd5e1',
  },
  headerBlock: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: '1px solid #e2e8f0',
  },
  commentBlock: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: 32,
  },
  commentItem: {
    padding: '20px 0',
    borderBottom: '1px solid #f1f5f9',
  },
};
