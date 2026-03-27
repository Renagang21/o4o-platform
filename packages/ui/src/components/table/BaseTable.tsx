/**
 * BaseTable — O4O Platform Table Rendering Engine
 *
 * WO-O4O-TABLE-BASE-COMPONENT-V1
 * WO-O4O-EDITABLE-TABLE-REFACTOR-V1 — customization hooks 추가
 * WO-O4O-DATATABLE-BASE-ALIGN-V1 — renderAfterRow, header hooks 추가
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
import type { ReactNode } from 'react';

// ─── Types ──────────────────────────────────────

export interface BaseColumn<T> {
  key: string;
  header: ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  /** 행별 동적 td 클래스. 반환값이 있으면 tdClassName/className 대신 사용. */
  cellClassName?: (row: T, rowIndex: number) => string;
  /** 셀 클릭 핸들러 (editable cell 등에 사용) */
  onCellClick?: (row: T, rowIndex: number) => void;
  /** th 클릭 핸들러 (정렬 등에 사용) */
  onHeaderClick?: () => void;
  /** th에 추가할 클래스 (정렬 가능 표시 등) */
  headerClassName?: string;
  render?: (row: T, rowIndex: number) => ReactNode;
}

export interface BaseTableProps<T> {
  columns: BaseColumn<T>[];
  data: T[];
  rowKey?: (row: T, index: number) => string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  /** th 기본 클래스 오버라이드. whitespace-nowrap + align은 항상 적용. */
  thClassName?: string;
  /** td 기본 클래스 오버라이드. whitespace-nowrap + align은 항상 적용. */
  tdClassName?: string;
  /** 행 클래스. 제공하면 기본 hover 대신 사용. */
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  /** 각 행 뒤에 추가 콘텐츠 렌더링 (확장 행 등). null 반환 시 무시. */
  renderAfterRow?: (row: T, index: number) => ReactNode;
  emptyMessage?: ReactNode;
}

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
                      const content = col.render
                        ? col.render(row, rowIndex)
                        : row[col.key];

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
