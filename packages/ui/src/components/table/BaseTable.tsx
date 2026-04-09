/**
 * BaseTable — O4O Platform Table Rendering Engine
 *
 * WO-O4O-TABLE-BASE-COMPONENT-V1
 * WO-O4O-TABLE-COLUMN-TYPE-UNIFICATION-V1 — O4OColumn + accessor 지원
 * WO-NETURE-SUPPLIER-PRODUCTS-COLUMN-RESIZE-IMPLEMENTATION-V1 — 컬럼 드래그 리사이즈
 * WO-O4O-BASETABLE-COLUMN-REORDER-AND-PERSISTENCE-V1 — reorder + persistence + visibility
 *
 * 모든 테이블의 공통 렌더링/레이아웃 엔진.
 * DataTable, EditableTable 등은 이 컴포넌트의 thin wrapper.
 *
 * Layout 표준 (고정):
 *  - table:    min-w-full, table-layout: fixed (resizable 모드)
 *  - wrapper:  overflow-x-auto
 *  - th / td:  whitespace-nowrap
 */

import { Fragment, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { BaseTableProps, O4OColumn, SortState, SortDirection } from './types';

// Re-export types for convenience
export type { O4OColumn, BaseColumn, BaseTableProps, SortState, SortDirection } from './types';

// ─── Sort helpers (WO-O4O-BASETABLE-FRONTEND-SORTING-V1) ───

function getSortValue<T>(col: O4OColumn<T>, row: T, index: number): unknown {
  if (col.sortAccessor) return col.sortAccessor(row);
  if (col.accessor) return col.accessor(row, index);
  return (row as any)[col.key];
}

/**
 * null/undefined/'' 는 항상 뒤로 보내고, 같은 타입이면 자연 비교.
 * 숫자/문자 혼합 시 문자열로 강등.
 * 동일 값일 때는 0 반환 → Array.sort는 stable이므로 기존 순서 유지.
 */
function compareSortValues(a: unknown, b: unknown): number {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b ? 0 : a ? 1 : -1;
  }

  // locale-aware string compare
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

const SORT_NONE: SortState = { key: null, direction: null };

// ─── Helpers ────────────────────────────────────

const alignClass = (align?: 'left' | 'center' | 'right') => {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
};

/** CSS width 값을 px 숫자로 파싱. 실패 시 fallback 반환. */
function parsePx(v: string | number | undefined, fallback: number): number {
  if (v == null) return fallback;
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

// ─── Persistence ────────────────────────────────

interface TablePersistedState {
  order?: string[];
  widths?: Record<string, number>;
  hidden?: string[];
}

function loadState(tableId: string): TablePersistedState | null {
  try {
    const raw = localStorage.getItem(`o4o_table_${tableId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(tableId: string, state: TablePersistedState): void {
  try {
    localStorage.setItem(`o4o_table_${tableId}`, JSON.stringify(state));
  } catch { /* quota exceeded — ignore */ }
}

// ─── Defaults ───────────────────────────────────

const DEFAULT_TH = 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider';
const DEFAULT_TD = 'px-4 py-3 text-sm text-gray-900';

// ─── Component ──────────────────────────────────

export function BaseTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  className = '',
  headerClassName = 'bg-gray-50',
  bodyClassName = 'bg-white divide-y divide-gray-200',
  thClassName,
  tdClassName,
  rowClassName,
  onRowClick,
  renderAfterRow,
  emptyMessage = '데이터가 없습니다',
  tableId,
  reorderable,
  persistState: shouldPersist,
  columnVisibility,
  selectable,
  selectedKeys,
  onSelectionChange,
}: BaseTableProps<T>) {
  const thBase = thClassName ?? DEFAULT_TH;
  const tdBase = tdClassName ?? DEFAULT_TD;

  // ─── Persisted state ───

  const persistedRef = useRef<TablePersistedState | null>(null);
  if (persistedRef.current === null && tableId && shouldPersist) {
    persistedRef.current = loadState(tableId) || {};
  }

  // ─── Column order state ───

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const persisted = persistedRef.current?.order;
    if (persisted && persisted.length > 0) return persisted;
    return columns.map((c) => c.key);
  });

  // ─── Hidden columns state ───

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    const persisted = persistedRef.current?.hidden;
    return new Set(persisted || []);
  });

  const [visibilityOpen, setVisibilityOpen] = useState(false);

  // Sync column order when columns change (new columns added, etc.)
  useEffect(() => {
    const colKeys = new Set(columns.map((c) => c.key));
    setColumnOrder((prev) => {
      const existing = prev.filter((k) => colKeys.has(k));
      const added = columns.map((c) => c.key).filter((k) => !existing.includes(k));
      const merged = [...existing, ...added];
      if (merged.length === prev.length && merged.every((k, i) => k === prev[i])) return prev;
      return merged;
    });
  }, [columns]);

  // Apply order + visibility to get effective columns
  // System columns (sticky/selection) are always first, never reordered or hidden
  const effectiveColumns = useMemo(() => {
    const colMap = new Map(columns.map((c) => [c.key, c]));
    const systemCols = columns.filter((c) => c.system);
    const regularCols = columnOrder
      .filter((key) => colMap.has(key) && !hiddenKeys.has(key) && !colMap.get(key)!.system)
      .map((key) => colMap.get(key)!);
    return [...systemCols, ...regularCols];
  }, [columns, columnOrder, hiddenKeys]);

  // ─── Frontend sorting (WO-O4O-BASETABLE-FRONTEND-SORTING-V1) ───
  // 정렬 UI/상태/실행을 BaseTable에서 일괄 처리.
  // 정렬은 props.data 배열 기준으로 수행 (서버 정렬 아님).

  const [sortState, setSortState] = useState<SortState>(SORT_NONE);

  // 정렬 컬럼이 visibility로 숨겨지면 정렬 해제 (UI 혼란 방지)
  useEffect(() => {
    if (sortState.key && hiddenKeys.has(sortState.key)) {
      setSortState(SORT_NONE);
    }
  }, [hiddenKeys, sortState.key]);

  const handleHeaderSort = useCallback((col: O4OColumn<T>) => {
    if (col.system || !col.sortable) return;
    setSortState((prev) => {
      if (prev.key !== col.key) return { key: col.key, direction: 'asc' };
      if (prev.direction === 'asc') return { key: col.key, direction: 'desc' };
      return SORT_NONE; // desc → none
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortState.key || !sortState.direction) return data;
    const col = effectiveColumns.find((c) => c.key === sortState.key);
    if (!col) return data;
    // 안정 정렬 — Array.sort는 stable
    const indexed = data.map((row, i) => ({ row, i }));
    indexed.sort((a, b) => {
      const av = getSortValue(col, a.row, a.i);
      const bv = getSortValue(col, b.row, b.i);
      const cmp = compareSortValues(av, bv);
      if (cmp !== 0) return sortState.direction === 'desc' ? -cmp : cmp;
      return a.i - b.i; // tie-breaker: 원본 순서 유지
    });
    return indexed.map((x) => x.row);
  }, [data, sortState, effectiveColumns]);

  // ─── Selection (select-all / indeterminate) ───

  const getRowKey = useCallback((row: T, index: number) => {
    return rowKey ? rowKey(row, index) : `row-${index}`;
  }, [rowKey]);

  const selectAllState = useMemo<'none' | 'some' | 'all'>(() => {
    if (!selectable || !selectedKeys || data.length === 0) return 'none';
    const visibleKeys = data.map((row, i) => getRowKey(row, i));
    const selectedCount = visibleKeys.filter((k) => selectedKeys.has(k)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === visibleKeys.length) return 'all';
    return 'some';
  }, [selectable, selectedKeys, data, getRowKey]);

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    const visibleKeys = data.map((row, i) => getRowKey(row, i));
    if (selectAllState === 'all') {
      // Deselect all visible
      const next = new Set(selectedKeys);
      visibleKeys.forEach((k) => next.delete(k));
      onSelectionChange(next);
    } else {
      // Select all visible
      const next = new Set(selectedKeys);
      visibleKeys.forEach((k) => next.add(k));
      onSelectionChange(next);
    }
  }, [data, getRowKey, selectAllState, selectedKeys, onSelectionChange]);

  // WO-NETURE-PRODUCT-TABLE-SELECTION-AND-APPROVAL-REFRESH-FIX-V1
  // `selectable` prop은 헤더 select-all만 auto-wire한다. body cell은 consumer의 render가 책임진다.
  // 이전에 있던 handleToggleRow useCallback은 어디서도 호출되지 않는 dead code였으므로 제거했다.

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectAllState === 'some';
    }
  }, [selectAllState]);

  // ─── Persist helper ───

  const persist = useCallback((partial: Partial<TablePersistedState>) => {
    if (!tableId || !shouldPersist) return;
    const current = persistedRef.current || {};
    const next = { ...current, ...partial };
    persistedRef.current = next;
    saveState(tableId, next);
  }, [tableId, shouldPersist]);

  // ─── Drag reorder ───

  const dragColRef = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, key: string) => {
    if (!reorderable) return;
    dragColRef.current = key;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  }, [reorderable]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    dragColRef.current = null;
    setDragOverKey(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    const sourceKey = dragColRef.current;
    if (!sourceKey || sourceKey === targetKey) {
      setDragOverKey(null);
      return;
    }
    setColumnOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(sourceKey);
      const toIdx = next.indexOf(targetKey);
      if (fromIdx < 0 || toIdx < 0) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, sourceKey);
      persist({ order: next });
      return next;
    });
    setDragOverKey(null);
  }, [persist]);

  // ─── Column visibility toggle ───

  const toggleVisibility = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persist({ hidden: Array.from(next) });
      return next;
    });
  }, [persist]);

  // ─── Column resize state ───

  const hasResizable = effectiveColumns.some((c) => c.resizable);

  const [colWidths, setColWidths] = useState<number[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);
  const dragResizeRef = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
    colKey: string;
  } | null>(null);

  // 최초 마운트 시 실제 렌더링된 th 폭으로 초기화 + 저장된 폭 적용
  useEffect(() => {
    if (!hasResizable || !tableRef.current) return;
    const ths = tableRef.current.querySelectorAll('thead th');
    if (ths.length === 0) return;
    const savedWidths = persistedRef.current?.widths;
    const widths = Array.from(ths).map((th, i) => {
      const key = effectiveColumns[i]?.key;
      if (key && savedWidths?.[key]) return savedWidths[key];
      return (th as HTMLElement).offsetWidth;
    });
    setColWidths(widths);
  }, [hasResizable, effectiveColumns.length]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      if (tableRef.current) {
        const ths = tableRef.current.querySelectorAll('thead th');
        const freshWidths = Array.from(ths).map((th) => (th as HTMLElement).offsetWidth);
        setColWidths(freshWidths);
        dragResizeRef.current = {
          colIndex,
          startX: e.clientX,
          startWidth: freshWidths[colIndex],
          colKey: effectiveColumns[colIndex]?.key || '',
        };
      }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragResizeRef.current) return;
        const { colIndex: ci, startX, startWidth } = dragResizeRef.current;
        const delta = ev.clientX - startX;
        const col = effectiveColumns[ci];
        const minW = parsePx(col?.minWidth, 40);
        const maxW = parsePx(col?.maxWidth, 9999);
        const newWidth = Math.max(minW, Math.min(maxW, startWidth + delta));
        setColWidths((prev) => {
          const next = [...prev];
          next[ci] = newWidth;
          return next;
        });
      };

      const handleMouseUp = () => {
        // Persist widths on resize end
        if (dragResizeRef.current && tableId && shouldPersist) {
          const savedWidths = { ...(persistedRef.current?.widths || {}) };
          const ths = tableRef.current?.querySelectorAll('thead th');
          if (ths) {
            Array.from(ths).forEach((th, i) => {
              const key = effectiveColumns[i]?.key;
              if (key) savedWidths[key] = (th as HTMLElement).offsetWidth;
            });
          }
          persist({ widths: savedWidths });
        }
        dragResizeRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [effectiveColumns, tableId, shouldPersist, persist],
  );

  // ─── Render ───

  const useFixedLayout = hasResizable && colWidths.length === effectiveColumns.length;
  const totalWidth = useFixedLayout ? colWidths.reduce((s, w) => s + w, 0) : undefined;

  return (
    <div className="overflow-x-auto">
      {/* Column visibility toggle */}
      {columnVisibility && (
        <div className="relative mb-2 flex justify-end">
          <button
            onClick={() => setVisibilityOpen(!visibilityOpen)}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          >
            컬럼 설정
          </button>
          {visibilityOpen && (
            <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[160px]">
              <p className="text-xs font-medium text-gray-500 mb-2">표시할 컬럼</p>
              {columns.filter((col) => !col.system).map((col) => (
                <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 px-1 rounded text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={!hiddenKeys.has(col.key)}
                    onChange={() => toggleVisibility(col.key)}
                    className="w-3.5 h-3.5 accent-blue-600"
                  />
                  {typeof col.header === 'string' ? col.header : col.key}
                </label>
              ))}
              <button
                onClick={() => setVisibilityOpen(false)}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 w-full text-center"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      )}

      <table
        ref={tableRef}
        className={useFixedLayout ? className : `min-w-full ${className}`}
        style={useFixedLayout ? { tableLayout: 'fixed', width: totalWidth } : undefined}
      >
        <thead className={headerClassName}>
          <tr>
            {effectiveColumns.map((col, ci) => {
              const widthStyle: React.CSSProperties = {};
              if (useFixedLayout && colWidths[ci] != null) {
                widthStyle.width = colWidths[ci];
              } else if (col.width != null) {
                widthStyle.width = col.width;
              }
              if (col.minWidth != null) widthStyle.minWidth = col.minWidth;
              if (col.maxWidth != null) widthStyle.maxWidth = col.maxWidth;

              const isDragOver = dragOverKey === col.key && dragColRef.current !== col.key;
              const isSystem = col.system;
              const isSticky = col.sticky;
              const canDrag = reorderable && !isSystem;

              // Sticky styles
              const stickyStyle: React.CSSProperties = isSticky
                ? { position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'inherit' }
                : {};

              // Selection column: render select-all checkbox
              const headerContent = (selectable && col.key === '_select')
                ? (
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={selectAllState === 'all'}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                )
                : col.header;

              const isSortable = !!col.sortable && !isSystem;
              const isSorted = isSortable && sortState.key === col.key && sortState.direction !== null;
              const sortDir: SortDirection = isSorted ? sortState.direction : null;

              const onThClick = isSortable
                ? (e: React.MouseEvent) => {
                    col.onHeaderClick?.();
                    handleHeaderSort(col);
                    e.stopPropagation();
                  }
                : col.onHeaderClick;

              return (
                <th
                  key={col.key}
                  style={{ ...widthStyle, ...stickyStyle }}
                  onClick={onThClick}
                  aria-sort={
                    !isSortable
                      ? undefined
                      : sortDir === 'asc'
                      ? 'ascending'
                      : sortDir === 'desc'
                      ? 'descending'
                      : 'none'
                  }
                  draggable={canDrag}
                  onDragStart={canDrag ? (e) => handleDragStart(e, col.key) : undefined}
                  onDragEnd={canDrag ? handleDragEnd : undefined}
                  onDragOver={canDrag ? (e) => handleDragOver(e, col.key) : undefined}
                  onDrop={canDrag ? (e) => handleDrop(e, col.key) : undefined}
                  className={`whitespace-nowrap ${thBase} ${alignClass(col.align)} ${col.headerClassName ?? ''} ${col.resizable ? 'relative' : ''} ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${isSortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''} ${isDragOver ? 'bg-blue-50 border-l-2 border-blue-400' : ''} ${isSticky ? 'border-r border-gray-200' : ''}`}
                >
                  {isSortable ? (
                    <span className="inline-flex items-center gap-1">
                      {headerContent}
                      <span
                        aria-hidden="true"
                        className={sortDir ? 'text-gray-700' : 'text-gray-300'}
                      >
                        {sortDir === 'asc' ? '\u25B2' : sortDir === 'desc' ? '\u25BC' : '\u25B4'}
                      </span>
                    </span>
                  ) : (
                    headerContent
                  )}
                  {col.resizable && (
                    <div
                      onMouseDown={(e) => handleMouseDown(e, ci)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: -3,
                        width: 6,
                        height: '100%',
                        cursor: 'col-resize',
                        zIndex: 10,
                      }}
                      className="group"
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '25%',
                          bottom: '25%',
                          left: 2,
                          width: 2,
                          borderRadius: 1,
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.15s',
                        }}
                        className="group-hover:!bg-blue-400"
                      />
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className={bodyClassName}>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={effectiveColumns.length}
                className="px-4 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => {
              const key = rowKey ? rowKey(row, rowIndex) : `row-${rowIndex}`;
              const rowCls = rowClassName
                ? rowClassName(row, rowIndex)
                : `hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`;
              const afterRow = renderAfterRow?.(row, rowIndex);

              return (
                <Fragment key={key}>
                  <tr
                    onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                    className={rowCls}
                  >
                    {effectiveColumns.map((col, ci) => {
                      const value = col.accessor
                        ? col.accessor(row, rowIndex)
                        : row[col.key];
                      const content = col.render
                        ? col.render(value, row, rowIndex)
                        : value;

                      const dynamicCls = col.cellClassName?.(row, rowIndex);
                      const cellCls = dynamicCls ?? `${tdBase} ${col.className ?? ''}`;

                      const tdStyle: React.CSSProperties = {};
                      if (useFixedLayout && colWidths[ci] != null) {
                        tdStyle.width = colWidths[ci];
                      }
                      // Sticky body cell
                      if (col.sticky) {
                        tdStyle.position = 'sticky';
                        tdStyle.left = 0;
                        tdStyle.zIndex = 10;
                        tdStyle.backgroundColor = 'inherit';
                      }

                      return (
                        <td
                          key={col.key}
                          style={tdStyle.width || col.sticky ? tdStyle : undefined}
                          // WO-NETURE-PRODUCT-TABLE-SELECTION-AND-APPROVAL-REFRESH-FIX-V1:
                          // onCellClick이 정의된 셀은 "나는 이 셀을 처리한다"는 계약으로 간주.
                          // row 클릭으로 버블링되지 않도록 stopPropagation을 먼저 호출한다.
                          onClick={col.onCellClick ? (e) => {
                            e.stopPropagation();
                            col.onCellClick!(row, rowIndex);
                          } : undefined}
                          className={`whitespace-nowrap ${cellCls} ${alignClass(col.align)} overflow-hidden text-ellipsis ${col.sticky ? 'border-r border-gray-200' : ''}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                  {afterRow}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
