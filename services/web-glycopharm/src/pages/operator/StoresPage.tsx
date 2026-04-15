/**
 * Operator Stores Page — Store Console
 * WO-O4O-STORE-CONSOLE-V1
 *
 * /api/v1/operator/stores API (Extension Layer)
 * Bearer token auth (GlycoPharm)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  RefreshCw,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { api } from '../../lib/apiClient';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

// ─── Types ───────────────────────────────────────────────────

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

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const response = await api.get(url);
  return response.data;
}

// ─── Component ───────────────────────────────────────────────

export default function StoresPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [stats, setStats] = useState<StatsData>({ totalStores: 0, activeStores: 0, withChannel: 0, withProducts: 0 });
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  const typeLabel: Record<string, string> = {
    pharmacy: '약국',
    store: '매장',
    branch: '지점',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="매장 관리"
        description="O4O 플랫폼 매장 카탈로그"
        icon={<Store className="w-6 h-6 text-primary-600" />}
        actions={
          <button
            onClick={fetchStores}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        }
      />

      {/* Error */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-2xl font-bold text-slate-800">{stats.totalStores}</p>
          <p className="text-xs text-slate-500">전체 매장</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-2xl font-bold text-green-600">{stats.activeStores}</p>
          <p className="text-xs text-slate-500">활성 매장</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-2xl font-bold text-blue-600">{stats.withChannel}</p>
          <p className="text-xs text-slate-500">채널 보유</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-2xl font-bold text-purple-600">{stats.withProducts}</p>
          <p className="text-xs text-slate-500">상품 보유</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="매장명, 코드, 운영자 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              검색
            </button>
          </div>
        </div>

        {/* Table */}
        {(() => {
          const columns: Column<StoreData>[] = [
            {
              key: 'name',
              title: '매장명',
              render: (_v, s) => (
                <div>
                  <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{typeLabel[s.type] || s.type}</p>
                </div>
              ),
            },
            {
              key: 'code',
              title: '코드',
              width: '100px',
              render: (_v, s) => (
                <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">{s.code || '-'}</span>
              ),
            },
            {
              key: 'slug',
              title: 'Slug',
              width: '130px',
              render: (_v, s) => s.slug
                ? <span className="font-mono text-xs text-primary-600">{s.slug}</span>
                : <span className="text-slate-300">-</span>,
            },
            {
              key: 'ownerName',
              title: '운영자',
              render: (_v, s) => s.ownerName
                ? <div><p className="text-sm text-slate-700">{s.ownerName}</p><p className="text-xs text-slate-400">{s.ownerEmail}</p></div>
                : <span className="text-sm text-slate-300">-</span>,
            },
            {
              key: 'channelCount',
              title: '채널',
              width: '60px',
              align: 'right',
              render: (_v, s) => (
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${s.channelCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                  {s.channelCount}
                </span>
              ),
            },
            {
              key: 'productCount',
              title: '상품',
              width: '60px',
              align: 'right',
              render: (_v, s) => (
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${s.productCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                  {s.productCount}
                </span>
              ),
            },
            {
              key: 'isActive',
              title: '상태',
              width: '70px',
              render: (_v, s) => <StatusBadge status={s.isActive ? 'active' : 'inactive'} />,
            },
            {
              key: 'createdAt',
              title: '생성일',
              width: '100px',
              render: (_v, s) => <span className="text-sm text-slate-500">{formatDate(s.createdAt)}</span>,
            },
          ];

          return (
            <DataTable<StoreData>
              columns={columns}
              dataSource={stores}
              rowKey="id"
              loading={isLoading}
              emptyText="매장 데이터가 없습니다"
              onRowClick={(s) => navigate(`/operator/stores/${s.id}`)}
              pagination={{
                current: currentPage,
                pageSize: pagination.limit,
                total: pagination.total,
                onChange: (p) => setCurrentPage(p),
              }}
            />
          );
        })()}
      </div>
    </div>
  );
}
