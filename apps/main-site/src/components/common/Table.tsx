import React from 'react';
import { twMerge } from 'tailwind-merge';

export type TableVariant = 'default' | 'bordered' | 'striped';
export type TableSize = 'sm' | 'md' | 'lg';

interface Column<T> {
  key: string;
  title: string;
  dataIndex: keyof T;
  render?: (value: T[keyof T], record: T) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  variant?: TableVariant;
  size?: TableSize;
  className?: string;
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (record: T) => void;
  rowKey?: keyof T;
}

const Table = <T extends Record<string, unknown>>({
  columns,
  data,
  variant = 'default',
  size = 'md',
  className,
  loading = false,
  emptyText = '데이터가 없습니다',
  onRowClick,
  rowKey,
}: TableProps<T>) => {
  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const variantStyles = {
    default: 'divide-y divide-gray-200',
    bordered: 'border border-gray-200',
    striped: 'divide-y divide-gray-200',
  };

  const cellSizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={twMerge('min-w-full divide-y divide-gray-200', className)}>
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={twMerge(
                  'text-left font-medium text-gray-500 uppercase tracking-wider',
                  sizeStyles[size],
                  cellSizeStyles[size],
                  column.align && `text-${column.align}`,
                  column.width && `w-${column.width}`
                )}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={twMerge('bg-white divide-y divide-gray-200', variantStyles[variant])}>
          {data.map((record, index) => (
            <tr
              key={rowKey ? String(record[rowKey]) : index}
              className={twMerge(
                onRowClick && 'cursor-pointer hover:bg-gray-50',
                variant === 'striped' && index % 2 === 1 && 'bg-gray-50'
              )}
              onClick={onRowClick ? () => onRowClick(record) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={twMerge(
                    'whitespace-nowrap',
                    sizeStyles[size],
                    cellSizeStyles[size],
                    column.align && `text-${column.align}`
                  )}
                >
                  {column.render
                    ? column.render(record[column.dataIndex], record)
                    : record[column.dataIndex]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table; 