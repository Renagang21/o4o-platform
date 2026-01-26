import { FC, ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: any) => ReactNode;
}

interface SelectableTableProps {
  columns: Column[];
  data: any[];
  idField?: string;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onToggleAll: () => void;
  onToggleItem: (itemId: string) => void;
  isSelected: (itemId: string) => boolean;
  onRowClick?: (item: any) => void;
  rowActions?: (item: any) => ReactNode;
  emptyMessage?: string;
}

/**
 * WordPress-style table with bulk selection
 */
export const SelectableTable: FC<SelectableTableProps> = ({
  columns,
  data,
  idField = 'id',
  isAllSelected,
  isSomeSelected,
  onToggleAll,
  onToggleItem,
  isSelected,
  onRowClick,
  rowActions,
  emptyMessage = 'No items found'
}) => {
  return (
    <table className="o4o-list-table widefat fixed striped">
      <thead>
        <tr>
          <td className="manage-column column-cb check-column">
            <label className="screen-reader-text" htmlFor="cb-select-all">
              Select All
            </label>
            <Checkbox
              id="cb-select-all"
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onCheckedChange={onToggleAll}
            />
          </td>
          {columns.map((column: any) => (
            <th
              key={column.key}
              scope="col"
              className={`manage-column column-${column.key}${column.sortable ? ' sortable' : ''}`}
            >
              {column.sortable ? (
                <a href="#">
                  <span>{column.label}</span>
                  <span className="sorting-indicator"></span>
                </a>
              ) : (
                column.label
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length + 1} className="colspanchange">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((item, index) => {
            const itemId = String(item[idField]);
            const selected = isSelected(itemId);
            
            return (
              <tr
                key={itemId}
                className={`${selected ? 'selected' : ''} ${index % 2 === 0 ? 'alternate' : ''}`}
              >
                <th scope="row" className="check-column">
                  <label className="screen-reader-text" htmlFor={`cb-select-${itemId}`}>
                    Select {item.title || item.name || `Item ${itemId}`}
                  </label>
                  <Checkbox
                    id={`cb-select-${itemId}`}
                    checked={selected}
                    onCheckedChange={() => onToggleItem(itemId)}
                    onClick={(e: any) => e.stopPropagation()}
                  />
                </th>
                {columns.map((column: any) => (
                  <td
                    key={column.key}
                    className={`column-${column.key}`}
                    onClick={() => onRowClick?.(item)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {column.render ? column.render(item) : item[column.key]}
                    {column.key === columns[0].key && rowActions && (
                      <div className="row-actions">
                        {rowActions(item)}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            );
          })
        )}
      </tbody>
      <tfoot>
        <tr>
          <td className="manage-column column-cb check-column">
            <label className="screen-reader-text" htmlFor="cb-select-all-2">
              Select All
            </label>
            <Checkbox
              id="cb-select-all-2"
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onCheckedChange={onToggleAll}
            />
          </td>
          {columns.map((column: any) => (
            <th key={column.key} scope="col" className={`manage-column column-${column.key}`}>
              {column.label}
            </th>
          ))}
        </tr>
      </tfoot>
    </table>
  );
};