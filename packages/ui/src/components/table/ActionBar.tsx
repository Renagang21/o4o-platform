/**
 * ActionBar — Bulk Action Bar for Table Selection
 *
 * WO-O4O-TABLE-STANDARD-V1
 *
 * 테이블 행 선택 시 표시되는 Bulk Action 바.
 * selectedCount === 0 이면 렌더링하지 않는다.
 *
 * 디자인: ForumManagementPage 인라인 패턴 기반 (blue-50 bg, blue-200 border)
 */

import type { ReactNode } from 'react';

export interface ActionBarAction {
  key: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'warning' | 'default';
  disabled?: boolean;
  icon?: ReactNode;
  loading?: boolean;
}

export interface ActionBarProps {
  selectedCount: number;
  actions: ActionBarAction[];
  onClearSelection: () => void;
}

const variantClasses: Record<NonNullable<ActionBarAction['variant']>, string> = {
  primary: 'text-white bg-blue-600 hover:bg-blue-700',
  danger: 'text-white bg-rose-600 hover:bg-rose-700',
  warning: 'text-white bg-amber-600 hover:bg-amber-700',
  default: 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50',
};

export function ActionBar({ selectedCount, actions, onClearSelection }: ActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-sm text-blue-700 font-medium">
        {selectedCount}개 선택
      </span>
      <div className="h-4 w-px bg-blue-200" />
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded disabled:opacity-50 transition-colors ${
            variantClasses[action.variant ?? 'default']
          }`}
        >
          {action.icon && <span className="w-3.5 h-3.5 flex items-center">{action.icon}</span>}
          {action.label}
        </button>
      ))}
      <button
        onClick={onClearSelection}
        className="ml-auto text-sm text-slate-500 hover:text-slate-700"
      >
        선택 해제
      </button>
    </div>
  );
}
