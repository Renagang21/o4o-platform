import { FC, ReactNode, useState, Fragment } from 'react';
import { clsx } from 'clsx';
import { Checkbox } from '@/components/ui/checkbox';
import { RowActions, RowAction, useRowActions } from './RowActions';

export interface AdminTableColumn {
  id: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface AdminTableRow {
  id: string;
  data: Record<string, ReactNode>;
  actions?: RowAction[];
}

interface InlineEditProps {
  rowId: string;
  renderEdit: () => ReactNode;
}

interface AdminTableWithInlineEditProps {
  columns: AdminTableColumn[];
  rows: AdminTableRow[];
  selectable?: boolean;
  selectedRows?: string[];
  onSelectRow?: (rowId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
  inlineEditRows?: InlineEditProps[];
  editingRowId?: string | null;
}

/**
 * WordPress-style Table Component with Inline Edit Support
 */
export const AdminTableWithInlineEdit: FC<AdminTableWithInlineEditProps> = ({
  columns,
  rows,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  className,
  loading = false,
  emptyMessage = 'No items found',
  inlineEditRows = [],
  editingRowId = null
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

  const getInlineEditRow = (rowId: string) => {
    return inlineEditRows.find(e => e.rowId === rowId);
  };

  return (
    <div className={clsx('o4o-list-table-wrapper overflow-x-auto', className)}>
      <table className="o4o-list-table widefat fixed striped table-view-list">
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
            {columns.map((column: any) => (
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
            rows.map((row: any, index: number) => {
              const isEditing = editingRowId === row.id;
              const inlineEdit = getInlineEditRow(row.id);
              
              return (
                <Fragment key={row.id}>
                  <tr
                    className={clsx(
                      selectedRows.includes(row.id) && 'selected',
                      index % 2 === 0 ? 'alternate' : '',
                      isEditing && 'hidden'
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
                    {columns.map((column, colIndex) => {
                      const isFirstColumn = colIndex === 0;
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
                              visible={isRowHovered(row.id) && !isEditing}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {isEditing && inlineEdit && inlineEdit.renderEdit()}
                </Fragment>
              );
            })
          )}
        </tbody>
        <tfoot>
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
            {columns.map((column: any) => (
              <th
                key={column.id}
                scope="col"
                className={clsx('manage-column', `column-${column.id}`)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};