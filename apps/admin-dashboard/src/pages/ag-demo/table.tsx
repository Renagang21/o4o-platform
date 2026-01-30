/**
 * AGTable Demo Page
 *
 * Phase 7-C: Global Components Demo
 */

import React, { useState } from 'react';
import { AGTable, AGTableColumn, AGTablePagination } from '../../components/ag/AGTable';
import { AGSearchBar } from '../../components/ag/AGSearchBar';
import { AGToolbar } from '../../components/ag/AGToolbar';
import { usePagination, useSearch, useSort } from '../../hooks/ag';

interface DemoItem extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  role: string;
  createdAt: string;
}

const demoData: DemoItem[] = Array.from({ length: 50 }, (_, i) => ({
  id: `user-${i + 1}`,
  name: `사용자 ${i + 1}`,
  email: `user${i + 1}@example.com`,
  status: ['active', 'inactive', 'pending'][i % 3] as DemoItem['status'],
  role: ['관리자', '편집자', '뷰어'][i % 3],
  createdAt: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
}));

const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

const statusLabels = {
  active: '활성',
  inactive: '비활성',
  pending: '대기중',
};

export default function TableDemo() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const { searchTerm, setSearchTerm, filterData, isSearching } = useSearch<DemoItem>({
    searchFields: ['name', 'email', 'role'],
  });

  const { sortKey, sortDirection, toggleSort, sortData } = useSort<DemoItem>();

  const filteredData = filterData(demoData);
  const sortedData = sortData(filteredData);

  const pagination = usePagination({
    totalItems: sortedData.length,
  });

  const paginatedData = sortedData.slice(pagination.startIndex, pagination.endIndex);

  const columns: AGTableColumn<DemoItem>[] = [
    {
      key: 'name',
      label: '이름',
      sortable: true,
    },
    {
      key: 'email',
      label: '이메일',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'status',
      label: '상태',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.status]}`}>
          {statusLabels[row.status]}
        </span>
      ),
    },
    {
      key: 'role',
      label: '역할',
      hideOnMobile: true,
    },
    {
      key: 'createdAt',
      label: '가입일',
      sortable: true,
      hideOnMobile: true,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AGTable 데모</h1>
        <p className="text-gray-500 mt-1">고급 테이블 컴포넌트 데모 페이지</p>
      </div>

      {/* Toolbar */}
      <AGToolbar
        actions={[
          {
            key: 'add',
            label: '추가',
            variant: 'primary',
            onClick: () => alert('추가 클릭'),
            icon: (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            ),
          },
          {
            key: 'delete',
            label: '삭제',
            variant: 'danger',
            onClick: () => alert(`${selectedKeys.length}개 삭제`),
            selectionOnly: true,
          },
        ]}
        search={
          <AGSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="이름, 이메일, 역할 검색..."
            loading={isSearching}
          />
        }
        selectedCount={selectedKeys.length}
        onClearSelection={() => setSelectedKeys([])}
      />

      {/* Table */}
      <AGTable
        data={paginatedData}
        columns={columns}
        rowKey="id"
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        sortKey={sortKey as string}
        sortDirection={sortDirection}
        onSortChange={(key, dir) => toggleSort(key as keyof DemoItem)}
        striped
        emptyMessage="검색 결과가 없습니다"
      />

      {/* Pagination */}
      <AGTablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={sortedData.length}
        pageSize={pagination.pageSize}
        onPageChange={pagination.goToPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  );
}
