/**
 * RecruitingProductsOverviewPage — 운영자 판매자 모집 제품 Overview
 *
 * WO-NETURE-OPERATOR-PRODUCT-SUPPLY-OVERVIEW-V1
 * WO-NETURE-OPERATOR-PRODUCT-OVERVIEW-USABILITY-ENHANCEMENT-V1
 *
 * 판매자 모집 중인 상품을 운영자 관점에서 조회.
 * 페이징 + 상세 드릴다운 + 추천 표시.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Search, RefreshCw, Users, ChevronLeft, ChevronRight, X, Star } from 'lucide-react';

const PAGE_SIZE = 20;

interface RecruitingProduct {
  id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  status: string;
  is_featured: boolean;
  is_partner_recruiting: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  cgm_device: 'CGM 기기',
  test_strip: '시험지',
  lancet: '란셋',
  meter: '측정기',
  accessory: '액세서리',
  other: '기타',
};

export default function RecruitingProductsOverviewPage() {
  const [products, setProducts] = useState<RecruitingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detailProduct, setDetailProduct] = useState<RecruitingProduct | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const base = apiBase.replace(/\/api\/v1\/neture\/?$/, '');
      const res = await fetch(`${base}/api/v1/neture/partner/recruiting-products`);
      const json = await res.json();
      setProducts(Array.isArray(json.data) ? json.data : json || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(q) && !p.pharmacy_name?.toLowerCase().includes(q)) return false;
    }
    if (categoryFilter && p.category !== categoryFilter) return false;
    return true;
  }), [products, search, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">판매자 모집 제품</h1>
          <p className="text-sm text-slate-500 mt-1">현재 판매자 모집 중인 상품 현황</p>
        </div>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />새로고침
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-slate-500">모집 중 상품</p>
              <p className="text-xl font-bold text-slate-900">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Star className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-slate-500">추천 상품</p>
              <p className="text-xl font-bold text-slate-900">{products.filter(p => p.is_featured).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-slate-500">카테고리</p>
              <p className="text-xl font-bold text-slate-900">{categories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="상품명 / 약국명 검색"
            className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2"
        >
          <option value="">전체 카테고리</option>
          {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
        </select>
        <span className="text-sm text-slate-500">총 {filtered.length}건</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase border-b border-slate-200">
              <th className="px-4 py-3 font-medium">상품명</th>
              <th className="px-4 py-3 font-medium">약국/공급자</th>
              <th className="px-4 py-3 font-medium text-center">카테고리</th>
              <th className="px-4 py-3 font-medium text-right">가격</th>
              <th className="px-4 py-3 font-medium text-center">재고</th>
              <th className="px-4 py-3 font-medium text-center">상태</th>
              <th className="px-4 py-3 font-medium text-center">추천</th>
              <th className="px-4 py-3 font-medium">등록일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">불러오는 중...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                {search || categoryFilter ? '조건에 맞는 상품이 없습니다.' : '모집 중인 상품이 없습니다.'}
              </td></tr>
            ) : paged.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setDetailProduct(p)}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.sku}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.pharmacy_name || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    {CATEGORY_LABELS[p.category] || p.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.sale_price ? (
                    <div>
                      <span className="text-slate-400 line-through text-xs">₩{p.price.toLocaleString()}</span>
                      <span className="text-slate-800 font-medium ml-1">₩{p.sale_price.toLocaleString()}</span>
                    </div>
                  ) : (
                    <span className="text-slate-800 font-medium">₩{p.price.toLocaleString()}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{p.stock_quantity}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    p.is_partner_recruiting ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.is_partner_recruiting ? '모집중' : p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {p.is_featured ? <Star className="w-4 h-4 text-amber-500 mx-auto fill-amber-500" /> : <span className="text-slate-300">-</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(p.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailProduct(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">상품 상세</h2>
              <button onClick={() => setDetailProduct(null)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{detailProduct.name}</h3>
                  {detailProduct.is_featured && <Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
                </div>
                <p className="text-sm text-slate-500 mt-1">SKU: {detailProduct.sku}</p>
              </div>
              {detailProduct.is_partner_recruiting && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-emerald-800">판매자 모집중</p>
                  <p className="text-xs text-emerald-600 mt-0.5">이 상품은 현재 판매 파트너를 모집하고 있습니다</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">약국/공급자</p>
                  <p className="font-medium text-slate-800 mt-0.5">{detailProduct.pharmacy_name || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">카테고리</p>
                  <p className="font-medium text-slate-800 mt-0.5">{CATEGORY_LABELS[detailProduct.category] || detailProduct.category}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">정가</p>
                  <p className="font-medium text-slate-800 mt-0.5">₩{detailProduct.price.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">할인가</p>
                  <p className="font-medium text-slate-800 mt-0.5">{detailProduct.sale_price ? `₩${detailProduct.sale_price.toLocaleString()}` : '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">재고</p>
                  <p className="font-medium text-slate-800 mt-0.5">{detailProduct.stock_quantity}개</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">상태</p>
                  <p className="font-medium text-slate-800 mt-0.5">{detailProduct.status}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-slate-500">등록일</p>
                  <p className="font-medium text-slate-800 mt-0.5">{new Date(detailProduct.created_at).toLocaleString('ko-KR')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
