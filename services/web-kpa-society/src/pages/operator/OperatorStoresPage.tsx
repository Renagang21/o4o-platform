/**
 * OperatorStoresPage — 매장 관리 목록
 *
 * WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1
 * WO-O4O-TABLE-STANDARD-V1 — Raw HTML → DataTable + Selection
 *
 * /api/v1/operator/stores API 기반 매장 목록 조회.
 * Bearer token auth (KPA — getAccessToken 사용).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ─── Types ───

interface StoreData {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  businessNumber: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  slug: string | null;
  channelCount: number;
  productCount: number;
  createdAt: string;
}

interface StatsData {
  totalStores: number;
  activeStores: number;
  withChannel: number;
  withProducts: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── API Helper ───

async function apiFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Constants ───

const typeLabel: Record<string, string> = {
  pharmacy: '약국',
  store: '매장',
  branch: '지점',
};

// ─── Component ───

export default function OperatorStoresPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [stats, setStats] = useState<StatsData>({ totalStores: 0, activeStores: 0, withChannel: 0, withProducts: 0 });
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchStores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
      if (searchTerm) params.set('search', searchTerm);

      const data = await apiFetch<{
        success: boolean;
        stores: StoreData[];
        stats: StatsData;
        pagination: PaginationData;
      }>(`/api/v1/operator/stores?${params}`);

      if (data.success) {
        setStores(data.stores);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to fetch stores:', err);
      setError(err?.message || '매장 데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Reset selection on search/page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, currentPage]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return '-';
    }
  };

  // ─── Column Definitions ───

  const columns: ListColumnDef<StoreData>[] = [
    {
      key: 'name',
      header: '매장명',
      sortable: true,
      render: (_v, row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{row.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{typeLabel[row.type] || row.type}</p>
        </div>
      ),
    },
    {
      key: 'code',
      header: '코드',
      width: '100px',
      render: (v) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
          {v || '-'}
        </span>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      width: '120px',
      render: (v) => v ? (
        <span className="font-mono text-xs text-blue-600">{v}</span>
      ) : (
        <span className="text-slate-300">-</span>
      ),
    },
    {
      key: 'ownerName',
      header: '운영자',
      render: (_v, row) => row.ownerName ? (
        <div>
          <p className="text-sm text-slate-700">{row.ownerName}</p>
          <p className="text-xs text-slate-400">{row.ownerEmail}</p>
        </div>
      ) : (
        <span className="text-sm text-slate-300">-</span>
      ),
    },
    {
      key: 'channelCount',
      header: '채널',
      align: 'center',
      width: '60px',
      sortable: true,
      render: (v) => (
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
          v > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
        }`}>
          {v}
        </span>
      ),
    },
    {
      key: 'productCount',
      header: '상품',
      align: 'center',
      width: '60px',
      sortable: true,
      render: (v) => (
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
          v > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
        }`}>
          {v}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: '상태',
      align: 'center',
      width: '80px',
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {v ? '활성' : '비활성'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '생성일',
      width: '110px',
      sortable: true,
      sortAccessor: (row) => new Date(row.createdAt).getTime(),
      render: (v) => <span className="text-sm text-slate-500">{formatDate(v)}</span>,
    },
    {
      key: '_nav',
      header: '',
      width: '40px',
      system: true,
      render: () => <ChevronRight className="w-4 h-4 text-slate-300" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">매장 관리</h1>
          <p className="text-slate-500 text-sm mt-1">O4O 플랫폼 매장 목록</p>
        </div>
        <button
          onClick={fetchStores}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          새로고침
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-800">{stats.totalStores}</p>
          <p className="text-xs text-slate-500">전체 매장</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-green-600">{stats.activeStores}</p>
          <p className="text-xs text-slate-500">활성 매장</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-blue-600">{stats.withChannel}</p>
          <p className="text-xs text-slate-500">채널 보유</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-purple-600">{stats.withProducts}</p>
          <p className="text-xs text-slate-500">상품 보유</p>
        </div>
      </div>

      {/* Search + Table */}
      <div>
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="매장명, 코드, 운영자 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              검색
            </button>
          </div>
        </div>

        {/* DataTable */}
        <DataTable<StoreData>
          columns={columns}
          data={stores}
          rowKey="id"
          loading={isLoading}
          emptyMessage="매장 데이터가 없습니다"
          onRowClick={(row) => navigate(`/operator/stores/${row.id}`)}
          tableId="kpa-stores"
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
        />

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 mt-2">
            <p className="text-sm text-slate-500">
              총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, pagination.totalPages - 4));
                return start + i;
              }).filter(p => p <= pagination.totalPages).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pg ? 'bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
