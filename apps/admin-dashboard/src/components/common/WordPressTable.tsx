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
  // Optional cell renderer when using data-based API
  render?: (item: any) => ReactNode;
}

export interface WordPressTableRow {
  id: string;
  data: Record<string, ReactNode>;
  actions?: RowAction[];
}

interface WordPressTableProps {
  columns: WordPressTableColumn[];
  // Two usage modes:
  // 1) row-based (existing)
  rows?: WordPressTableRow[];
  // 2) data-based with column.render
  data?: any[];
  selectable?: boolean;
  selectedRows?: string[]; // for row-based API
  onSelectRow?: (rowId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  // data-based selection (array of ids)
  selectedItems?: string[];
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
  // Sorting control (optional external control)
  onSort?: (columnId: string) => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  // Optional empty state node
  emptyState?: ReactNode;
}

/**
 * WordPress-style Table Component with Row Actions
 */
export const WordPressTable: FC<WordPressTableProps> = ({
  columns,
  rows,
  data,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  selectedItems,
  onSelectionChange,
  className,
  loading = false,
  emptyMessage = 'No items found',
  onSort,
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  emptyState,
}) => {
  const { handleMouseEnter, handleMouseLeave, isRowHovered } = useRowActions();
  const isControlledSort = typeof onSort === 'function' && controlledSortColumn !== undefined && controlledSortDirection !== undefined;
  const [uncontrolledSortColumn, setUncontrolledSortColumn] = useState<string | null>(null);
  const [uncontrolledSortDirection, setUncontrolledSortDirection] = useState<'asc' | 'desc'>('asc');
  const sortColumn = isControlledSort ? (controlledSortColumn as string | null) : uncontrolledSortColumn;
  const sortDirection = isControlledSort ? (controlledSortDirection as 'asc'|'desc') : uncontrolledSortDirection;

  const handleSort = (columnId: string) => {
    if (isControlledSort) return onSort?.(columnId);
    if (sortColumn === columnId) {
      setUncontrolledSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setUncontrolledSortColumn(columnId);
      setUncontrolledSortDirection('asc');
    }
  };

  // Normalize into row objects when using data + renderers
  const normalizedRows: WordPressTableRow[] = ((): WordPressTableRow[] => {
    if (rows && rows.length > 0) return rows;
    if (!data) return [];
    return data.map((item: any) => {
      const cells: Record<string, ReactNode> = {};
      columns.forEach((col) => {
        if (col.render) {
          cells[col.id] = col.render(item);
        } else {
          cells[col.id] = (item && item[col.id] !== undefined) ? String(item[col.id]) : null;
        }
      });
      return { id: String(item.id ?? ''), data: cells };
    });
  })();

  const isExternalSelection = Array.isArray(selectedItems) && typeof onSelectionChange === 'function';
  const selectedIds = isExternalSelection ? (selectedItems as string[]) : selectedRows;
  const allSelected = normalizedRows.length > 0 && selectedIds.length === normalizedRows.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < normalizedRows.length;

  return (
    <div className={clsx('o4o-list-table-wrapper overflow-x-auto', className)}>
      <table className="o4o-list-table widefat fixed striped table-view-list" style={{
        border: '1px solid #c3c4c7',
        borderSpacing: 0,
        width: '100%',
        clear: 'both',
        margin: 0
      }}>
        <thead>
          <tr>
            {selectable && (
              <td className="manage-column column-cb check-column">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) => onSelectAll?.(checked as boolean)}
                  aria-label="Select all"
                  className="wp-checkbox"
                />
              </td>
            )}
            {columns.map((column: any) => (
              <th
                key={column.id}
                scope="col"
                className={clsx(
                  'manage-column',
                  `column-${column.id}`,
                  column.sortable && 'sortable',
                  sortColumn === column.id && 'sorted',
                  sortColumn === column.id && sortDirection,
                  'text-left font-semibold text-gray-900 dark:text-gray-100'
                )}
                style={{
                  borderBottom: '1px solid #c3c4c7',
                  padding: '8px 10px',
                  width: column.width
                }}
              >
                {column.sortable ? (
                  <button
                    className="column-sort-button inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
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
          ) : normalizedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8 text-gray-500">
                {emptyState ?? emptyMessage}
              </td>
            </tr>
          ) : (
            normalizedRows.map((row: any) => (
              <tr
                key={row.id}
                className={clsx(
                  'hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors',
                  selectedIds.includes(row.id) && 'selected bg-blue-100 dark:bg-blue-900/30'
                )}
                onMouseEnter={() => handleMouseEnter(row.id)}
                onMouseLeave={handleMouseLeave}
              >
                {selectable && (
                  <th scope="row" className="check-column">
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onCheckedChange={(checked) => {
                        if (isExternalSelection) {
                          const next = new Set(selectedIds);
                          if (checked) next.add(row.id); else next.delete(row.id);
                          onSelectionChange?.(Array.from(next));
                        } else {
                          onSelectRow?.(row.id, checked as boolean);
                        }
                      }}
                      aria-label={`Select ${row.id}`}
                      className="wp-checkbox"
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
                        isFirstColumn && 'column-primary font-medium',
                        column.align && `text-${column.align}`,
                        'text-gray-800 dark:text-gray-200'
                      )}
                      style={{
                        borderTop: '1px solid #e1e1e1',
                        padding: '8px 10px'
                      }}
                    >
                      <div className="cell-content">
                        {row.data[column.id]}
                      </div>
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

export default WordPressTable;
