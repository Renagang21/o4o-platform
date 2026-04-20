/**
 * SelectionTable — 선택 중심 Table Wrapper
 *
 * WO-O4O-SELECTION-TABLE-DETAIL-DRAWER-V1
 *
 * "선택 → 액션" 워크플로우 표준화.
 * BaseTable + ActionBar 위에 선택 전용 래퍼를 제공한다.
 *
 * - controlled / uncontrolled 선택 상태 모두 지원
 * - maxSelect 초과 방어
 * - submit 버튼 (선택 완료)
 * - dense 모드 (row height 축소)
 * - onRowClick → Drawer 연결 표준 포인트
 */

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { BaseTable } from './BaseTable';
import { ActionBar, type ActionBarAction } from './ActionBar';
import type { O4OColumn } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SelectionTableProps<T extends Record<string, any>> {
  columns: O4OColumn<T>[];
  data: T[];
  /** 행 키 추출. keyof T (string 변환) 또는 함수 */
  rowKey: keyof T | ((row: T) => string);

  // ─── 선택 상태 (controlled or uncontrolled) ───
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** 최대 선택 개수. 초과 시 추가 선택 차단 */
  maxSelect?: number;

  // ─── 주 액션 ───
  /** 선택 완료 버튼 텍스트. default: '선택 완료' */
  submitLabel?: string;
  /** 선택 완료 시 선택된 row 배열 전달 */
  onSubmit: (selectedRows: T[]) => void;
  submitDisabled?: boolean;

  // ─── 보조 bulk 액션 ───
  bulkActions?: ActionBarAction[];

  // ─── 표시 ───
  loading?: boolean;
  emptyMessage?: ReactNode;
  /** row height / padding 축소 */
  dense?: boolean;
  /** 선택 요약 위치. default: 'top' */
  summaryPosition?: 'top' | 'bottom';

  // ─── Drawer 연결 표준 포인트 ───
  onRowClick?: (row: T) => void;
}

// ─── rowKey 정규화 ────────────────────────────────────────────────────────────

function resolveKey<T>(row: T, rowKey: keyof T | ((row: T) => string)): string {
  return typeof rowKey === 'function'
    ? rowKey(row)
    : String((row as any)[rowKey]);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SelectionTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  selectedKeys: controlledKeys,
  onSelectionChange,
  maxSelect,
  submitLabel = '선택 완료',
  onSubmit,
  submitDisabled,
  bulkActions = [],
  loading = false,
  emptyMessage,
  dense = false,
  summaryPosition = 'top',
  onRowClick,
}: SelectionTableProps<T>) {
  // ─── Uncontrolled 내부 상태 ───
  const [internalKeys, setInternalKeys] = useState<Set<string>>(new Set());

  const isControlled = controlledKeys !== undefined;
  const selectedKeys = isControlled ? controlledKeys : internalKeys;

  const handleSelectionChange = useCallback((keys: Set<string>) => {
    if (!isControlled) setInternalKeys(keys);
    onSelectionChange?.(keys);
  }, [isControlled, onSelectionChange]);

  // ─── maxSelect 방어 ───
  const handleSelectionChangeWithMax = useCallback((keys: Set<string>) => {
    if (maxSelect !== undefined && keys.size > maxSelect) {
      console.warn(`[SelectionTable] maxSelect(${maxSelect}) 초과 — 선택 차단`);
      return;
    }
    handleSelectionChange(keys);
  }, [maxSelect, handleSelectionChange]);

  // ─── 선택된 row 객체 목록 ───
  const selectedRows = useMemo(
    () => data.filter(row => selectedKeys.has(resolveKey(row, rowKey))),
    [data, selectedKeys, rowKey]
  );

  // ─── BaseTable rowKey 변환 ───
  const baseRowKey = useCallback(
    (row: T) => resolveKey(row, rowKey),
    [rowKey]
  );

  // ─── _select 컬럼 추가 ───
  const columnsWithSelect = useMemo<O4OColumn<T>[]>(() => {
    const hasSelectCol = columns.some(c => c.key === '_select');
    if (hasSelectCol) return columns;
    return [
      {
        key: '_select',
        header: '',
        system: true,
        width: 44,
        render: (_val, row) => {
          const key = resolveKey(row, rowKey);
          const checked = selectedKeys.has(key);
          return (
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                const next = new Set(selectedKeys);
                if (checked) {
                  next.delete(key);
                } else {
                  if (maxSelect !== undefined && next.size >= maxSelect) {
                    console.warn(`[SelectionTable] maxSelect(${maxSelect}) 초과 — 선택 차단`);
                    return;
                  }
                  next.add(key);
                }
                handleSelectionChange(next);
              }}
              style={{ cursor: 'pointer' }}
            />
          );
        },
      } as O4OColumn<T>,
      ...columns,
    ];
  }, [columns, selectedKeys, rowKey, maxSelect, handleSelectionChange]);

  // ─── dense 스타일 ───
  const denseClass = dense ? 'text-xs' : '';
  const tdClass = dense ? 'px-3 py-2 text-sm text-gray-900' : undefined;
  const thClass = dense ? 'px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider' : undefined;

  // ─── 선택 요약 ───
  const summary = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 4px',
      fontSize: 13,
      color: selectedKeys.size > 0 ? '#5b21b6' : '#6b7280',
    }}>
      <span>
        {selectedKeys.size > 0
          ? `${selectedKeys.size}개 선택됨${maxSelect ? ` (최대 ${maxSelect}개)` : ''}`
          : `전체 ${data.length}개`}
      </span>
      {selectedKeys.size > 0 && (
        <button
          onClick={() => handleSelectionChange(new Set())}
          style={{
            fontSize: 12, color: '#6b7280', background: 'none',
            border: 'none', cursor: 'pointer', padding: '2px 6px',
          }}
        >
          선택 해제
        </button>
      )}
    </div>
  );

  // ─── bulk 액션 (ActionBar) ───
  const allBulkActions: ActionBarAction[] = [
    ...bulkActions,
    {
      key: '__submit__',
      label: submitLabel,
      variant: 'primary',
      disabled: submitDisabled || selectedKeys.size === 0,
      onClick: () => onSubmit(selectedRows),
    },
  ];

  return (
    <div className={denseClass}>
      {summaryPosition === 'top' && summary}

      {/* ActionBar: selectedCount > 0 이면 표시 */}
      <ActionBar
        selectedCount={selectedKeys.size}
        actions={allBulkActions}
        onClearSelection={() => handleSelectionChange(new Set())}
      />

      <BaseTable<T>
        columns={columnsWithSelect}
        data={data}
        rowKey={baseRowKey}
        selectable={true}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChangeWithMax}
        emptyMessage={loading ? '불러오는 중...' : emptyMessage}
        onRowClick={onRowClick ? (row) => onRowClick(row) : undefined}
        thClassName={thClass}
        tdClassName={tdClass}
      />

      {summaryPosition === 'bottom' && summary}
    </div>
  );
}
