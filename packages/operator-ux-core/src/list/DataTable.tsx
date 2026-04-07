/**
 * DataTable — Base List Table Component
 *
 * WO-O4O-LIST-BASE-MODULE-V1
 * WO-O4O-BASETABLE-FRONTEND-SORTING-V1 — BaseTable에 정렬 위임
 *
 * BaseTable thin wrapper. 컬럼 정의(ListColumnDef)를 O4OColumn으로 변환하고,
 * 정렬/렌더링/empty/loading은 BaseTable에 일임한다.
 */

import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import type { DataTableProps } from './types';

function getRowKeyValue<T extends Record<string, any>>(
  row: T,
  rowKey: keyof T | ((row: T) => string),
  index: number,
): string {
  if (typeof rowKey === 'function') return rowKey(row);
  return String(row[rowKey]) || `row-${index}`;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  // Loading skeleton
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-slate-100 border-b border-slate-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 border-b border-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  // ListColumnDef → O4OColumn 매핑 (sortable / sortAccessor 포함)
  const o4oColumns: O4OColumn<T>[] = columns.map((col) => ({
    key: col.key,
    header: col.header,
    width: col.width,
    minWidth: col.minWidth,
    maxWidth: col.maxWidth,
    resizable: col.resizable,
    system: col.system,
    sticky: col.sticky,
    align: col.align,
    sortable: col.sortable,
    sortAccessor: col.sortAccessor,
    render: col.render,
  }));

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      <BaseTable
        columns={o4oColumns}
        data={data}
        rowKey={(row, index) => getRowKeyValue(row, rowKey, index)}
        headerClassName="bg-slate-50 border-b border-slate-200"
        bodyClassName="divide-y divide-slate-100"
        thClassName="px-4 py-3 text-xs font-medium text-slate-500 uppercase"
        tdClassName="px-4 py-3 text-sm text-slate-700"
        onRowClick={onRowClick ? (row) => onRowClick(row) : undefined}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
