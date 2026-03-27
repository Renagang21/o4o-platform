/**
 * BaseTable — O4O Platform Table Rendering Engine
 *
 * WO-O4O-TABLE-BASE-COMPONENT-V1
 *
 * 모든 테이블의 공통 렌더링/레이아웃 엔진.
 * DataTable, EditableTable 등은 이 컴포넌트의 thin wrapper.
 *
 * Layout 표준 (고정):
 *  - table:    min-w-full
 *  - wrapper:  overflow-x-auto
 *  - th / td:  whitespace-nowrap
 */

import type { ReactNode } from 'react';

// ─── Types ──────────────────────────────────────

export interface BaseColumn<T> {
  key: string;
  header: ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: T, rowIndex: number) => ReactNode;
}

export interface BaseTableProps<T> {
  columns: BaseColumn<T>[];
  data: T[];
  rowKey?: (row: T, index: number) => string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: ReactNode;
}

// ─── Helpers ────────────────────────────────────

const alignClass = (align?: 'left' | 'center' | 'right') => {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
};

// ─── Component ──────────────────────────────────

export function BaseTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  className = '',
  headerClassName = 'bg-gray-50',
  bodyClassName = 'bg-white divide-y divide-gray-200',
  rowClassName,
  onRowClick,
  emptyMessage = '데이터가 없습니다',
}: BaseTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full ${className}`}>
        <thead className={headerClassName}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width != null ? { width: col.width } : undefined}
                className={`whitespace-nowrap px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${alignClass(col.align)}`}
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
              const rowCls = rowClassName?.(row, rowIndex) ?? '';

              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                  className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''} ${rowCls}`}
                >
                  {columns.map((col) => {
                    const content = col.render
                      ? col.render(row, rowIndex)
                      : row[col.key];

                    return (
                      <td
                        key={col.key}
                        className={`whitespace-nowrap px-4 py-3 text-sm text-gray-900 ${alignClass(col.align)} ${col.className ?? ''}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
