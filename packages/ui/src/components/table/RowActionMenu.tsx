/**
 * RowActionMenu — Row-level Action Menu for DataTable
 *
 * WO-O4O-TABLE-STANDARD-V4 Phase 1
 *
 * 테이블 행 단위 액션을 표준화하는 드롭다운 메뉴.
 * - 인라인 버튼(inlineMax) + 오버플로 메뉴(kebab) 하이브리드 지원
 * - ConfirmActionDialog 내장 연동
 * - 상태 기반 hidden/disabled
 * - 로딩 표시
 *
 * 사용:
 *   <RowActionMenu actions={[
 *     { key: 'approve', label: '승인', icon: <CheckCircle size={14} />, onClick: () => {...}, variant: 'primary' },
 *     { key: 'reject', label: '반려', icon: <XCircle size={14} />, onClick: () => {...}, variant: 'danger',
 *       confirm: { title: '반려 확인', message: '이 요청을 반려하시겠습니까?', variant: 'danger' } },
 *   ]} inlineMax={2} />
 */

import React, { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { ConfirmActionDialog } from './ConfirmActionDialog';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'default' | 'danger' | 'warning';
  requireReason?: boolean;
  /** Show optional reason textarea (requireReason makes it mandatory) */
  showReason?: boolean;
  reasonPlaceholder?: string;
}

export interface RowActionItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (reason?: string) => void | Promise<void>;
  variant?: 'default' | 'danger' | 'warning' | 'primary';
  disabled?: boolean;
  hidden?: boolean;
  loading?: boolean;
  /** Show divider before this item (menu mode only) */
  divider?: boolean;
  /** If set, show ConfirmActionDialog before executing. String = simple message, object = full config */
  confirm?: string | ConfirmConfig;
}

export interface RowActionMenuProps {
  actions: RowActionItem[];
  /** Number of actions to show inline. Rest go to overflow kebab menu. Default: 0 (all in menu) */
  inlineMax?: number;
  disabled?: boolean;
}

const inlineVariantStyles: Record<string, string> = {
  default: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  danger: 'text-red-500 hover:text-red-700 hover:bg-red-50',
  warning: 'text-amber-500 hover:text-amber-700 hover:bg-amber-50',
  primary: 'text-blue-500 hover:text-blue-700 hover:bg-blue-50',
};

const menuVariantStyles: Record<string, string> = {
  default: 'text-slate-700 hover:bg-slate-50',
  danger: 'text-red-600 hover:bg-red-50',
  warning: 'text-amber-600 hover:bg-amber-50',
  primary: 'text-blue-600 hover:bg-blue-50',
};

/** MoreVertical (kebab) icon — inline SVG to avoid lucide dependency */
function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

/** Spinner icon */
function SpinnerIcon() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function parseConfirmConfig(confirm: string | ConfirmConfig): ConfirmConfig {
  if (typeof confirm === 'string') {
    return { title: '확인', message: confirm };
  }
  return confirm;
}

export function RowActionMenu({ actions, inlineMax = 0, disabled }: RowActionMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<RowActionItem | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const visibleActions = actions.filter((a) => !a.hidden);
  const inlineActions = visibleActions.slice(0, inlineMax);
  const overflowActions = visibleActions.slice(inlineMax);

  // Close menu on outside click or escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen]);

  const openMenu = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (disabled) return;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const estHeight = overflowActions.length * 36 + 16;
        const top = spaceBelow > estHeight ? rect.bottom + 4 : rect.top - estHeight - 4;
        setMenuPos({ top, left: rect.right - 192 });
      }
      setMenuOpen((prev) => !prev);
    },
    [disabled, overflowActions.length],
  );

  const handleActionClick = useCallback(async (action: RowActionItem) => {
    if (action.disabled || action.loading) return;
    setMenuOpen(false);
    if (action.confirm) {
      setConfirmAction(action);
    } else {
      await action.onClick();
    }
  }, []);

  const handleConfirm = useCallback(async (reason?: string) => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await confirmAction.onClick(reason);
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction]);

  const handleConfirmClose = useCallback(() => {
    setConfirmAction(null);
    setConfirmLoading(false);
  }, []);

  if (visibleActions.length === 0) return null;

  const confirmConfig = confirmAction?.confirm ? parseConfirmConfig(confirmAction.confirm) : null;

  return (
    <>
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {/* Inline actions */}
        {inlineActions.map((action) => (
          <button
            key={action.key}
            onClick={() => handleActionClick(action)}
            disabled={disabled || action.disabled || action.loading}
            title={action.label}
            className={`p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              inlineVariantStyles[action.variant || 'default']
            }`}
          >
            {action.loading ? <SpinnerIcon /> : action.icon || <span className="text-xs">{action.label}</span>}
          </button>
        ))}

        {/* Overflow kebab menu trigger */}
        {overflowActions.length > 0 && (
          <button
            ref={triggerRef}
            onClick={openMenu}
            disabled={disabled}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="더보기"
          >
            <KebabIcon />
          </button>
        )}

        {/* Dropdown menu */}
        {menuOpen && menuPos && (
          <div
            ref={menuRef}
            className="fixed z-[9999] w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1"
            style={{ top: menuPos.top, left: Math.max(8, menuPos.left) }}
          >
            {overflowActions.map((action, idx) => (
              <React.Fragment key={action.key}>
                {action.divider && idx > 0 && (
                  <div className="h-px bg-slate-100 my-1" />
                )}
                <button
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled || action.loading}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    menuVariantStyles[action.variant || 'default']
                  }`}
                >
                  {action.icon && (
                    <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{action.icon}</span>
                  )}
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.loading && (
                    <span className="ml-auto flex-shrink-0"><SpinnerIcon /></span>
                  )}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirmConfig && (
        <ConfirmActionDialog
          open={!!confirmAction}
          onClose={handleConfirmClose}
          onConfirm={handleConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          variant={confirmConfig.variant}
          requireReason={confirmConfig.requireReason}
          showReason={confirmConfig.showReason}
          reasonPlaceholder={confirmConfig.reasonPlaceholder}
          loading={confirmLoading}
        />
      )}
    </>
  );
}
