import { FC } from 'react';
import { Table, TableProps } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

interface DataTableProps<T> extends Omit<TableProps<T>, 'dataSource' | 'columns'> {
  dataSource: T[];
  columns: ColumnsType<T>;
  pagination?: TablePaginationConfig | false;
  /** Enable row selection */
  rowSelection?: TableProps<T>['rowSelection'];
  /** Custom empty state message */
  emptyText?: string;
  /** Show loading skeleton */
  loading?: boolean;
}

/**
 * DataTable
 *
 * Reusable table component with pagination, filtering, and sorting support.
 * Built on top of Ant Design Table with common configurations pre-applied.
 *
 * Features:
 * - Pagination with customizable page size
 * - Sorting and filtering
 * - Row selection
 * - Loading states
 * - Responsive design
 *
 * Usage:
 * ```tsx
 * <DataTable
 *   dataSource={data}
 *   columns={columns}
 *   pagination={{ pageSize: 20 }}
 *   loading={loading}
 * />
 * ```
 */
export const DataTable: FC<DataTableProps<any>> = <T extends object>({
  dataSource,
  columns,
  pagination = {
    pageSize: 20,
    showSizeChanger: true,
    showTotal: (total: number) => `전체 ${total}개`,
    pageSizeOptions: ['10', '20', '50', '100']
  },
  rowSelection,
  emptyText = '데이터가 없습니다',
  loading = false,
  ...restProps
}: DataTableProps<T>) => {
  return (
    <Table<T>
      dataSource={dataSource}
      columns={columns}
      pagination={pagination}
      rowSelection={rowSelection}
      loading={loading}
      locale={{
        emptyText
      }}
      scroll={{ x: 'max-content' }}
      {...restProps}
    />
  );
};

export default DataTable;
