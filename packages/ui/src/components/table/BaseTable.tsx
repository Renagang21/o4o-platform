/**
 * BaseTable — O4O Platform Table Rendering Engine
 *
 * WO-O4O-TABLE-BASE-COMPONENT-V1
 * WO-O4O-TABLE-COLUMN-TYPE-UNIFICATION-V1 — O4OColumn + accessor 지원
 * WO-NETURE-SUPPLIER-PRODUCTS-COLUMN-RESIZE-IMPLEMENTATION-V1 — 컬럼 드래그 리사이즈
 *
 * 모든 테이블의 공통 렌더링/레이아웃 엔진.
 * DataTable, EditableTable 등은 이 컴포넌트의 thin wrapper.
 *
 * Layout 표준 (고정):
 *  - table:    min-w-full, table-layout: fixed (resizable 모드)
 *  - wrapper:  overflow-x-auto
 *  - th / td:  whitespace-nowrap
 */

import { Fragment, useState, useCallback, useRef, useEffect } from 'react';
import type { BaseTableProps } from './types';

// Re-export types for convenience
export type { O4OColumn, BaseColumn, BaseTableProps } from './types';

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
}: BaseTableProps<T>) {
  const thBase = thClassName ?? DEFAULT_TH;
  const tdBase = tdClassName ?? DEFAULT_TD;

  const hasResizable = columns.some((c) => c.resizable);

  // ─── Column width state (resizable 모드) ───

  const [colWidths, setColWidths] = useState<number[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);
  const dragRef = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  // 최초 마운트 시 실제 렌더링된 th 폭으로 초기화
  useEffect(() => {
    if (!hasResizable || !tableRef.current) return;
    const ths = tableRef.current.querySelectorAll('thead th');
    if (ths.length === 0) return;
    const widths = Array.from(ths).map((th) => (th as HTMLElement).offsetWidth);
    setColWidths(widths);
  }, [hasResizable, columns.length]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      // 현재 실제 폭 스냅샷
      if (tableRef.current) {
        const ths = tableRef.current.querySelectorAll('thead th');
        const freshWidths = Array.from(ths).map((th) => (th as HTMLElement).offsetWidth);
        setColWidths(freshWidths);
        dragRef.current = {
          colIndex,
          startX: e.clientX,
          startWidth: freshWidths[colIndex],
        };
      }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const { colIndex: ci, startX, startWidth } = dragRef.current;
        const delta = ev.clientX - startX;
        const col = columns[ci];
        const minW = parsePx(col.minWidth, 40);
        const maxW = parsePx(col.maxWidth, 9999);
        const newWidth = Math.max(minW, Math.min(maxW, startWidth + delta));

        setColWidths((prev) => {
          const next = [...prev];
          next[ci] = newWidth;
          return next;
        });
      };

      const handleMouseUp = () => {
        dragRef.current = null;
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
    [columns],
  );

  // ─── Render ───

  const useFixedLayout = hasResizable && colWidths.length === columns.length;
  const totalWidth = useFixedLayout ? colWidths.reduce((s, w) => s + w, 0) : undefined;

  return (
    <div className="overflow-x-auto">
      <table
        ref={tableRef}
        className={useFixedLayout ? className : `min-w-full ${className}`}
        style={useFixedLayout ? { tableLayout: 'fixed', width: totalWidth } : undefined}
      >
        <thead className={headerClassName}>
          <tr>
            {columns.map((col, ci) => {
              const widthStyle: React.CSSProperties = {};
              if (useFixedLayout && colWidths[ci] != null) {
                widthStyle.width = colWidths[ci];
              } else if (col.width != null) {
                widthStyle.width = col.width;
              }
              if (col.minWidth != null) widthStyle.minWidth = col.minWidth;
              if (col.maxWidth != null) widthStyle.maxWidth = col.maxWidth;

              return (
                <th
                  key={col.key}
                  style={widthStyle}
                  onClick={col.onHeaderClick}
                  className={`whitespace-nowrap ${thBase} ${alignClass(col.align)} ${col.headerClassName ?? ''} ${col.resizable ? 'relative' : ''}`}
                >
                  {col.header}
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
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
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
                    {columns.map((col, ci) => {
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

                      return (
                        <td
                          key={col.key}
                          style={tdStyle.width ? tdStyle : undefined}
                          onClick={col.onCellClick ? () => col.onCellClick!(row, rowIndex) : undefined}
                          className={`whitespace-nowrap ${cellCls} ${alignClass(col.align)} overflow-hidden text-ellipsis`}
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
