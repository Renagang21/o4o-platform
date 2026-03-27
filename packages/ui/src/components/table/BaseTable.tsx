/**
 * BaseTable — O4O Platform Table Rendering Engine
 *
 * WO-O4O-TABLE-BASE-COMPONENT-V1
 * WO-O4O-TABLE-COLUMN-TYPE-UNIFICATION-V1 — O4OColumn + accessor 지원
 *
 * 모든 테이블의 공통 렌더링/레이아웃 엔진.
 * DataTable, EditableTable 등은 이 컴포넌트의 thin wrapper.
 *
 * Layout 표준 (고정):
 *  - table:    min-w-full
 *  - wrapper:  overflow-x-auto
 *  - th / td:  whitespace-nowrap
 */

import { Fragment } from 'react';
import type { BaseTableProps } from './types';

// Re-export types for convenience
export type { O4OColumn, BaseColumn, BaseTableProps } from './types';

// ─── Helpers ────────────────────────────────────

const alignClass = (align?: 'left' | 'center' | 'right') => {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
};

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

  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full ${className}`}>
        <thead className={headerClassName}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width != null ? { width: col.width } : undefined}
                onClick={col.onHeaderClick}
                className={`whitespace-nowrap ${thBase} ${alignClass(col.align)} ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </th>
            ))}
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
                    {columns.map((col) => {
                      const value = col.accessor
                        ? col.accessor(row, rowIndex)
                        : row[col.key];
                      const content = col.render
                        ? col.render(value, row, rowIndex)
                        : value;

                      const dynamicCls = col.cellClassName?.(row, rowIndex);
                      const cellCls = dynamicCls ?? `${tdBase} ${col.className ?? ''}`;

                      return (
                        <td
                          key={col.key}
                          onClick={col.onCellClick ? () => col.onCellClick!(row, rowIndex) : undefined}
                          className={`whitespace-nowrap ${cellCls} ${alignClass(col.align)}`}
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
