/**
 * PartnerStoresPage - 파트너 매장 관리 페이지
 *
 * Work Order: WO-O4O-PARTNER-STORES-PAGE-V1
 *
 * 구조:
 * - Toolbar: 검색 + 지역 필터 + 상태 필터
 * - Table: 매장 목록 (Desktop) / Card (Mobile)
 * - Empty State: 매장 없을 때
 */

import { useState } from 'react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { RowActionMenu } from '@o4o/ui';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Eye, Link2, UserMinus, Store } from 'lucide-react';

// ── Types ──

type StoreStatus = 'Active' | 'Inactive';

interface StoreItem {
  id: string;
  name: string;
  region: string;
  contact: string;
  contentTitle: string;
  connectedAt: string;
  status: StoreStatus;
}

// ── Mock Data ──

const mockStores: StoreItem[] = [
  { id: '1', name: '서울약국', region: '서울', contact: '010-1234-5678', contentTitle: '비타민C 홍보', connectedAt: '2026-02-20', status: 'Active' },
  { id: '2', name: '강남약국', region: '서울', contact: '010-8888-1234', contentTitle: '혈당측정기 영상', connectedAt: '2026-02-18', status: 'Active' },
  { id: '3', name: '부산약국', region: '부산', contact: '010-5555-6789', contentTitle: '프로바이오틱스 리뷰', connectedAt: '2026-02-15', status: 'Active' },
  { id: '4', name: '대전약국', region: '대전', contact: '010-3333-4567', contentTitle: '봄 시즌 캠페인', connectedAt: '2026-02-10', status: 'Inactive' },
  { id: '5', name: '인천약국', region: '인천', contact: '010-7777-8901', contentTitle: '신제품 런칭', connectedAt: '2026-01-28', status: 'Active' },
];

const regionOptions = [...new Set(mockStores.map((s) => s.region))];
const storeStatuses: StoreStatus[] = ['Active', 'Inactive'];

// ── Style Helpers ──

const statusStyle: Record<StoreStatus, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-500',
};

export function PartnerStoresPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StoreStatus | ''>('');

  const filtered = mockStores.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.contentTitle.toLowerCase().includes(search.toLowerCase())) return false;
    if (regionFilter && s.region !== regionFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  // WO-O4O-DATATABLE-EXPANDABLE-ROW-AND-NETURE-LISTS-STANDARDIZATION-V1:
  //   raw <table> → 표준 DataTable 컬럼. 표시 내용 동일.
  //   아이콘 3종(보기/링크/해제)은 다중 행 액션이라 RowActionMenu 로 이관.
  const columns: ListColumnDef<StoreItem>[] = [
    { key: 'name', header: '매장명', minWidth: 150, render: (_v, s) => <span className="text-sm font-medium text-gray-900">{s.name}</span> },
    { key: 'region', header: '지역', width: '110px', render: (_v, s) => <span className="text-sm text-gray-600">{s.region}</span> },
    { key: 'contact', header: '연락처', width: '140px', render: (_v, s) => <span className="text-sm text-gray-500 font-mono">{s.contact}</span> },
    { key: 'contentTitle', header: '연결 콘텐츠', minWidth: 150, render: (_v, s) => <span className="text-sm text-gray-900">{s.contentTitle}</span> },
    { key: 'connectedAt', header: '연결일', width: '120px', render: (_v, s) => <span className="text-sm text-gray-500">{s.connectedAt}</span> },
    {
      key: 'status',
      header: '상태',
      width: '100px',
      render: (_v, s) => <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[s.status]}`}>{s.status}</span>,
    },
    {
      key: '_actions',
      header: '관리',
      width: '72px',
      align: 'center',
      system: true,
      render: (_v, s) => (
        <RowActionMenu
          actions={[
            { key: 'view', label: '보기', onClick: () => { /* TODO: 상세 보기 미구현 (기존 동작 유지) */ } },
            { key: 'links', label: '링크', onClick: () => navigate(`/account/partner/links?store=${s.id}`) },
            { key: 'remove', label: '해제', variant: 'danger' as const, onClick: () => { /* TODO: 해제 API 미구현 (기존 동작 유지) */ } },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
        <p className="text-sm text-gray-500 mt-1">협력 매장 네트워크를 확인하고 관리합니다</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="매장 또는 콘텐츠 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">모든 지역</option>
          {regionOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StoreStatus | '')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">모든 상태</option>
          {storeStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Store size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">연결된 매장이 없습니다</p>
          <p className="text-sm text-gray-400">홍보 링크를 통해 매장과 연결하면 이곳에 표시됩니다.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* WO-…-V1: raw <table> → 표준 DataTable (데스크톱 표만, 모바일 카드 뷰 유지).
                행 액션 3종(보기/링크/해제)은 RowActionMenu 로 이관. */}
            <DataTable<StoreItem>
              columns={columns}
              data={filtered}
              rowKey={(s) => s.id}
              emptyMessage="연결된 매장이 없습니다"
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.region} &middot; {s.contact}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  <span className="text-gray-400">연결 콘텐츠:</span> {s.contentTitle}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{s.connectedAt}</span>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md"
                      title="View"
                    >
                      <Eye size={15} />
                    </button>
                    <Link
                      to={`/account/partner/links?store=${s.id}`}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md"
                      title="Links"
                    >
                      <Link2 size={15} />
                    </Link>
                    <button
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-md"
                      title="Remove"
                    >
                      <UserMinus size={15} />
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
