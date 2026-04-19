/**
 * ActionBar — Bulk Action Bar for Table Selection
 *
 * WO-O4O-TABLE-STANDARD-V1 (original)
 * WO-O4O-TABLE-STANDARD-V3 (v2: group, visible, tooltip, statusInfo)
 * WO-O4O-TABLE-STANDARD-V4-EXPANSION (v3: confirm support)
 *
 * 테이블 행 선택 시 표시되는 Bulk Action 바.
 * selectedCount === 0 이면 렌더링하지 않는다.
 *
 * V3 추가 (모두 optional — 하위 호환):
 * - tooltip: 버튼 title
 * - group: 시각적 그룹 구분 (그룹 간 세로 구분선)
 * - visible: false면 해당 액션 숨김
 * - statusInfo: 액션 행 아래 상태 정보
 *
 * V4-EXPANSION 추가 (optional — 하위 호환):
 * - confirm: ConfirmActionDialog 연동 (destructive bulk action 보호)
 * - onClick: reason 파라미터 지원 (confirm showReason에서 전달)
 */

import React, { useState, useCallback, type ReactNode } from 'react';
import type { ConfirmConfig } from './RowActionMenu';
import { ConfirmActionDialog } from './ConfirmActionDialog';

export interface ActionBarAction {
  key: string;
  label: string;
  onClick: (reason?: string) => void | Promise<void>;
  variant?: 'primary' | 'danger' | 'warning' | 'default';
  disabled?: boolean;
  icon?: ReactNode;
  loading?: boolean;
  /** V3: 버튼 title 속성 */
  tooltip?: string;
  /** V3: 시각적 그룹 구분 키 */
  group?: string;
  /** V3: false면 숨김 (default: true) */
  visible?: boolean;
  /** V4-EXPANSION: 클릭 전 확인 다이얼로그. String = 간단 메시지, object = 전체 설정 */
  confirm?: string | ConfirmConfig;
}

export interface ActionBarProps {
  selectedCount: number;
  actions: ActionBarAction[];
  onClearSelection: () => void;
  /** V3: 액션 행 아래 상태 정보 (e.g. 선택 항목 분포) */
  statusInfo?: string | ReactNode;
}

const variantClasses: Record<NonNullable<ActionBarAction['variant']>, string> = {
  primary: 'text-white bg-blue-600 hover:bg-blue-700',
  danger: 'text-white bg-rose-600 hover:bg-rose-700',
  warning: 'text-white bg-amber-600 hover:bg-amber-700',
  default: 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50',
};

function parseConfirmConfig(confirm: string | ConfirmConfig): ConfirmConfig {
  if (typeof confirm === 'string') {
    return { title: '확인', message: confirm };
  }
  return confirm;
}

export function ActionBar({ selectedCount, actions, onClearSelection, statusInfo }: ActionBarProps) {
  const [confirmAction, setConfirmAction] = useState<ActionBarAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleActionClick = useCallback((action: ActionBarAction) => {
    if (action.confirm) {
      setConfirmAction(action);
    } else {
      action.onClick();
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

  if (selectedCount === 0) return null;

  // V3: filter visible
  const visibleActions = actions.filter(a => a.visible !== false);

  // V3: group actions — preserve order, insert separators between groups
  const grouped: Array<ActionBarAction | 'separator'> = [];
  let lastGroup: string | undefined;
  for (const action of visibleActions) {
    if (action.group && lastGroup && action.group !== lastGroup) {
      grouped.push('separator');
    }
    grouped.push(action);
    lastGroup = action.group;
  }

  const confirmConfig = confirmAction?.confirm ? parseConfirmConfig(confirmAction.confirm) : null;

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">
            {selectedCount}개 선택
          </span>
          <div className="h-4 w-px bg-blue-200" />
          {grouped.map((item, idx) => {
            if (item === 'separator') {
              return <div key={`sep-${idx}`} className="h-4 w-px bg-blue-200" />;
            }
            return (
              <button
                key={item.key}
                onClick={() => handleActionClick(item)}
                disabled={item.disabled || item.loading}
                title={item.tooltip}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded disabled:opacity-50 transition-colors ${
                  variantClasses[item.variant ?? 'default']
                }`}
              >
                {item.icon && <span className="w-3.5 h-3.5 flex items-center">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
          <button
            onClick={onClearSelection}
            className="ml-auto text-sm text-slate-500 hover:text-slate-700"
          >
            선택 해제
          </button>
        </div>
        {statusInfo && (
          <div className="px-4 text-xs text-slate-500">
            {statusInfo}
          </div>
        )}
      </div>

      {/* V4-EXPANSION: Confirm dialog for bulk actions */}
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
