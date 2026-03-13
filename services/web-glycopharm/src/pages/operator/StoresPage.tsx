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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

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
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Store className="w-6 h-6 text-primary-600" />
            매장 관리
          </h1>
          <p className="text-slate-500 text-sm mt-1">O4O 플랫폼 매장 카탈로그</p>
        </div>
        <button
          onClick={fetchStores}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

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

        {/* Loading */}
        {isLoading && stores.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
              <p className="text-slate-500 text-sm">매장 데이터 로딩 중...</p>
            </div>
          </div>
        )}

        {(!isLoading || stores.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">매장명</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">코드</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Slug</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">운영자</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">채널</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">상품</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">상태</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">생성일</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
                      매장 데이터가 없습니다
                    </td>
                  </tr>
                ) : (
                  stores.map((store) => (
                    <tr
                      key={store.id}
                      onClick={() => navigate(`/admin/stores/${store.id}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 text-sm">{store.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{typeLabel[store.type] || store.type}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                          {store.code || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {store.slug ? (
                          <span className="font-mono text-xs text-primary-600">{store.slug}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {store.ownerName ? (
                          <div>
                            <p className="text-sm text-slate-700">{store.ownerName}</p>
                            <p className="text-xs text-slate-400">{store.ownerEmail}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                          store.channelCount > 0
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {store.channelCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                          store.productCount > 0
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {store.productCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          store.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {store.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(store.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
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
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, pagination.totalPages - 4));
                return start + i;
              }).filter(p => p <= pagination.totalPages).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
