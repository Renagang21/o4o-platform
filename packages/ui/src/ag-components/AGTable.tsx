/**
 * AGTable - Antigravity Design System Table
 *
 * Phase 7-A: Core table component
 *
 * Features:
 * - Column definitions
 * - Loading skeleton
 * - Empty state
 * - Pagination support
 * - Sort indicators (visual only in Phase 7-A)
 */

import React, { ReactNode } from 'react';

// Helper to get column header text (supports both header and label)
function getColumnHeader<T>(col: AGTableColumn<T>): string {
  return col.header ?? col.label ?? '';
}

export interface AGTableColumn<T> {
  key: string;
  /** Column header text (preferred) */
  header?: string;
  /** Column header text (alias for header) */
  label?: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => ReactNode;
}

export interface AGTableProps<T> {
  columns: AGTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  rowKey?: keyof T | ((row: T) => string);
  onRowClick?: (row: T, index: number) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  className?: string;
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function AGTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  emptyIcon,
  rowKey = 'id',
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  className = '',
}: AGTableProps<T>) {
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return String(row[rowKey] ?? index);
  };

  const getAlignClass = (align?: 'left' | 'center' | 'right'): string => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  const renderSortIcon = (column: AGTableColumn<T>) => {
    if (!column.sortable) return null;

    const isActive = sortColumn === column.key;

    return (
      <span className="ml-1.5 inline-flex flex-col">
        <svg
          className={`w-2.5 h-2.5 -mb-0.5 ${
            isActive && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-300'
          }`}
          fill="currentColor"
          viewBox="0 0 10 5"
        >
          <path d="M5 0L10 5H0L5 0Z" />
        </svg>
        <svg
          className={`w-2.5 h-2.5 ${
            isActive && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-300'
          }`}
          fill="currentColor"
          viewBox="0 0 10 5"
        >
          <path d="M5 5L0 0H10L5 5Z" />
        </svg>
      </span>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {getColumnHeader(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {getColumnHeader(col)}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="flex flex-col items-center justify-center py-12 bg-white border-t border-gray-200">
          {emptyIcon || (
            <svg
              className="w-12 h-12 text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          )}
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Normal table
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${getAlignClass(
                  col.align
                )} ${col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
                style={{ width: col.width }}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center">
                  {getColumnHeader(col)}
                  {renderSortIcon(col)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr
              key={getRowKey(row, rowIndex)}
              className={`${
                onRowClick
                  ? 'cursor-pointer hover:bg-gray-50 transition-colors'
                  : ''
              }`}
              onClick={() => onRowClick?.(row, rowIndex)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm text-gray-700 ${getAlignClass(col.align)}`}
                >
                  {col.render
                    ? col.render(row[col.key], row, rowIndex)
                    : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pagination component to use with AGTable
export interface AGTablePaginationProps {
  /** Current page (1-indexed, preferred) */
  currentPage?: number;
  /** Current page (1-indexed, alias for currentPage) */
  page?: number;
  totalPages: number;
  /** Total number of items */
  totalItems?: number;
  /** Items per page (preferred) */
  itemsPerPage?: number;
  /** Items per page (alias for itemsPerPage) */
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function AGTablePagination({
  currentPage: currentPageProp,
  page,
  totalPages,
  totalItems: totalItemsProp,
  itemsPerPage: itemsPerPageProp,
  pageSize,
  onPageChange,
}: AGTablePaginationProps) {
  // Support alias props
  const currentPage = currentPageProp ?? page ?? 1;
  const itemsPerPage = itemsPerPageProp ?? pageSize ?? 10;
  const totalItems = totalItemsProp ?? 0;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <div className="text-sm text-gray-500">
        총 {totalItems}개 중 {startItem}-{endItem}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          이전
        </button>
        <span className="px-3 py-1.5 text-sm text-gray-600">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          다음
        </button>
      </div>
    </div>
  );
}

export default AGTable;
