/**
 * P1 Phase C: Table Widget Component
 *
 * Displays tabular data with optional actions.
 */

import { FC } from 'react';
import type { TableWidgetData } from '@o4o/types';

export interface TableWidgetProps<T = any> {
  /** Table data */
  data: TableWidgetData<T>;
}

/**
 * Table Widget Component
 */
export const TableWidget: FC<TableWidgetProps> = ({ data }) => {
  if (data.rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{data.emptyMessage || '데이터가 없습니다'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {data.columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                }`}
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
            {data.rowActions && data.rowActions.length > 0 && (
              <th scope="col" className="px-4 py-2 text-right">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {data.columns.map((col) => {
                const value = row[col.key];
                const formatted = col.format ? col.format(value) : String(value);

                return (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-gray-900 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    }`}
                  >
                    {formatted}
                  </td>
                );
              })}
              {data.rowActions && data.rowActions.length > 0 && (
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end space-x-2">
                    {data.rowActions.map((action, actionIndex) => (
                      <button
                        key={actionIndex}
                        onClick={() => action.onClick(row)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {data.total && data.total > data.rows.length && (
        <div className="mt-3 text-center text-xs text-gray-500">
          {data.rows.length} / {data.total} 표시 중
        </div>
      )}
    </div>
  );
};
