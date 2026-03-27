/**
 * EditableDataTable — Inline Editable Table (엑셀형 기반)
 *
 * WO-O4O-LIST-BASE-MODULE-V1
 * WO-O4O-EDITABLE-TABLE-REFACTOR-V1 — BaseTable 기반 재구성
 * WO-O4O-TABLE-COLUMN-TYPE-UNIFICATION-V1 — O4OColumn 통합
 *
 * BaseTable 렌더링 엔진 위의 thin wrapper.
 * 셀 클릭 → input 전환, dirty tracking, batch save.
 * editable=true 컬럼만 편집 가능. 변경된 행은 하이라이트.
 */

import { useState, useCallback, useRef } from 'react';
import type React from 'react';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import type { EditableDataTableProps, ListColumnDef } from './types';

interface EditingCell {
  rowKey: string;
  columnKey: string;
}

function getRowKeyValue<T extends Record<string, any>>(
  row: T,
  rowKey: keyof T | ((row: T) => string),
  index: number,
): string {
  if (typeof rowKey === 'function') return rowKey(row);
  return String(row[rowKey]) || `row-${index}`;
}

function getCellValue<T>(row: T, key: string): any {
  return (row as any)[key];
}

export function EditableDataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  onSave,
  saving = false,
  className = '',
}: EditableDataTableProps<T>) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [dirtyRows, setDirtyRows] = useState<Map<string, Partial<T>>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  const hasDirtyRows = dirtyRows.size > 0;

  const getDirtyValue = (rKey: string, colKey: string): any => {
    const dirty = dirtyRows.get(rKey);
    if (dirty && colKey in dirty) return (dirty as any)[colKey];
    return undefined;
  };

  const getDisplayValue = (row: T, rKey: string, colKey: string): any => {
    const dirtyVal = getDirtyValue(rKey, colKey);
    if (dirtyVal !== undefined) return dirtyVal;
    return getCellValue(row, colKey);
  };

  const handleCellClick = (rKey: string, col: ListColumnDef<T>) => {
    if (!col.editable) return;
    setEditingCell({ rowKey: rKey, columnKey: col.key });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCellChange = useCallback(
    (rKey: string, colKey: string, newValue: any) => {
      setDirtyRows((prev) => {
        const next = new Map(prev);
        const existing = next.get(rKey) || {};
        next.set(rKey, { ...existing, [colKey]: newValue } as Partial<T>);
        return next;
      });
    },
    [],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Enter') {
      setEditingCell(null);
    }
  };

  const handleSave = async () => {
    if (!onSave || !hasDirtyRows) return;
    const changedRows: T[] = [];
    for (const [rKey, changes] of dirtyRows.entries()) {
      const originalRow = data.find(
        (row, idx) => getRowKeyValue(row, rowKey, idx) === rKey,
      );
      if (originalRow) {
        changedRows.push({ ...originalRow, ...changes });
      }
    }
    await onSave(changedRows);
    setDirtyRows(new Map());
    setEditingCell(null);
  };

  const handleDiscard = () => {
    setDirtyRows(new Map());
    setEditingCell(null);
  };

  // ─── Column Mapping: ListColumnDef → O4OColumn ───

  const o4oColumns: O4OColumn<T>[] = columns.map((col) => ({
    key: col.key,
    header: col.header,
    width: col.width,
    align: col.align,

    accessor: (row: T, index: number) => {
      const rKey = getRowKeyValue(row, rowKey, index);
      return getDisplayValue(row, rKey, col.key);
    },

    onCellClick: col.editable
      ? (row: T, index: number) => {
          const rKey = getRowKeyValue(row, rowKey, index);
          handleCellClick(rKey, col);
        }
      : undefined,

    cellClassName: (row: T, index: number) => {
      const rKey = getRowKeyValue(row, rowKey, index);
      const isEditing =
        editingCell?.rowKey === rKey && editingCell?.columnKey === col.key;

      if (isEditing && col.editable) {
        return 'px-4 py-2';
      }
      return `px-4 py-3 text-sm text-slate-700 ${col.editable ? 'cursor-pointer hover:bg-blue-50' : ''}`;
    },

    render: (value: any, row: T, index: number) => {
      const rKey = getRowKeyValue(row, rowKey, index);
      const isEditing =
        editingCell?.rowKey === rKey && editingCell?.columnKey === col.key;

      // Editing mode — custom edit renderer
      if (isEditing && col.editable && col.editRender) {
        return col.editRender(value, row, (val) =>
          handleCellChange(rKey, col.key, val),
        );
      }

      // Editing mode — default text input
      if (isEditing && col.editable) {
        return (
          <input
            ref={inputRef}
            type="text"
            value={value ?? ''}
            onChange={(e) =>
              handleCellChange(rKey, col.key, e.target.value)
            }
            onKeyDown={handleKeyDown}
            onBlur={() => setEditingCell(null)}
            className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        );
      }

      // Display mode
      return col.render
        ? col.render(value, { ...row, ...dirtyRows.get(rKey) } as T, index)
        : value;
    },
  }));

  // ─── Loading skeleton ───

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-slate-100 border-b border-slate-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 border-b border-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Save/Discard toolbar */}
      {hasDirtyRows && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200">
          <span className="text-sm text-amber-700">
            {dirtyRows.size}건 변경됨
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      <BaseTable
        columns={o4oColumns}
        data={data}
        rowKey={(row, index) => getRowKeyValue(row, rowKey, index)}
        headerClassName="bg-slate-50 border-b border-slate-200"
        bodyClassName="divide-y divide-slate-100"
        thClassName="px-4 py-3 text-xs font-medium text-slate-500 uppercase"
        rowClassName={(row, index) => {
          const rKey = getRowKeyValue(row, rowKey, index);
          return dirtyRows.has(rKey) ? 'bg-amber-50' : 'hover:bg-slate-50';
        }}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
