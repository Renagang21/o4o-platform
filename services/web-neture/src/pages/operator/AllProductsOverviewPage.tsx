/**
 * AllProductsOverviewPage — 운영자 전체 공급 상품 Overview
 *
 * WO-NETURE-OPERATOR-PRODUCT-SUPPLY-OVERVIEW-V1
 * WO-NETURE-OPERATOR-PRODUCT-OVERVIEW-USABILITY-ENHANCEMENT-V1
 *
 * 전체 공급 가능 상품 풀을 운영자 관점에서 조회.
 * 클라이언트사이드 페이징 + 상세 패널 drill-down.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Search, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { operatorSupplyApi, type OperatorSupplyProduct } from '../../lib/api';

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  available: { label: '공급 가능', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: '요청됨', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '공급중', cls: 'bg-green-100 text-green-700' },
  rejected: { label: '거절됨', cls: 'bg-red-100 text-red-600' },
};

const DIST_LABELS: Record<string, string> = {
  PUBLIC: '전체 공개',
  SERVICE: '서비스',
  PRIVATE: '비공개',
};

export default function AllProductsOverviewPage() {
  const [products, setProducts] = useState<OperatorSupplyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detailProduct, setDetailProduct] = useState<OperatorSupplyProduct | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await operatorSupplyApi.getSupplyProducts();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = useMemo(() => products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(q) && !p.supplierName?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter && p.supplyStatus !== statusFilter) return false;
    return true;
  }), [products, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusCounts = useMemo(() => ({
    all: products.length,
    available: products.filter(p => p.supplyStatus === 'available').length,
    pending: products.filter(p => p.supplyStatus === 'pending').length,
    approved: products.filter(p => p.supplyStatus === 'approved').length,
    rejected: products.filter(p => p.supplyStatus === 'rejected').length,
  }), [products]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">공급 가능 상품</h1>
          <p className="text-sm text-slate-500 mt-1">현재 공개·활성 상태인 공급 가능 상품 현황</p>
        </div>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />새로고침
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { key: '', label: '전체', count: statusCounts.all, cls: 'text-slate-900' },
          { key: 'available', label: '공급 가능', count: statusCounts.available, cls: 'text-slate-600' },
          { key: 'pending', label: '요청됨', count: statusCounts.pending, cls: 'text-amber-700' },
          { key: 'approved', label: '공급중', count: statusCounts.approved, cls: 'text-green-700' },
          { key: 'rejected', label: '거절됨', count: statusCounts.rejected, cls: 'text-red-600' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`bg-white rounded-lg border p-3 text-left transition-colors ${statusFilter === s.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.cls}`}>{s.count}</p>
          </button>
        ))}
      </div>

      {/* Search + Count */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="상품명 / 공급자 검색"
            className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-sm text-slate-500">총 {filtered.length}건</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase border-b border-slate-200">
              <th className="px-4 py-3 font-medium w-12"></th>
              <th className="px-4 py-3 font-medium">상품명</th>
              <th className="px-4 py-3 font-medium">공급자</th>
              <th className="px-4 py-3 font-medium text-center">유통</th>
              <th className="px-4 py-3 font-medium text-right">공급가</th>
              <th className="px-4 py-3 font-medium text-right">소비자가</th>
              <th className="px-4 py-3 font-medium text-center">승인</th>
              <th className="px-4 py-3 font-medium text-center">공급 상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">불러오는 중...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                {search || statusFilter ? '조건에 맞는 상품이 없습니다.' : '현재 공개·활성 상태인 공급 가능 상품이 없습니다.'}
              </td></tr>
            ) : paged.map((p) => {
              const sc = STATUS_CONFIG[p.supplyStatus] || STATUS_CONFIG.available;
              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setDetailProduct(p)}>
                  <td className="px-4 py-3">
                    {p.primaryImageUrl ? (
                      <img src={p.primaryImageUrl} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.barcode || p.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.supplierName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {DIST_LABELS[p.distributionType || ''] || p.distributionType || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {p.priceGeneral ? `₩${p.priceGeneral.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {p.consumerReferencePrice ? `₩${p.consumerReferencePrice.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      p.approvalStatus === 'APPROVED' ? 'bg-green-50 text-green-700' :
                      p.approvalStatus === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {p.approvalStatus === 'APPROVED' ? '승인' : p.approvalStatus === 'PENDING' ? '대기' : p.approvalStatus || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sc.cls}`}>
                      {sc.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel (right slide) */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailProduct(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">상품 상세</h2>
              <button onClick={() => setDetailProduct(null)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Image */}
              {detailProduct.primaryImageUrl ? (
                <img src={detailProduct.primaryImageUrl} alt="" className="w-full h-48 rounded-lg object-cover bg-slate-100" />
              ) : (
                <div className="w-full h-48 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Package className="w-12 h-12 text-slate-300" />
                </div>
              )}
              {/* Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-900">{detailProduct.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{detailProduct.barcode || detailProduct.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">공급자</p>
                  <p className="font-medium text-slate-800 mt-0.5">{detailProduct.supplierName}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">유통 타입</p>
                  <p className="font-medium text-slate-800 mt-0.5">{DIST_LABELS[detailProduct.distributionType || ''] || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">공급가</p>
                  <p className="font-medium text-slate-800 mt-0.5">{detailProduct.priceGeneral ? `₩${detailProduct.priceGeneral.toLocaleString()}` : '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">소비자가</p>
                  <p className="font-medium text-slate-800 mt-0.5">{detailProduct.consumerReferencePrice ? `₩${detailProduct.consumerReferencePrice.toLocaleString()}` : '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">승인 상태</p>
                  <p className="font-medium text-slate-800 mt-0.5">{detailProduct.approvalStatus || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">공급 상태</p>
                  <p className="font-medium text-slate-800 mt-0.5">{STATUS_CONFIG[detailProduct.supplyStatus]?.label || detailProduct.supplyStatus}</p>
                </div>
              </div>
              {detailProduct.specification && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">규격</p>
                  <p className="text-sm text-slate-800 mt-0.5">{detailProduct.specification}</p>
                </div>
              )}
              {detailProduct.category && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">카테고리</p>
                  <p className="text-sm text-slate-800 mt-0.5">{detailProduct.category}</p>
                </div>
              )}
              {detailProduct.rejectReason && (
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-xs text-red-600">거절 사유</p>
                  <p className="text-sm text-red-800 mt-0.5">{detailProduct.rejectReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
