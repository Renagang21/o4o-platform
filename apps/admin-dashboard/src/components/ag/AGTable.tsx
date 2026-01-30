/**
 * AGTable - Advanced Table Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - Column-based definition
 * - Sorting (sort)
 * - Filtering (filter)
 * - Pagination
 * - Loading skeleton
 * - Empty state
 */

import React, { useState, useMemo, ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface AGTableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Column header label (preferred) */
  label?: string;
  /** Column header label (alias for label) */
  header?: string;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Column width (e.g., '200px', '20%') */
  width?: string;
  /** Custom render function */
  render?: (row: T, index: number) => ReactNode;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Hide on mobile */
  hideOnMobile?: boolean;
}

export interface AGTableProps<T> {
  /** Table data */
  data: T[];
  /** Column definitions */
  columns: AGTableColumn<T>[];
  /** Unique key field in data */
  rowKey?: keyof T | ((row: T) => string);
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: ReactNode;
  /** Current sort key */
  sortKey?: string;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Sort change handler */
  onSortChange?: (key: string, direction: SortDirection) => void;
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Selected row keys */
  selectedKeys?: string[];
  /** Selection change handler */
  onSelectionChange?: (keys: string[]) => void;
  /** Enable row selection */
  selectable?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Hover effect */
  hoverable?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

/** Sort icon component */
function SortIcon({ direction }: { direction: SortDirection }) {
  if (!direction) {
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  return (
    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

/** Loading skeleton row */
function SkeletonRow({ columns, compact }: { columns: number; compact?: boolean }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className={compact ? 'px-4 py-2' : 'px-6 py-4'}>
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

/** Empty state component */
function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <tr>
      <td colSpan={999} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-3">
          {icon || (
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          )}
          <p className="text-gray-500 text-sm">{message}</p>
        </div>
      </td>
    </tr>
  );
}

export function AGTable<T extends object>({
  data,
  columns,
  rowKey = 'id' as keyof T,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  emptyIcon,
  sortKey,
  sortDirection,
  onSortChange,
  onRowClick,
  selectedKeys = [],
  onSelectionChange,
  selectable = false,
  striped = false,
  hoverable = true,
  compact = false,
  className = '',
}: AGTableProps<T>) {
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDir, setInternalSortDir] = useState<SortDirection>(null);

  const currentSortKey = sortKey ?? internalSortKey;
  const currentSortDir = sortDirection ?? internalSortDir;

  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return String(row[rowKey] ?? index);
  };

  const handleSort = (key: string) => {
    const column = columns.find((c) => c.key === key);
    if (!column?.sortable) return;

    let newDirection: SortDirection;
    if (currentSortKey === key) {
      newDirection = currentSortDir === 'asc' ? 'desc' : currentSortDir === 'desc' ? null : 'asc';
    } else {
      newDirection = 'asc';
    }

    if (onSortChange) {
      onSortChange(key, newDirection);
    } else {
      setInternalSortKey(newDirection ? key : null);
      setInternalSortDir(newDirection);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    const allKeys = data.map((row, i) => getRowKey(row, i));
    const allSelected = allKeys.every((key) => selectedKeys.includes(key));

    onSelectionChange(allSelected ? [] : allKeys);
  };

  const handleSelectRow = (key: string) => {
    if (!onSelectionChange) return;

    const newSelection = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key];

    onSelectionChange(newSelection);
  };

  const sortedData = useMemo(() => {
    if (!currentSortKey || !currentSortDir || onSortChange) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = a[currentSortKey];
      const bVal = b[currentSortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return currentSortDir === 'asc' ? comparison : -comparison;
    });
  }, [data, currentSortKey, currentSortDir, onSortChange]);

  const allSelected = data.length > 0 && data.every((row, i) => selectedKeys.includes(getRowKey(row, i)));
  const someSelected = data.some((row, i) => selectedKeys.includes(getRowKey(row, i)));

  return (
    <div className={`overflow-x-auto bg-white rounded-lg border border-gray-200 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Selection checkbox */}
            {selectable && (
              <th className={`${compact ? 'px-4 py-2' : 'px-6 py-3'} w-12`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
            )}

            {/* Column headers */}
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={`
                  ${compact ? 'px-4 py-2' : 'px-6 py-3'}
                  text-${column.align || 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider
                  ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}
                  ${column.hideOnMobile ? 'hidden md:table-cell' : ''}
                `}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className={`flex items-center gap-1 ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : ''}`}>
                  <span>{column.label || column.header || ''}</span>
                  {column.sortable && (
                    <SortIcon direction={currentSortKey === column.key ? currentSortDir : null} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {/* Loading state */}
          {loading && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={columns.length + (selectable ? 1 : 0)} compact={compact} />
              ))}
            </>
          )}

          {/* Empty state */}
          {!loading && sortedData.length === 0 && (
            <EmptyState message={emptyMessage} icon={emptyIcon} />
          )}

          {/* Data rows */}
          {!loading &&
            sortedData.map((row, index) => {
              const key = getRowKey(row, index);
              const isSelected = selectedKeys.includes(key);

              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row, index)}
                  className={`
                    ${striped && index % 2 === 1 ? 'bg-gray-50' : ''}
                    ${hoverable ? 'hover:bg-gray-50' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${isSelected ? 'bg-blue-50' : ''}
                    transition-colors
                  `}
                >
                  {/* Selection checkbox */}
                  {selectable && (
                    <td className={compact ? 'px-4 py-2' : 'px-6 py-4'} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(key)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}

                  {/* Data cells */}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`
                        ${compact ? 'px-4 py-2' : 'px-6 py-4'}
                        text-sm text-gray-900
                        text-${column.align || 'left'}
                        ${column.hideOnMobile ? 'hidden md:table-cell' : ''}
                      `}
                    >
                      {column.render
                        ? column.render(row, index)
                        : String(row[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * AGTablePagination - Table Pagination Component
 */
export interface AGTablePaginationProps {
  /** Current page (1-indexed, preferred) */
  page?: number;
  /** Current page (1-indexed, alias for page) */
  currentPage?: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems?: number;
  /** Items per page */
  pageSize?: number;
  /** Items per page (alias for pageSize) */
  itemsPerPage?: number;
  /** Page change handler */
  onPageChange: (page: number) => void;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Page size change handler */
  onPageSizeChange?: (size: number) => void;
  /** Show page size selector */
  showPageSize?: boolean;
  /** Show item count */
  showItemCount?: boolean;
}

export function AGTablePagination({
  page: pageProp,
  currentPage,
  totalPages,
  totalItems,
  pageSize: pageSizeProp,
  itemsPerPage,
  onPageChange,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  showPageSize = true,
  showItemCount = true,
}: AGTablePaginationProps) {
  // Support both page/currentPage and pageSize/itemsPerPage
  const page = pageProp ?? currentPage ?? 1;
  const pageSize = pageSizeProp ?? itemsPerPage ?? 10;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems || 0);

  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (page > 3) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) {
      pages.push('ellipsis');
    }

    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-200">
      {/* Item count & Page size */}
      <div className="flex items-center gap-4 text-sm text-gray-700">
        {showItemCount && totalItems !== undefined && (
          <span>
            {startItem}-{endItem} / {totalItems}개
          </span>
        )}

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>표시:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}개
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page numbers */}
        {getVisiblePages().map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`
                min-w-[32px] px-3 py-1 text-sm rounded
                ${page === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {p}
            </button>
          )
        )}

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default AGTable;
