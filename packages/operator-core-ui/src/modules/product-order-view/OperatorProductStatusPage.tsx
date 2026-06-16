/**
 * @o4o/operator-core-ui — OperatorProductStatusPage
 *
 * WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1
 *
 * Operator 서비스 전역 "상품 현황" view-only 콘솔 (Product Master 카탈로그 조회).
 * GlycoPharm / K-Cosmetics 공통. serviceKey 별 fetch + accent/copy 는 wrapper 가 주입.
 *
 * ⚠️ view-only: 생성/수정/삭제 액션 없음. 행 클릭 시 상세로 이동만.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  RefreshCw,
  AlertCircle,
  Image as ImageIcon,
  Truck,
  Copy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type {
  OperatorProductStatusPageProps,
  ProductStatusRow,
  ProductStatusStats,
  ProductStatusPagination,
} from './types';

const EMPTY_STATS: ProductStatusStats = { totalProducts: 0, withImage: 0, withSupplier: 0, duplicateBarcodes: 0 };
const EMPTY_PAGINATION: ProductStatusPagination = { page: 1, limit: 20, total: 0, totalPages: 1 };
const LIMIT = 20;

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '-';
  }
}

export function OperatorProductStatusPage({ fetchProducts, config }: OperatorProductStatusPageProps) {
  const {
    title = '상품 현황',
    description = 'Product Master 기반 플랫폼 상품 카탈로그',
    emptyMessage = '상품 데이터가 없습니다',
    searchPlaceholder = '상품명, 바코드, 브랜드, 제조사 검색...',
    errorFallback = '상품 데이터를 불러올 수 없습니다',
    tableId,
    detailPathBase = '/operator/products',
    accent,
  } = config;

  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductStatusRow[]>([]);
  const [stats, setStats] = useState<ProductStatusStats>(EMPTY_STATS);
  const [pagination, setPagination] = useState<ProductStatusPagination>(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchProducts({ page: currentPage, limit: LIMIT, search: searchTerm || undefined });
      setProducts(result.products);
      setStats(result.stats);
      setPagination(result.pagination);
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err?.message || errorFallback);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProducts, currentPage, searchTerm, errorFallback]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const columns: ListColumnDef<ProductStatusRow>[] = [
    {
      key: 'primaryImage',
      header: '이미지',
      width: '70px',
      render: (_v, p) => p.primaryImage
        ? <img src={p.primaryImage} alt={p.marketingName} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
        : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Package className="w-5 h-5 text-slate-300" /></div>,
    },
    {
      key: 'marketingName',
      header: '상품명',
      render: (_v, p) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{p.marketingName}</p>
          {p.regulatoryName && p.regulatoryName !== p.marketingName && (
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">{p.regulatoryName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'barcode',
      header: '바코드',
      width: '130px',
      render: (_v, p) => <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">{p.barcode}</span>,
    },
    {
      key: 'brandName',
      header: '브랜드',
      width: '120px',
      render: (_v, p) => p.brandName ? <span className="text-sm text-slate-600">{p.brandName}</span> : <span className="text-slate-300">-</span>,
    },
    {
      key: 'categoryName',
      header: '카테고리',
      width: '120px',
      render: (_v, p) => p.categoryName ? <span className="text-sm text-slate-600">{p.categoryName}</span> : <span className="text-slate-300">-</span>,
    },
    {
      key: 'supplierCount',
      header: '공급자',
      width: '70px',
      align: 'right',
      render: (_v, p) => (
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${p.supplierCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
          {p.supplierCount}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '생성일',
      width: '100px',
      render: (_v, p) => <span className="text-sm text-slate-500">{formatDate(p.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${accent.iconBg} flex items-center justify-center`}>
              <Package className={`w-5 h-5 ${accent.iconText}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalProducts}</p>
              <p className="text-xs text-slate-500">전체 상품</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.withImage}</p>
              <p className="text-xs text-slate-500">이미지 있음</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.withSupplier}</p>
              <p className="text-xs text-slate-500">공급자 연결</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Copy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.duplicateBarcodes}</p>
              <p className="text-xs text-slate-500">중복 바코드</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 ${accent.focusRing} focus:border-transparent text-sm`}
              />
            </div>
            <button
              onClick={handleSearch}
              className={`px-4 py-2 ${accent.searchButton} text-white rounded-lg transition-colors text-sm font-medium`}
            >
              검색
            </button>
          </div>
        </div>

        {/* view-only — row action / selectable / ActionBar 없음 */}
        <DataTable<ProductStatusRow>
          columns={columns}
          data={products}
          rowKey="id"
          loading={isLoading}
          emptyMessage={emptyMessage}
          onRowClick={(p) => navigate(`${detailPathBase}/${p.id}`)}
          tableId={tableId}
        />
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <span className="text-sm text-slate-600">{currentPage} / {pagination.totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OperatorProductStatusPage;
