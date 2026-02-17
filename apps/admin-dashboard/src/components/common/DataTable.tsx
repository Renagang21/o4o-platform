import React, { FC, ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

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

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String(record[rowKey]) || `row-${index}`;
  };

  const handleSelectAll = (checked: boolean) => {
    if (rowSelection) {
      if (checked) {
        const allKeys = dataSource.map((record, index) => getRowKey(record, index));
        rowSelection.onChange(allKeys);
      } else {
        rowSelection.onChange([]);
      }
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    if (rowSelection) {
      const selected = new Set(rowSelection.selectedRowKeys);
      if (checked) {
        selected.add(key);
      } else {
        selected.delete(key);
      }
      rowSelection.onChange(Array.from(selected));
    }
  };

  const isExpanded = (record: T, index: number) => {
    const key = getRowKey(record, index);
    if (expandable?.expandedRowKeys) {
      return expandable.expandedRowKeys.includes(key);
    }
    return internalExpandedKeys.includes(key);
  };

  const getValue = (record: T, dataIndex: keyof T | string[] | undefined): any => {
    if (!dataIndex) return record;

    if (Array.isArray(dataIndex)) {
      return dataIndex.reduce((obj, key) => obj?.[key], record as any);
    }

    return record[dataIndex];
  };

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

  const renderSortIcon = (columnKey: string, sortable?: boolean) => {
    if (!sortable) return null;

    if (sortKey === columnKey) {
      return sortOrder === 'asc' ? (
        <ChevronUp className="w-4 h-4" />
      ) : (
        <ChevronDown className="w-4 h-4" />
      );
    }

    return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
  };

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

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

  return (
    <div className={`w-full ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {rowSelection && (
                <th className="px-6 py-3 w-4">
                  <input
                    type="checkbox"
                    checked={dataSource.length > 0 && rowSelection.selectedRowKeys.length === dataSource.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${getAlignClass(column.align)} ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                    }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.title}</span>
                    {renderSortIcon(column.key, column.sortable)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              sortedData.map((record, index) => {
                const rowProps = onRow?.(record) || {};
                const key = getRowKey(record, index);
                const expanded = isExpanded(record, index);
                // Support both onRow and onRowClick
                const handleClick = rowProps.onClick || (onRowClick ? () => onRowClick(record) : undefined);

                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={handleClick}
                      className={`hover:bg-gray-50 ${handleClick ? 'cursor-pointer' : ''} ${rowProps.className || ''
                        }`}
                    >
                      {rowSelection && (
                        <td className="px-6 py-4 whitespace-nowrap w-4">
                          <input
                            type="checkbox"
                            checked={rowSelection.selectedRowKeys.includes(key)}
                            onChange={(e) => handleSelectRow(key, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      {columns.map(column => {
                        const value = getValue(record, column.dataIndex);
                        const content = column.render
                          ? column.render(value, record, index)
                          : value;

                        return (
                          <td
                            key={column.key}
                            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${getAlignClass(
                              column.align
                            )}`}
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                    {expanded && expandable && (
                      <tr className="bg-gray-50">
                        <td colSpan={columns.length + (rowSelection ? 1 : 0)} className="px-6 py-4">
                          {expandable.expandedRowRender(record)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
          <div className="text-sm text-gray-700">
            전체 <span className="font-medium">{pagination.total}</span>개 중{' '}
            <span className="font-medium">
              {(pagination.current - 1) * pagination.pageSize + 1}
            </span>
            ~
            <span className="font-medium">
              {Math.min(pagination.current * pagination.pageSize, pagination.total)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
              disabled={pagination.current === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="px-3 py-1 text-sm">
              {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
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
