/**
 * GlucoseTable - GlucoseView 축약 Table UI (Spike)
 *
 * 설계 원칙:
 * - GlucoseView 브랜드에 맞는 시각적 스타일
 * - 컬럼 최소화 (3-4개)
 * - 정렬/선택 기능 제거
 */

import { type FC, type ReactNode } from 'react';

export interface GlucoseTableColumn {
  id: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface GlucoseTableRow {
  id: string;
  data: Record<string, ReactNode>;
  actions?: ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
}

interface GlucoseTableProps {
  columns: GlucoseTableColumn[];
  rows: GlucoseTableRow[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * GlucoseTable Component (Condensed Version)
 */
export const GlucoseTable: FC<GlucoseTableProps> = ({
  columns,
  rows,
  loading = false,
  emptyMessage = '자료가 없습니다',
  className = '',
}) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className="text-left px-6 py-4 text-sm font-medium text-slate-500"
                style={{
                  width: column.width,
                  textAlign: column.align || 'left',
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-slate-500"
              >
                <div className="flex justify-center items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span>불러오는 중...</span>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={row.onClick}
                className={`transition-colors ${
                  row.onClick ? 'cursor-pointer' : ''
                } ${
                  row.isSelected
                    ? 'bg-blue-50 border-l-2 border-l-blue-500'
                    : 'hover:bg-slate-50'
                }`}
              >
                {columns.map((column, index) => {
                  const isFirstColumn = index === 0;
                  return (
                    <td
                      key={column.id}
                      className={`px-6 py-4 ${
                        isFirstColumn ? 'font-medium' : ''
                      }`}
                      style={{ textAlign: column.align || 'left' }}
                    >
                      <div className="cell-content">
                        {row.data[column.id]}
                        {isFirstColumn && row.actions && (
                          <div className="mt-2">
                            {row.actions}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GlucoseTable;
