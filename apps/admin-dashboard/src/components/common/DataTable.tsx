/**
 * DataTable — BaseTable Wrapper (WO-O4O-TABLE-STANDARD-ALIGNMENT-V1)
 *
 * 기존 apps DataTable API를 유지하면서 내부적으로 @o4o/ui BaseTable을 사용.
 * 28개 기존 페이지는 코드 변경 없이 BaseTable 기반으로 동작.
 *
 * 새 페이지는 BaseTable + O4OColumn + RowActionMenu + FilterBar를 직접 사용 권장.
 *
 * Migration:
 * - `title: string` → `header: ReactNode`
 * - `dataIndex` → `accessor`
 * - `sorter` → `useTableSort` 내부 처리
 * - 페이지별 정렬 상태 노출 없음 (내부 관리)
 */

import React, { FC, ReactNode, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

// ─── Column API (기존 유지) ──────────────────────────

export interface Column<T> {
  key: string;
  title: string;
  dataIndex?: keyof T | string[];
  render?: (value: any, record: T, index: number) => ReactNode;
  sortable?: boolean;
  /** 커스텀 comparator — DataTable 내부 정렬에 사용 */
  sorter?: (a: T, b: T) => number;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  dataSource: T[];
  rowKey: keyof T | ((record: T) => string);
  loading?: boolean;
  pagination?: {
    current?: number;
    pageSize: number;
    total: number;
    onChange?: (page: number, pageSize: number) => void;
  };
  onRow?: (record: T) => {
    onClick?: () => void;
    className?: string;
  };
  onRowClick?: (record: T) => void | Promise<void>;
  rowSelection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[]) => void;
  };
  expandable?: {
    expandedRowRender: (record: T) => ReactNode;
    rowExpandable?: (record: T) => boolean;
    expandedRowKeys?: string[];
    onExpand?: (expanded: boolean, record: T) => void;
  };
  emptyText?: string;
  className?: string;
}

// ─── Helpers ────────────────────────────────────────

function getRowKeyFn<T>(rowKey: keyof T | ((record: T) => string)) {
  return (row: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String((row as any)[rowKey as string]) || `row-${index}`;
  };
}

function getValue<T>(record: T, dataIndex: keyof T | string[] | undefined): any {
  if (!dataIndex) return undefined;
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((obj: any, key) => obj?.[key], record as any);
  }
  return (record as any)[dataIndex as string];
}

type SortOrder = 'asc' | 'desc' | null;

function SortIcon({ columnKey, sortKey, sortOrder }: { columnKey: string; sortKey: string | null; sortOrder: SortOrder }) {
  if (sortKey !== columnKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />;
  if (sortOrder === 'asc') return <ChevronUp className="w-3.5 h-3.5" />;
  return <ChevronDown className="w-3.5 h-3.5" />;
}

// ─── DataTable ───────────────────────────────────────

export function DataTable<T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey,
  loading = false,
  pagination,
  onRow,
  onRowClick,
  rowSelection,
  expandable,
  emptyText = '데이터가 없습니다',
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(pagination?.current ?? 1);

  const getKey = getRowKeyFn(rowKey);

  // Sync currentPage if controlled
  const activePage = pagination?.current ?? currentPage;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') { setSortKey(null); setSortOrder(null); }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey || !sortOrder) return dataSource;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return dataSource;
    const sorted = [...dataSource];
    sorted.sort((a, b) => {
      if (col.sorter) {
        const r = col.sorter(a, b);
        return sortOrder === 'desc' ? -r : r;
      }
      const aVal = getValue(a, col.dataIndex);
      const bVal = getValue(b, col.dataIndex);
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [dataSource, sortKey, sortOrder, columns]);

  // Paginate
  const pageSize = pagination?.pageSize ?? 0;
  const pagedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (activePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pagination, activePage, pageSize]);

  // Build O4OColumns
  const o4oColumns: O4OColumn<T>[] = useMemo(() => {
    const cols: O4OColumn<T>[] = [];

    if (rowSelection) {
      const allKeys = dataSource.map((r, i) => getKey(r, i));
      const allSelected = allKeys.length > 0 && allKeys.every((k) => rowSelection.selectedRowKeys.includes(k));
      const someSelected = allKeys.some((k) => rowSelection.selectedRowKeys.includes(k));
      cols.push({
        key: '_select',
        system: true,
        sticky: true,
        width: 40,
        header: (
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={(e) => {
              if (e.target.checked) rowSelection.onChange(allKeys);
              else rowSelection.onChange([]);
            }}
            className="rounded border-gray-300"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        render: (_, row, idx) => (
          <input
            type="checkbox"
            checked={rowSelection.selectedRowKeys.includes(getKey(row, idx))}
            onChange={(e) => {
              const k = getKey(row, idx);
              const s = new Set(rowSelection.selectedRowKeys);
              if (e.target.checked) s.add(k); else s.delete(k);
              rowSelection.onChange(Array.from(s));
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300"
          />
        ),
      });
    }

    for (const col of columns) {
      const isSortable = !!col.sortable;
      cols.push({
        key: col.key,
        width: col.width,
        align: col.align,
        header: isSortable ? (
          <div
            className="flex items-center gap-1 cursor-pointer select-none"
            onClick={() => handleSort(col.key)}
          >
            <span>{col.title}</span>
            <SortIcon columnKey={col.key} sortKey={sortKey} sortOrder={sortOrder} />
          </div>
        ) : col.title,
        accessor: col.dataIndex
          ? (row) => getValue(row, col.dataIndex)
          : undefined,
        render: col.render
          ? (value, row, idx) => col.render!(value, row, idx)
          : undefined,
      });
    }

    if (expandable) {
      cols.push({
        key: '_expand',
        system: true,
        width: 40,
        header: '',
        render: (_, row, idx) => {
          const k = getKey(row, idx);
          const expanded = expandable.expandedRowKeys
            ? expandable.expandedRowKeys.includes(k)
            : internalExpandedKeys.includes(k);
          const canExpand = expandable.rowExpandable ? expandable.rowExpandable(row) : true;
          if (!canExpand) return null;
          return (
            <button
              className="p-1 text-gray-400 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                const next = !expanded;
                setInternalExpandedKeys((prev) =>
                  next ? [...prev, k] : prev.filter((x) => x !== k),
                );
                expandable.onExpand?.(next, row);
              }}
            >
              {expanded ? '▲' : '▼'}
            </button>
          );
        },
      });
    }

    return cols;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, rowSelection, dataSource, sortKey, sortOrder, internalExpandedKeys, expandable]);

  // Row click handler
  const handleRowClick = (row: T, _idx: number) => {
    const rowProps = onRow?.(row);
    if (rowProps?.onClick) rowProps.onClick();
    else if (onRowClick) onRowClick(row);
  };

  // Expand after-row
  const renderAfterRow = expandable
    ? (row: T, idx: number) => {
        const k = getKey(row, idx);
        const expanded = expandable.expandedRowKeys
          ? expandable.expandedRowKeys.includes(k)
          : internalExpandedKeys.includes(k);
        if (!expanded) return null;
        return (
          <tr className="bg-gray-50">
            <td colSpan={o4oColumns.length} className="px-6 py-4">
              {expandable.expandedRowRender(row)}
            </td>
          </tr>
        );
      }
    : undefined;

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-2" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded mb-1" />
          ))}
        </div>
      </div>
    );
  }

  const totalPages = pagination ? Math.ceil((pagination.total || 0) / pageSize) : 0;

  return (
    <div className={`w-full ${className}`}>
      <BaseTable<T>
        columns={o4oColumns}
        data={pagedData}
        rowKey={getKey}
        emptyMessage={emptyText}
        onRowClick={(onRow || onRowClick) ? handleRowClick : undefined}
        rowClassName={(row) => onRow?.(row)?.className ?? ''}
        renderAfterRow={renderAfterRow}
        columnVisibility
      />

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <div className="text-sm text-gray-700">
            전체 <span className="font-medium">{pagination.total}</span>개 중{' '}
            <span className="font-medium">
              {(activePage - 1) * pageSize + 1}
            </span>–
            <span className="font-medium">
              {Math.min(activePage * pageSize, pagination.total)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const p = activePage - 1;
                setCurrentPage(p);
                pagination.onChange?.(p, pageSize);
              }}
              disabled={activePage <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="px-3 py-1 text-sm">
              {activePage} / {totalPages}
            </span>
            <button
              onClick={() => {
                const p = activePage + 1;
                setCurrentPage(p);
                pagination.onChange?.(p, pageSize);
              }}
              disabled={activePage >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
