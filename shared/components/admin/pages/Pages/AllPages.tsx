import React, { useState } from 'react';
import { DataTable } from '../../data-table';
import { BulkActions } from '../../data-table';
import { SearchFilter } from '../../forms';
import { StatusBadge } from '../../ui';
import { ActionMenu } from '../../ui';
import { Plus, Edit, Trash2, Eye, Copy } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'private' | 'trash';
  author: string;
  date: string;
  lastModified: string;
}

const mockPages: Page[] = [
  {
    id: '1',
    title: '회사 소개',
    slug: 'about',
    status: 'published',
    author: '관리자',
    date: '2024-06-20',
    lastModified: '2024-06-25'
  },
  {
    id: '2',
    title: '서비스 안내',
    slug: 'services',
    status: 'published',
    author: '에디터',
    date: '2024-06-18',
    lastModified: '2024-06-24'
  },
  {
    id: '3',
    title: '연락처',
    slug: 'contact',
    status: 'draft',
    author: '관리자',
    date: '2024-06-15',
    lastModified: '2024-06-22'
  },
  {
    id: '4',
    title: '개인정보처리방침',
    slug: 'privacy-policy',
    status: 'private',
    author: '관리자',
    date: '2024-06-10',
    lastModified: '2024-06-20'
  },
  {
    id: '5',
    title: '이전 페이지',
    slug: 'old-page',
    status: 'trash',
    author: '에디터',
    date: '2024-06-05',
    lastModified: '2024-06-18'
  }
];

export function AllPages() {
  const [selectedRows, setSelectedRows] = useState<Page[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statusTabs = [
    { key: 'all', label: '전체', count: mockPages.length },
    { key: 'published', label: '발행됨', count: mockPages.filter(p => p.status === 'published').length },
    { key: 'draft', label: '초안', count: mockPages.filter(p => p.status === 'draft').length },
    { key: 'private', label: '비공개', count: mockPages.filter(p => p.status === 'private').length },
    { key: 'trash', label: '휴지통', count: mockPages.filter(p => p.status === 'trash').length }
  ];

  const filteredPages = mockPages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePageAction = (action: string, pageId: string) => {
    console.log(`${action} page:`, pageId);
    // 실제 액션 처리 로직
  };

  const bulkActions = [
    {
      id: 'edit',
      label: '편집',
      icon: <Edit className="h-4 w-4" />,
      onClick: () => console.log('Bulk edit:', selectedRows)
    },
    {
      id: 'publish',
      label: '발행',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => console.log('Bulk publish:', selectedRows)
    },
    {
      id: 'trash',
      label: '휴지통으로 이동',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => console.log('Bulk trash:', selectedRows),
      variant: 'danger' as const
    }
  ];

  const columns: ColumnDef<Page>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          className="rounded"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          className="rounded"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: '제목',
      cell: ({ row }) => {
        const page = row.original;
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <a 
                href={`/admin/pages/edit/${page.id}`}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                {page.title}
              </a>
              <StatusBadge 
                status={page.status} 
                variant={
                  page.status === 'published' ? 'success' :
                  page.status === 'draft' ? 'warning' :
                  page.status === 'private' ? 'info' : 'danger'
                } 
                size="sm"
              />
            </div>
            <div className="text-sm text-gray-500">
              /{page.slug}
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <button 
                onClick={() => handlePageAction('edit', page.id)}
                className="text-blue-600 hover:text-blue-800"
              >
                편집
              </button>
              <span className="text-gray-300">|</span>
              <button 
                onClick={() => handlePageAction('view', page.id)}
                className="text-blue-600 hover:text-blue-800"
              >
                보기
              </button>
              {page.status !== 'trash' && (
                <>
                  <span className="text-gray-300">|</span>
                  <button 
                    onClick={() => handlePageAction('trash', page.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    휴지통
                  </button>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'author',
      header: '작성자',
      cell: ({ row }) => (
        <span className="text-sm text-gray-900">{row.original.author}</span>
      ),
    },
    {
      accessorKey: 'date',
      header: '날짜',
      cell: ({ row }) => {
        const page = row.original;
        return (
          <div className="text-sm">
            <div className="text-gray-900">
              발행: {new Date(page.date).toLocaleDateString('ko-KR')}
            </div>
            <div className="text-gray-500">
              수정: {new Date(page.lastModified).toLocaleDateString('ko-KR')}
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const page = row.original;
        const menuItems = [
          {
            id: 'edit',
            label: '편집',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handlePageAction('edit', page.id)
          },
          {
            id: 'duplicate',
            label: '복제',
            icon: <Copy className="h-4 w-4" />,
            onClick: () => handlePageAction('duplicate', page.id)
          },
          {
            id: 'view',
            label: '보기',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handlePageAction('view', page.id)
          },
          {
            id: 'trash',
            label: '휴지통으로 이동',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handlePageAction('trash', page.id),
            variant: 'danger' as const
          }
        ];

        return <ActionMenu items={menuItems} />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">페이지</h2>
          <p className="text-gray-600 mt-1">웹사이트의 정적 페이지를 관리하세요.</p>
        </div>
        <a
          href="/admin/pages/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          새 페이지 추가
        </a>
      </div>

      {/* Status Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                statusFilter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <SearchFilter
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="페이지 검색..."
          className="w-80"
        />
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedRows.length}
        actions={bulkActions}
        onClearSelection={() => setSelectedRows([])}
      />

      {/* Pages Table */}
      <DataTable
        data={filteredPages}
        columns={columns}
        pagination={true}
        sorting={true}
        filtering={false}
        onRowSelect={setSelectedRows}
      />

      {/* Empty State */}
      {filteredPages.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            📄
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">페이지가 없습니다</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? '검색 조건에 맞는 페이지가 없습니다.' : '첫 번째 페이지를 만들어보세요.'}
          </p>
          {!searchTerm && (
            <a
              href="/admin/pages/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 페이지 추가
            </a>
          )}
        </div>
      )}
    </div>
  );
}