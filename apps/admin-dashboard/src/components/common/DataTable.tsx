import { useState, ReactNode, ReactElement } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface DataTableColumn<T> {
  id: string;
  label: string;
  accessor: keyof T | ((item: T) => ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableAction<T> {
  id: string;
  label: string;
  icon?: ReactElement;
  onClick: (item: T) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: (item: T) => boolean;
  hidden?: (item: T) => boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  actions?: DataTableAction<T>[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  className?: string;
}

/**
 * WordPress-style data table component
 * 사용자, 상품, 주문 등 목록 데이터를 표시하는 재사용 가능한 테이블
 */
const DataTable = <T extends object>({
  data,
  columns,
  actions = [],
  loading = false,
  error = null,
  emptyMessage = "데이터가 없습니다.",
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort,
  pagination,
  className
}: DataTableProps<T>) => {
  const [selectAll, setSelectAll] = useState(false);

  // Selection logic
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (onSelectionChange) {
      onSelectionChange(checked ? data : []);
    }
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    if (!onSelectionChange) return;
    
    const newSelection = checked
      ? [...selectedItems, item]
      : selectedItems.filter(selected => selected !== item);
    
    onSelectionChange(newSelection);
    setSelectAll(newSelection.length === data.length);
  };

  const isItemSelected = (item: T) => {
    return selectedItems.some(selected => selected === item);
  };

  // Sorting logic
  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;
    
    const newDirection = sortColumn === column.id && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.id, newDirection);
  };

  // Render cell content
  const renderCell = (item: T, column: DataTableColumn<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    return String(item[column.accessor] ?? '');
  };

  // Render actions
  const renderActions = (item: T) => {
    const visibleActions = actions.filter(action => !action.hidden?.(item));
    
    if (visibleActions.length === 0) return null;

    return (
      <div className="flex items-center gap-2">
        {visibleActions.map((action) => (
          <button
            key={action.id}
            onClick={() => action.onClick(item)}
            disabled={action.disabled?.(item)}
            className={clsx(
              'inline-flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              {
                'bg-admin-blue text-white border-admin-blue hover:bg-admin-blue-dark': action.variant === 'primary',
                'bg-admin-red text-white border-admin-red hover:bg-red-700': action.variant === 'danger',
                'bg-white text-wp-text-secondary border-wp-border-primary hover:bg-wp-bg-tertiary': action.variant === 'secondary' || !action.variant
              }
            )}
            title={action.label}
          >
            {action.icon}
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="wp-notice-error">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('wp-card', className)}>
      <div className="wp-card-body p-0">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="wp-table">
            <thead>
              <tr>
                {/* Selection header */}
                {selectable && (
                  <th className="w-12">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e: any) => handleSelectAll(e.target.checked)}
                      className="rounded border-wp-border-primary text-admin-blue focus:ring-admin-blue"
                    />
                  </th>
                )}

                {/* Column headers */}
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={clsx(
                      column.className,
                      column.sortable && 'cursor-pointer hover:bg-wp-bg-tertiary',
                      {
                        'text-left': column.align === 'left' || !column.align,
                        'text-center': column.align === 'center',
                        'text-right': column.align === 'right'
                      }
                    )}
                    style={{ width: column.width }}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <div className="flex flex-col">
                          <div className={clsx(
                            'w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent',
                            sortColumn === column.id && sortDirection === 'asc'
                              ? 'border-b-admin-blue'
                              : 'border-b-wp-text-tertiary'
                          )} />
                          <div className={clsx(
                            'w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent',
                            sortColumn === column.id && sortDirection === 'desc'
                              ? 'border-t-admin-blue'
                              : 'border-t-wp-text-tertiary'
                          )} />
                        </div>
                      )}
                    </div>
                  </th>
                ))}

                {/* Actions header */}
                {actions.length > 0 && (
                  <th className="w-32">작업</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}>
                    <div className="flex items-center justify-center py-8">
                      <div className="loading-spinner" />
                      <span className="ml-2 text-wp-text-secondary">로딩 중...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}>
                    <div className="flex items-center justify-center py-8 text-wp-text-secondary">
                      {emptyMessage}
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={index}>
                    {/* Selection cell */}
                    {selectable && (
                      <td>
                        <input
                          type="checkbox"
                          checked={isItemSelected(item)}
                          onChange={(e: any) => handleSelectItem(item, e.target.checked)}
                          className="rounded border-wp-border-primary text-admin-blue focus:ring-admin-blue"
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={clsx(
                          column.className,
                          {
                            'text-left': column.align === 'left' || !column.align,
                            'text-center': column.align === 'center',
                            'text-right': column.align === 'right'
                          }
                        )}
                      >
                        {renderCell(item, column)}
                      </td>
                    ))}

                    {/* Actions cell */}
                    {actions.length > 0 && (
                      <td>
                        {renderActions(item)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && data.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-wp-border-secondary">
            <div className="flex items-center gap-2 text-sm text-wp-text-secondary">
              <span>페이지 당</span>
              <select
                value={pagination.pageSize}
                onChange={(e: any) => pagination.onPageSizeChange(Number(e.target.value))}
                className="wp-select py-1 px-2 text-sm"
              >
                <option value={10}>10개</option>
                <option value={25}>25개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
              <span>
                총 {pagination.total}개 중 {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)} - {Math.min(pagination.page * pagination.pageSize, pagination.total)}개
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => pagination.onPageChange(1)}
                disabled={pagination.page === 1}
                className="p-2 text-wp-text-secondary hover:text-wp-text-primary disabled:opacity-50"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 text-wp-text-secondary hover:text-wp-text-primary disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="px-3 py-1 text-sm bg-wp-bg-tertiary rounded">
                {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                className="p-2 text-wp-text-secondary hover:text-wp-text-primary disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => pagination.onPageChange(Math.ceil(pagination.total / pagination.pageSize))}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                className="p-2 text-wp-text-secondary hover:text-wp-text-primary disabled:opacity-50"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTable;