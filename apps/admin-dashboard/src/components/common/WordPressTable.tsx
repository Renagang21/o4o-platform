import { FC, ReactNode, useState } from 'react';
import { clsx } from 'clsx';
import { Checkbox } from '@/components/ui/checkbox';
import { RowActions, RowAction, useRowActions } from './RowActions';

export interface WordPressTableColumn {
  id: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface WordPressTableRow {
  id: string;
  data: Record<string, ReactNode>;
  actions?: RowAction[];
}

interface WordPressTableProps {
  columns: WordPressTableColumn[];
  rows: WordPressTableRow[];
  selectable?: boolean;
  selectedRows?: string[];
  onSelectRow?: (rowId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * WordPress-style Table Component with Row Actions
 */
export const WordPressTable: FC<WordPressTableProps> = ({
  columns,
  rows,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  className,
  loading = false,
  emptyMessage = 'No items found'
}) => {
  const { handleMouseEnter, handleMouseLeave, isRowHovered } = useRowActions();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < rows.length;

  return (
    <div className={clsx('wp-list-table-wrapper overflow-x-auto', className)}>
      <table className="wp-list-table widefat fixed striped table-view-list">
        <thead>
          <tr>
            {selectable && (
              <td className="manage-column column-cb check-column">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) => onSelectAll?.(checked as boolean)}
                  aria-label="Select all"
                />
              </td>
            )}
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={clsx(
                  'manage-column',
                  `column-${column.id}`,
                  column.sortable && 'sortable',
                  sortColumn === column.id && 'sorted',
                  sortColumn === column.id && sortDirection
                )}
                style={{ width: column.width }}
              >
                {column.sortable ? (
                  <button
                    className="column-sort-button"
                    onClick={() => handleSort(column.id)}
                  >
                    <span>{column.label}</span>
                    <span className="sorting-indicator" />
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8">
                <div className="spinner is-active"></div>
                <p className="mt-4 text-gray-500">Loading...</p>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8 text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className={clsx(
                  selectedRows.includes(row.id) && 'selected'
                )}
                onMouseEnter={() => handleMouseEnter(row.id)}
                onMouseLeave={handleMouseLeave}
              >
                {selectable && (
                  <th scope="row" className="check-column">
                    <Checkbox
                      checked={selectedRows.includes(row.id)}
                      onCheckedChange={(checked) => onSelectRow?.(row.id, checked as boolean)}
                      aria-label={`Select ${row.id}`}
                    />
                  </th>
                )}
                {columns.map((column, index) => {
                  const isFirstColumn = index === 0;
                  return (
                    <td
                      key={column.id}
                      className={clsx(
                        `column-${column.id}`,
                        isFirstColumn && 'column-primary',
                        column.align && `text-${column.align}`
                      )}
                    >
                      {row.data[column.id]}
                      {isFirstColumn && row.actions && (
                        <RowActions
                          actions={row.actions}
                          visible={isRowHovered(row.id)}
                        />
                      )}
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