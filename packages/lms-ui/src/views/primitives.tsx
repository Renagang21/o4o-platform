/**
 * @o4o/lms-ui — 공통 View 내부 primitive
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1
 *
 * 3서비스가 각자 갖고 있던 Card / LoadingSpinner / EmptyState / Link 를 한 벌로 수렴한다.
 * react-router 에 의존하지 않는다 — 네비게이션은 `navigate` 주입으로 처리한다.
 */

import type { CSSProperties, MouseEvent, ReactNode } from 'react';

export interface LmsCardProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function LmsCard({ children, style }: LmsCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface LmsLoadingProps {
  message: string;
}

export function LmsLoading({ message }: LmsLoadingProps) {
  return (
    <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
      {message}
    </div>
  );
}

export interface LmsEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  accent?: string;
}

export function LmsEmptyState({ icon, title, description, actionLabel, onAction, accent }: LmsEmptyStateProps) {
  return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      {icon && <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>}
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>{title}</h2>
      {description && (
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            padding: '10px 20px',
            background: accent ?? '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export interface NavLinkProps {
  to: string;
  navigate: (path: string) => void;
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}

/**
 * SPA 네비게이션 링크. `<a href>` 로 렌더해 키보드/새 탭/미리보기를 보존하되,
 * 좌클릭은 주입된 `navigate` 로 가로채 라우터 이동을 유지한다.
 */
export function NavLink({ to, navigate, children, style, onClick }: NavLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClick?.();
    navigate(to);
  };
  return (
    <a href={to} onClick={handleClick} style={{ textDecoration: 'none', ...style }}>
      {children}
    </a>
  );
}

export const pageContainerStyle: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 20px 40px',
};

export const sectionTitleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 16px',
};

export function primaryButtonStyle(accent: string, disabled?: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '14px',
    background: accent,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    boxSizing: 'border-box',
    textAlign: 'center',
    display: 'block',
  };
}
