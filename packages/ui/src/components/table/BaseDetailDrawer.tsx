/**
 * BaseDetailDrawer — Table 연결 상세 패널
 *
 * WO-O4O-SELECTION-TABLE-DETAIL-DRAWER-V1
 *
 * Table row 클릭 시 오른쪽에서 슬라이드인하는 상세 View 표준.
 * full-page route 이동 없이 상세 확인 + 액션 처리.
 *
 * - 오른쪽 슬라이드인 (CSS transition)
 * - ESC / overlay 클릭 / X 버튼으로 닫기
 * - 스크롤: drawer 내부만
 * - 하단 액션 버튼 sticky footer
 * - loading 시 스피너
 */

import { useEffect, useCallback, type ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DetailDrawerAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'default';
  loading?: boolean;
  disabled?: boolean;
}

export interface BaseDetailDrawerProps {
  open: boolean;
  onClose: () => void;

  title?: ReactNode;
  /** Drawer 폭. default: 480 */
  width?: number | string;
  loading?: boolean;

  /** 하단 버튼 액션. footer가 있으면 actions는 무시됨 */
  actions?: DetailDrawerAction[];
  /** 커스텀 footer (actions 대체) */
  footer?: ReactNode;

  children: ReactNode;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const TRANSITION_MS = 240;

const variantStyle: Record<NonNullable<DetailDrawerAction['variant']>, React.CSSProperties> = {
  primary: { background: '#2563eb', color: '#fff', border: 'none' },
  danger: { background: '#dc2626', color: '#fff', border: 'none' },
  default: { background: '#fff', color: '#374151', border: '1px solid #d1d5db' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function BaseDetailDrawer({
  open,
  onClose,
  title,
  width = 480,
  loading = false,
  actions,
  footer,
  children,
}: BaseDetailDrawerProps) {
  // ESC 닫기
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // body 스크롤 잠금
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const drawerWidth = typeof width === 'number' ? `${width}px` : width;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 1000,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${TRANSITION_MS}ms ease`,
        }}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: drawerWidth,
          maxWidth: '100vw',
          background: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : `translateX(${drawerWidth})`,
          transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #f3f4f6',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', minWidth: 0 }}>
            {title ?? ''}
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: 4,
              display: 'flex',
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            {/* X icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body (스크롤) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
              {/* 간단 스피너 */}
              <div style={{
                width: 28, height: 28,
                border: '3px solid #e5e7eb',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'o4o-spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes o4o-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : children}
        </div>

        {/* Footer (sticky) */}
        {(footer || (actions && actions.length > 0)) && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexShrink: 0,
            background: '#fff',
          }}>
            {footer ?? actions?.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: action.disabled || action.loading ? 'not-allowed' : 'pointer',
                  opacity: action.disabled ? 0.5 : 1,
                  ...variantStyle[action.variant ?? 'default'],
                }}
              >
                {action.loading ? '처리 중...' : action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
