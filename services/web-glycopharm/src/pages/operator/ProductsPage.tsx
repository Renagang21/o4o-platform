/**
 * Operator Products Page — Product Master Console
 * WO-O4O-PRODUCT-MASTER-CONSOLE-V1
 *
 * /api/v1/operator/products API (Extension Layer)
 * product_masters 테이블 기반 플랫폼 상품 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Image,
  Truck,
  Copy,
} from 'lucide-react';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { api } from '../../lib/apiClient';
import PageHeader from '../../components/common/PageHeader';

// ─── Types ───────────────────────────────────────────────────

interface ProductData {
  id: string;
  barcode: string;
  marketingName: string;
  regulatoryName: string;
  manufacturerName: string;
  specification: string | null;
  brandName: string | null;
  categoryName: string | null;
  primaryImage: string | null;
  supplierCount: number;
  createdAt: string;
}

interface StatsData {
  totalProducts: number;
  withImage: number;
  withSupplier: number;
  duplicateBarcodes: number;
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

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [stats, setStats] = useState<StatsData>({ totalProducts: 0, withImage: 0, withSupplier: 0, duplicateBarcodes: 0 });
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchProducts = useCallback(async () => {
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
        products: ProductData[];
        stats: StatsData;
        pagination: PaginationData;
      }>(`/api/v1/operator/products?${params}`);

      if (data.success) {
        setProducts(data.products);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err?.message || '상품 데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="상품 관리"
        description="Product Master 기반 플랫폼 상품 카탈로그"
        actions={
          <button
            onClick={fetchProducts}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        }
      />

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
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
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
              <Image className="w-5 h-5 text-green-600" />
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
        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="상품명, 바코드, 브랜드, 제조사 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
            >
              검색
            </button>
          </div>
        </div>

        {/* Table */}
        {(() => {
          const columns: Column<ProductData>[] = [
            {
              key: 'primaryImage',
              title: '이미지',
              width: '70px',
              render: (_v, p) => p.primaryImage
                ? <img src={p.primaryImage} alt={p.marketingName} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Package className="w-5 h-5 text-slate-300" /></div>,
            },
            {
              key: 'marketingName',
              title: '상품명',
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
              title: '바코드',
              width: '130px',
              render: (_v, p) => <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">{p.barcode}</span>,
            },
            {
              key: 'brandName',
              title: '브랜드',
              width: '120px',
              render: (_v, p) => p.brandName ? <span className="text-sm text-slate-600">{p.brandName}</span> : <span className="text-slate-300">-</span>,
            },
            {
              key: 'categoryName',
              title: '카테고리',
              width: '120px',
              render: (_v, p) => p.categoryName ? <span className="text-sm text-slate-600">{p.categoryName}</span> : <span className="text-slate-300">-</span>,
            },
            {
              key: 'supplierCount',
              title: '공급자',
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
              title: '생성일',
              width: '100px',
              render: (_v, p) => <span className="text-sm text-slate-500">{formatDate(p.createdAt)}</span>,
            },
          ];

          return (
            <DataTable<ProductData>
              columns={columns}
              dataSource={products}
              rowKey="id"
              loading={isLoading}
              emptyText="상품 데이터가 없습니다"
              onRowClick={(p) => navigate(`/operator/products/${p.id}`)}
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
