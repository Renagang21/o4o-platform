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
  ChevronRight,
  ChevronLeft,
  Image,
  Truck,
  Copy,
} from 'lucide-react';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">상품 관리</h1>
          <p className="text-slate-500 text-sm mt-1">Product Master 기반 플랫폼 상품 카탈로그</p>
        </div>
        <button
          onClick={fetchProducts}
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

        {/* Loading */}
        {isLoading && products.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <p className="text-slate-500 text-sm">상품 데이터 로딩 중...</p>
            </div>
          </div>
        )}

        {/* Table */}
        {(!isLoading || products.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">이미지</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">상품명</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">바코드</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">브랜드</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">카테고리</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">공급자</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">생성일</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                      상품 데이터가 없습니다
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => navigate(`/operator/products/${product.id}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        {product.primaryImage ? (
                          <img
                            src={product.primaryImage}
                            alt={product.marketingName}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 text-sm">{product.marketingName}</p>
                        {product.regulatoryName && product.regulatoryName !== product.marketingName && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">{product.regulatoryName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                          {product.barcode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {product.brandName || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {product.categoryName || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                          product.supplierCount > 0
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {product.supplierCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(product.createdAt)}
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
                      ? 'bg-primary-500 text-white'
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
