/**
 * AG Components Demo Index Page
 *
 * Phase 7-C: Global Components Demo
 */

import React from 'react';
import { Link } from 'react-router-dom';

const demoPages = [
  {
    title: 'AGTable',
    description: '고급 테이블 컴포넌트 - 정렬, 필터, 페이지네이션, 선택 기능',
    path: '/ag-demo/table',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'AGForm',
    description: '폼 컴포넌트 - React Hook Form 통합, 다양한 입력 타입',
    path: '/ag-demo/form',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'AGTabs',
    description: '탭 네비게이션 - 다양한 스타일, 배지, 아이콘 지원',
    path: '/ag-demo/tabs',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    title: 'AGCard',
    description: '카드 컴포넌트 - 기본 카드, 통계 카드, 다양한 레이아웃',
    path: '/ag-demo/cards',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: 'AGModal',
    description: '모달 컴포넌트 - 확인 모달, 폼 모달, 다양한 크기',
    path: '/ag-demo/modal',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function AGDemoIndex() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AG Components</h1>
        <p className="text-gray-500 mt-2">
          Phase 7-C Global Components - O4O 플랫폼 공통 UI 컴포넌트 라이브러리
        </p>
      </div>

      {/* Features */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-900 mb-2">주요 특징</h2>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- TailwindCSS 기반의 일관된 스타일링</li>
          <li>- React Hook Form + Zod 통합 폼 처리</li>
          <li>- 반응형 디자인 (모바일 지원)</li>
          <li>- 접근성(a11y) 고려</li>
          <li>- TypeScript 완전 지원</li>
        </ul>
      </div>

      {/* Demo Pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {demoPages.map((page) => (
          <Link
            key={page.path}
            to={page.path}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                {page.icon}
              </div>
              <h3 className="font-semibold text-gray-900">{page.title}</h3>
            </div>
            <p className="text-sm text-gray-500">{page.description}</p>
          </Link>
        ))}
      </div>

      {/* Hooks Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">공통 Hooks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">useDebounce</h3>
            <p className="text-sm text-gray-500 mt-1">값의 디바운스 처리</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">usePagination</h3>
            <p className="text-sm text-gray-500 mt-1">페이지네이션 상태 관리</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">useSearch</h3>
            <p className="text-sm text-gray-500 mt-1">검색 및 필터링</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">useSort</h3>
            <p className="text-sm text-gray-500 mt-1">정렬 상태 관리</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">useFetchTableData</h3>
            <p className="text-sm text-gray-500 mt-1">API 테이블 데이터 통합</p>
          </div>
        </div>
      </div>

      {/* Usage Example */}
      <div className="bg-gray-900 rounded-lg p-6 overflow-auto">
        <h2 className="text-lg font-semibold text-white mb-4">사용 예시</h2>
        <pre className="text-sm text-gray-300">
{`import { AGTable, AGTableColumn } from '@/components/ag';
import { usePagination, useSearch, useSort } from '@/hooks/ag';

function MyPage() {
  const { searchTerm, setSearchTerm, filterData } = useSearch();
  const { sortKey, sortDirection, toggleSort, sortData } = useSort();
  const pagination = usePagination({ totalItems: data.length });

  const columns: AGTableColumn[] = [
    { key: 'name', label: '이름', sortable: true },
    { key: 'status', label: '상태', render: (row) => <StatusBadge {...row} /> },
  ];

  return (
    <AGTable
      data={paginatedData}
      columns={columns}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={toggleSort}
    />
  );
}`}
        </pre>
      </div>
    </div>
  );
}
