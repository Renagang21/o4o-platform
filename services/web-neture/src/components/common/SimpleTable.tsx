/**
 * SimpleTable - Neture용 축약 Table UI
 *
 * 설계 원칙:
 * - WordPress 스타일 개념 차용
 * - 최소 기능만 구현 (GlycoPharm 전체 복사 ❌)
 * - 컬럼 최소화, 정렬/선택 기능 제거
 */

import { type FC, type ReactNode } from 'react';

export interface SimpleTableColumn {
  id: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface SimpleTableRow {
  id: string;
  data: Record<string, ReactNode>;
  actions?: ReactNode; // 간단한 액션 버튼
}

interface SimpleTableProps {
  columns: SimpleTableColumn[];
  rows: SimpleTableRow[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * SimpleTable Component (Neture Compact Version)
 */
export const SimpleTable: FC<SimpleTableProps> = ({
  columns,
  rows,
  loading = false,
  emptyMessage = '자료가 없습니다',
  className = '',
}) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse border border-gray-300">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-300`}
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
        <tbody className="bg-white">
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-gray-500"
              >
                <div className="flex justify-center items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                  <span>불러오는 중...</span>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 transition-colors border-t border-gray-200"
              >
                {columns.map((column, index) => {
                  const isFirstColumn = index === 0;
                  return (
                    <td
                      key={column.id}
                      className={`px-4 py-3 text-sm text-gray-800 ${
                        isFirstColumn ? 'font-medium' : ''
                      }`}
                      style={{ textAlign: column.align || 'left' }}
                    >
                      <div className="cell-content">
                        {row.data[column.id]}
                        {isFirstColumn && row.actions && (
                          <div className="mt-2 flex gap-2">
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

export default SimpleTable;
