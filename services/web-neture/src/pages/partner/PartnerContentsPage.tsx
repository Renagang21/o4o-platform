/**
 * PartnerContentsPage - 파트너 콘텐츠 관리 페이지
 *
 * Work Order: WO-O4O-PARTNER-CONTENTS-PAGE-V1
 *
 * 구조:
 * - Toolbar: 검색 + 유형 필터 + 상태 필터 + 등록 버튼
 * - Table: 콘텐츠 목록 (Desktop) / Card (Mobile)
 * - Empty State: 콘텐츠 없을 때
 */

import { useState } from 'react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { RowActionMenu } from '@o4o/ui';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit3, Link2, Trash2, FileText } from 'lucide-react';

// ── Types ──

type ContentType = 'Blog' | 'Video' | 'Article' | 'SNS' | 'Landing';
type ContentStatus = 'Draft' | 'Active' | 'Inactive';

interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  createdAt: string;
  status: ContentStatus;
}

// ── Mock Data ──

const mockContents: ContentItem[] = [
  { id: '1', title: '비타민C 홍보 콘텐츠', type: 'Blog', createdAt: '2026-03-01', status: 'Active' },
  { id: '2', title: '혈당측정기 홍보 영상', type: 'Video', createdAt: '2026-02-28', status: 'Active' },
  { id: '3', title: '프로바이오틱스 리뷰', type: 'Article', createdAt: '2026-02-25', status: 'Draft' },
  { id: '4', title: '봄 시즌 건강식품 캠페인', type: 'SNS', createdAt: '2026-02-20', status: 'Active' },
  { id: '5', title: '신제품 런칭 랜딩 페이지', type: 'Landing', createdAt: '2026-02-15', status: 'Inactive' },
];

const contentTypes: ContentType[] = ['Blog', 'Video', 'Article', 'SNS', 'Landing'];
const contentStatuses: ContentStatus[] = ['Draft', 'Active', 'Inactive'];

// ── Style Helpers ──

const statusStyle: Record<ContentStatus, string> = {
  Draft: 'bg-amber-100 text-amber-700',
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-500',
};

const typeStyle: Record<ContentType, string> = {
  Blog: 'bg-blue-50 text-blue-700',
  Video: 'bg-rose-50 text-rose-700',
  Article: 'bg-violet-50 text-violet-700',
  SNS: 'bg-amber-50 text-amber-700',
  Landing: 'bg-cyan-50 text-cyan-700',
};

export function PartnerContentsPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<ContentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('');

  const filtered = mockContents.filter((c) => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && c.type !== typeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  // WO-O4O-NETURE-SETTLEMENT-AND-COMMISSION-LISTS-STANDARDIZATION-BATCH-V4:
  //   raw <table> → 표준 DataTable 컬럼. 표시 내용 동일.
  //   관리 열의 아이콘 3종(수정/링크/삭제)은 다중 행 액션이라 RowActionMenu 로 이관한다.
  const columns: ListColumnDef<ContentItem>[] = [
    {
      key: 'title',
      header: '콘텐츠',
      minWidth: 200,
      render: (_v, c) => <span className="text-sm font-medium text-gray-900">{c.title}</span>,
    },
    {
      key: 'type',
      header: '유형',
      width: '110px',
      render: (_v, c) => (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeStyle[c.type]}`}>{c.type}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '120px',
      render: (_v, c) => <span className="text-sm text-gray-500">{c.createdAt}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '110px',
      render: (_v, c) => (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[c.status]}`}>{c.status}</span>
      ),
    },
    {
      key: '_actions',
      header: '관리',
      width: '72px',
      align: 'center',
      system: true,
      render: (_v, c) => (
        <RowActionMenu
          actions={[
            { key: 'edit', label: '수정', onClick: () => navigate(`/account/partner/contents/${c.id}`) },
            { key: 'links', label: '링크', onClick: () => navigate(`/account/partner/links/${c.id}`) },
            { key: 'delete', label: '삭제', variant: 'danger' as const, onClick: () => { /* TODO: 삭제 API 미구현 (기존 동작 유지) */ } },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contents</h1>
          <p className="text-sm text-gray-500 mt-1">홍보 콘텐츠를 등록하고 관리합니다</p>
        </div>
        <Link
          to="/account/partner/contents/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />
          콘텐츠 등록
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="콘텐츠 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ContentType | '')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">모든 유형</option>
          {contentTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContentStatus | '')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">모든 상태</option>
          {contentStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">등록된 콘텐츠가 없습니다</p>
          <p className="text-sm text-gray-400 mb-6">홍보 콘텐츠를 등록하여 매장 네트워크에 공유하세요.</p>
          <Link
            to="/account/partner/contents/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />
            콘텐츠 등록
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* WO-…-BATCH-V4: raw <table> → 표준 DataTable (데스크톱 표만 전환, 모바일 카드 뷰는 유지).
                행 액션 3종(수정/링크/삭제)은 RowActionMenu 로 이관. */}
            <DataTable<ContentItem>
              columns={columns}
              data={filtered}
              rowKey={(c) => c.id}
              emptyMessage="콘텐츠가 없습니다"
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{c.createdAt}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeStyle[c.type]}`}>
                    {c.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/account/partner/contents/${c.id}`}
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md"
                    >
                      <Edit3 size={15} />
                    </Link>
                    <Link
                      to={`/account/partner/links/${c.id}`}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md"
                    >
                      <Link2 size={15} />
                    </Link>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 rounded-md">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
