/**
 * DataTable — O4O Platform Standard Data Table
 *
 * WO-O4O-DATATABLE-BASE-ALIGN-V1 — BaseTable 기반 재구성
 * WO-O4O-TABLE-COLUMN-TYPE-UNIFICATION-V1 — O4OColumn 통합
 *
 * BaseTable 렌더링 엔진 위의 thin wrapper.
 * 정렬, 페이지네이션, 행 선택, 확장 행 기능 제공.
 * 외부 API (DataTableProps, Column) 100% 유지.
 */

import React, { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { BaseTable } from '../components/table/BaseTable';
import type { O4OColumn } from '../components/table/types';

export interface Column<T> {
  key: string;
  title: string;
  dataIndex?: keyof T | string[];
  render?: (value: any, record: T, index: number) => ReactNode;
  sortable?: boolean;
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
  /** Shorthand for onRow click handler */
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
  className = ''
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>([]);

  // ─── Helpers ───

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(record);
    return String(record[rowKey]) || `row-${index}`;
  };

  const getValue = (record: T, dataIndex: keyof T | string[] | undefined): any => {
    if (!dataIndex) return record;
    if (Array.isArray(dataIndex)) {
      return dataIndex.reduce((obj, key) => obj?.[key], record as any);
    }
    return record[dataIndex];
  };

  const isExpanded = (record: T, index: number) => {
    const key = getRowKey(record, index);
    if (expandable?.expandedRowKeys) {
      return expandable.expandedRowKeys.includes(key);
    }
    return internalExpandedKeys.includes(key);
  };

  // ─── Selection ───

  const handleSelectAll = (checked: boolean) => {
    if (!rowSelection) return;
    rowSelection.onChange(
      checked ? dataSource.map((r, i) => getRowKey(r, i)) : [],
    );
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    if (!rowSelection) return;
    const selected = new Set(rowSelection.selectedRowKeys);
    if (checked) selected.add(key); else selected.delete(key);
    rowSelection.onChange(Array.from(selected));
  };

  // ─── Sorting ───

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortKey(null);
        setSortOrder(null);
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (columnKey: string, sortable?: boolean) => {
    if (!sortable) return null;
    if (sortKey === columnKey) {
      return sortOrder === 'asc'
        ? <ChevronUp className="w-4 h-4" />
        : <ChevronDown className="w-4 h-4" />;
    }
    return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
  };

  const sortedData = [...dataSource];
  if (sortKey && sortOrder) {
    const column = columns.find(col => col.key === sortKey);
    if (column) {
      sortedData.sort((a, b) => {
        const aValue = getValue(a, column.dataIndex);
        const bValue = getValue(b, column.dataIndex);
        if (aValue === bValue) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        const comparison = aValue < bValue ? -1 : 1;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
  }

  // ─── Column Mapping: Column<T> → O4OColumn<T> ───

  const o4oColumns: O4OColumn<T>[] = [];

  // Selection column (prepend)
  if (rowSelection) {
    o4oColumns.push({
      key: '__selection',
      header: (
        <input
          type="checkbox"
          checked={dataSource.length > 0 && rowSelection.selectedRowKeys.length === dataSource.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300"
        />
      ),
      headerClassName: 'w-4',
      className: 'w-4',
      render: (_value, row, index) => {
        const key = getRowKey(row, index);
        return (
          <input
            type="checkbox"
            checked={rowSelection.selectedRowKeys.includes(key)}
            onChange={(e) => handleSelectRow(key, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300"
          />
        );
      },
    });
  }

  // Data columns
  for (const col of columns) {
    o4oColumns.push({
      key: col.key,
      header: (
        <div className="flex items-center gap-1">
          <span>{col.title}</span>
          {renderSortIcon(col.key, col.sortable)}
        </div>
      ),
      width: col.width,
      align: col.align,
      accessor: col.dataIndex ? (row) => getValue(row, col.dataIndex) : undefined,
      render: col.render,
      onHeaderClick: col.sortable ? () => handleSort(col.key) : undefined,
      headerClassName: col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : undefined,
    });
  }

  // ─── Row handlers ───

  const hasAnyRowClick = !!(onRow || onRowClick);

  // ─── Loading skeleton ───

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-2"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className={`w-full ${className}`}>
      <BaseTable
        columns={o4oColumns}
        data={sortedData}
        rowKey={(row, index) => getRowKey(row, index)}
        headerClassName="bg-gray-50"
        bodyClassName="bg-white divide-y divide-gray-200"
        thClassName="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
        tdClassName="px-6 py-4 text-sm text-gray-900"
        rowClassName={(row) => {
          const rowProps = onRow?.(row) || {};
          const hasClick = !!(rowProps.onClick || onRowClick);
          return `hover:bg-gray-50 ${hasClick ? 'cursor-pointer' : ''} ${rowProps.className || ''}`;
        }}
        onRowClick={hasAnyRowClick ? (row) => {
          const rowProps = onRow?.(row) || {};
          const handler = rowProps.onClick || (onRowClick ? () => onRowClick(row) : undefined);
          handler?.();
        } : undefined}
        renderAfterRow={expandable ? (row, index) => {
          const expanded = isExpanded(row, index);
          if (!expanded) return null;
          return (
            <tr className="bg-gray-50">
              <td colSpan={o4oColumns.length} className="px-6 py-4">
                {expandable.expandedRowRender(row)}
              </td>
            </tr>
          );
        } : undefined}
        emptyMessage={emptyText}
      />

      {/* Pagination */}
      {pagination && pagination.total > 0 && (() => {
        const currentPage = pagination.current ?? 1;
        const totalPages = Math.ceil(pagination.total / pagination.pageSize);
        return (
          <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
            <div className="text-sm text-gray-700">
              전체 <span className="font-medium">{pagination.total}</span>개 중{' '}
              <span className="font-medium">
                {(currentPage - 1) * pagination.pageSize + 1}
              </span>
              ~
              <span className="font-medium">
                {Math.min(currentPage * pagination.pageSize, pagination.total)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => pagination.onChange?.(currentPage - 1, pagination.pageSize)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => pagination.onChange?.(currentPage + 1, pagination.pageSize)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default DataTable;
