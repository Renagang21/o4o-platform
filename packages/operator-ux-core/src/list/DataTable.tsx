/**
 * DataTable — Base List Table Component
 *
 * WO-O4O-LIST-BASE-MODULE-V1
 *
 * 컬럼 정의 기반 렌더링 + 클라이언트 사이드 정렬 + 로딩/빈 상태.
 * Neture operator pages의 Tailwind slate 팔레트 기준.
 */

import { useState } from 'react';
import type { DataTableProps, ListColumnDef } from './types';

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

const alignClass = (align?: 'left' | 'center' | 'right') => {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
};

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  const handleSort = (col: ListColumnDef<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null);
        setSortOrder(null);
      }
    } else {
      setSortKey(col.key);
      setSortOrder('asc');
    }
  };

  // Sort data
  const sortedData = [...data];
  if (sortKey && sortOrder) {
    sortedData.sort((a, b) => {
      const aVal = getCellValue(a, sortKey);
      const bVal = getCellValue(b, sortKey);
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }

  // Loading skeleton
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

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase ${alignClass(col.align)} ${col.sortable ? 'cursor-pointer select-none hover:bg-slate-100' : ''}`}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-slate-400">
                        {sortOrder === 'asc' ? '\u25B2' : '\u25BC'}
                      </span>
                    )}
                    {col.sortable && sortKey !== col.key && (
                      <span className="text-slate-300">{'\u25B2'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => {
                const key = getRowKeyValue(row, rowKey, index);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col) => {
                      const value = getCellValue(row, col.key);
                      const content = col.render
                        ? col.render(value, row, index)
                        : value;
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm text-slate-700 ${alignClass(col.align)}`}
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
    </div>
  );
}
